const API_BASE = '/api';

export async function fetchMenus() {
  const response = await fetch(`${API_BASE}/menu`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat menu');
  }
  return data.data;
}

export async function createOrder(payload) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Gagal membuat pesanan');
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
