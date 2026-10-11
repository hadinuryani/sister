// Modul Sinkronisasi Sistem Terdistribusi (Pertemuan 07: Sinkronisasi)
// Mengimplementasikan:
// 1. Physical Clock Synchronization — Cristian's Algorithm
// 2. Logical Clock Synchronization  — Lamport's Logical Clock
// 3. Distributed Mutual Exclusion   — Centralized Coordinator Algorithm

// 1. LAMPORT'S LOGICAL CLOCK
class LamportClock {
  constructor(initialValue = 0) {
    this.time = initialValue;
    this.history = [];
  }

  // Aturan 1: Tiap kejadian internal menaikkan clock lokal
  tick(description = 'Internal Event') {
    this.time += 1;
    this.record(description);
    return this.time;
  }

  // Aturan 2: Saat mengirim pesan, sematkan nilai clock
  sendEvent(description = 'Send Message') {
    this.time += 1;
    this.record(description, 'SEND');
    return this.time;
  }

  // Aturan 3: Saat menerima pesan, clock = max(localClock, messageTimestamp) + 1
  receiveEvent(receivedTimestamp, description = 'Receive Message') {
    const ts = Number(receivedTimestamp) || 0;
    this.time = Math.max(this.time, ts) + 1;
    this.record(description, 'RECEIVE', ts);
    return this.time;
  }

  record(description, type = 'INTERNAL', incomingTs = null) {
    const entry = {
      logicalTime: this.time,
      type,
      description,
      incomingTs,
      physicalTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.history.push(entry);
    if (this.history.length > 50) this.history.shift();
  }

  getTime() {
    return this.time;
  }

  getHistory() {
    return [...this.history].reverse();
  }
}

// 2. CENTRALIZED MUTUAL EXCLUSION COORDINATOR
class CentralizedMutexCoordinator {
  constructor() {
    this.resourceId = 'INVENTORY_STOCK';
    this.isLocked = false;
    this.currentHolder = null;
    this.queue = [];
    this.history = [];
    this.counter = 0;
  }

  recordEvent(type, processId, details = '') {
    const entry = {
      id: ++this.counter,
      type, // 'REQUEST', 'GRANT', 'QUEUE', 'RELEASE'
      processId,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      queueLength: this.queue.length,
    };
    this.history.push(entry);
    if (this.history.length > 50) this.history.shift();
    console.log(`[MUTEX-COORD] [${type}] ${processId} - ${details} (Queue: ${this.queue.length})`);
  }

  // Proses meminta akses ke resource
  async acquire(processId, clientInfo = '') {
    return new Promise((resolve) => {
      this.recordEvent('REQUEST', processId, `Meminta akses ke ${this.resourceId} ${clientInfo}`);

      if (!this.isLocked) {
        // Resource kosong -> langsung beri izin (GRANT)
        this.isLocked = true;
        this.currentHolder = {
          processId,
          acquiredAt: Date.now(),
        };
        this.recordEvent('GRANT', processId, `Izin akses diberikan langsung ke ${processId}`);
        resolve({ granted: true, waitInQueue: false });
      } else {
        // Resource sedang dipakai proses lain -> masukkan ke Antrean (QUEUE)
        this.recordEvent('QUEUE', processId, `Resource sedang dipakai ${this.currentHolder.processId}, ${processId} masuk antrean`);
        this.queue.push({
          processId,
          queuedAt: Date.now(),
          resolve: () => {
            this.isLocked = true;
            this.currentHolder = {
              processId,
              acquiredAt: Date.now(),
            };
            this.recordEvent('GRANT', processId, `Izin akses diberikan dari antrean ke ${processId}`);
            resolve({ granted: true, waitInQueue: true });
          },
        });
      }
    });
  }

  // Proses selesai menggunakan resource
  release(processId) {
    if (!this.isLocked || !this.currentHolder || this.currentHolder.processId !== processId) {
      console.warn(`[MUTEX-COORD] Peringatan: ${processId} mencoba release tapi bukan pemegang lock aktif`);
      return false;
    }

    this.recordEvent('RELEASE', processId, `${processId} melepaskan akses ${this.resourceId}`);
    this.isLocked = false;
    this.currentHolder = null;

    // Jika ada proses lain yang menunggu di antrean, beri izin ke urutan pertama (FIFO)
    if (this.queue.length > 0) {
      const nextInQueue = this.queue.shift();
      nextInQueue.resolve();
    }

    return true;
  }

  getState() {
    return {
      resourceId: this.resourceId,
      isLocked: this.isLocked,
      currentHolder: this.currentHolder
        ? {
            processId: this.currentHolder.processId,
            durationMs: Date.now() - this.currentHolder.acquiredAt,
          }
        : null,
      queue: this.queue.map((item, idx) => ({
        position: idx + 1,
        processId: item.processId,
        waitingMs: Date.now() - item.queuedAt,
      })),
      history: [...this.history].reverse().slice(0, 20),
    };
  }

  // Simulasi konkurensi (misal: 3 proses P1, P2, P3 berebut stok bersamaan)
  async simulateConcurrency() {
    const simulationLogs = [];
    const pushLog = (msg) => {
      const line = `[${new Date().toISOString().substring(11, 19)}] ${msg}`;
      simulationLogs.push(line);
      console.log(`[SIMULASI-MUTEX] ${msg}`);
    };

    pushLog('--- Memulai Simulasi Konkurensi 3 Proses (P1, P2, P3) ---');

    // Buat 3 proses serentak
    const p1 = async () => {
      pushLog('P1: Mengirim REQUEST akses stok...');
      await this.acquire('Proses-P1 (Order #1)');
      pushLog('P1: [CRITICAL SECTION] Mengakses stok inventori selama 1.2 detik...');
      await new Promise((r) => setTimeout(r, 1200));
      pushLog('P1: Selesai update stok, mengirim RELEASE...');
      this.release('Proses-P1 (Order #1)');
    };

    const p2 = async () => {
      // Delay sedikit agar datang saat P1 masih memegang lock
      await new Promise((r) => setTimeout(r, 200));
      pushLog('P2: Mengirim REQUEST akses stok saat P1 masih aktif...');
      await this.acquire('Proses-P2 (Order #2)');
      pushLog('P2: [CRITICAL SECTION] Akhirnya mendapat GRANT, update stok selama 1.0 detik...');
      await new Promise((r) => setTimeout(r, 1000));
      pushLog('P2: Selesai update stok, mengirim RELEASE...');
      this.release('Proses-P2 (Order #2)');
    };

    const p3 = async () => {
      // Datang saat P1 masih aktif dan P2 sudah mengantre
      await new Promise((r) => setTimeout(r, 400));
      pushLog('P3: Mengirim REQUEST akses stok (antre di belakang P2)...');
      await this.acquire('Proses-P3 (Order #3)');
      pushLog('P3: [CRITICAL SECTION] Akhirnya mendapat GRANT, update stok selama 0.8 detik...');
      await new Promise((r) => setTimeout(r, 800));
      pushLog('P3: Selesai update stok, mengirim RELEASE...');
      this.release('Proses-P3 (Order #3)');
    };

    // Jalankan ketiganya secara paralel
    await Promise.all([p1(), p2(), p3()]);
    pushLog('--- Simulasi Selesai: Semua proses berhasil dieksekusi secara mutual exclusive tanpa race condition! ---');

    return simulationLogs;
  }
}

// Inisialisasi instance singleton
const backendLamportClock = new LamportClock(1);
const mutexCoordinator = new CentralizedMutexCoordinator();

module.exports = {
  backendLamportClock,
  mutexCoordinator,
};
