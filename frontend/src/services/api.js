const API_BASE = '/api';

// Jam logika lokal client (Lamport Clock)
let clientLamportClock = 1;

export function getClientLamportClock() {
  return clientLamportClock;
}

export function incrementClientLamportClock() {
  clientLamportClock += 1;
  return clientLamportClock;
}

export async function fetchMenus() {
  const response = await fetch(`${API_BASE}/menu`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat menu');
  }
  return data.data;
}

export async function createOrder(payload) {
  // Setiap pengiriman pesan/event ke server menaikkan Lamport Clock lokal
  clientLamportClock += 1;

  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      clientLamportClock,
    }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Gagal membuat pesanan');
  }

  // Jika server mengembalikan nilai lamport_clock, sesuaikan jam client jika lebih besar
  if (data.data?.lamport_clock && data.data.lamport_clock >= clientLamportClock) {
    clientLamportClock = data.data.lamport_clock + 1;
  }

  return data;
}

export async function fetchOrders() {
  const response = await fetch(`${API_BASE}/orders`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat daftar pesanan');
  }
  return data.data;
}

export async function fetchOrderById(id) {
  const response = await fetch(`${API_BASE}/orders/${id}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Pesanan tidak ditemukan');
  }
  return data.data;
}

// 1. Sinkronisasi Jam Fisik — Algoritma Cristian (Slide 22-25)
export async function syncCristian() {
  const t1 = Date.now();
  const response = await fetch(`${API_BASE}/sync/cristian`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ t1 }),
  });
  const t4 = Date.now();
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal sinkronisasi waktu');
  }

  const { t2, t3 } = data;
  // RTT = (T4 - T1) - (T3 - T2)
  const rtt = Math.max(0, (t4 - t1) - (t3 - t2));
  // Offset theta = ((T2 - T1) + (T3 - T4)) / 2
  const offset = ((t2 - t1) + (t3 - t4)) / 2;
  // Waktu tersinkronisasi: T3 + (RTT / 2)
  const syncTime = t3 + Math.round(rtt / 2);

  return {
    t1,
    t2,
    t3,
    t4,
    rtt,
    offset,
    syncTime,
    clientLocalTime: t4,
    diffWithLocal: syncTime - t4,
  };
}

// 2. Sinkronisasi Jam Logika — Lamport Logical Clock (Slide 44-52)
export async function fetchLamportStatus() {
  const response = await fetch(`${API_BASE}/sync/lamport`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat status Lamport Clock');
  }
  return data;
}

export async function triggerLamportTick() {
  const response = await fetch(`${API_BASE}/sync/lamport/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal mentrigger tick Lamport Clock');
  }
  return data;
}

// 3. Distributed Mutual Exclusion — Centralized Coordinator (Slide 67-72)
export async function fetchMutexState() {
  const response = await fetch(`${API_BASE}/sync/mutex`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat status Mutex');
  }
  return data.data;
}

export async function simulateMutexConcurrency() {
  const response = await fetch(`${API_BASE}/sync/mutex/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal menjalankan simulasi Mutex');
  }
  return data;
}
