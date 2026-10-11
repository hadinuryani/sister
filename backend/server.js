const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { processPayment, checkPaymentServiceHealth } = require('./rpc_client');
const { reserveStock, checkInventoryServiceHealth, getInventoryReport } = require('./rmi_client');
const { backendLamportClock, mutexCoordinator } = require('./sync_coordinator');

// REST API server untuk backend aplikasi pemesanan makanan
// Menghubungkan frontend ke database serta service RMI (Inventory) dan RPC (Payment)
// Dilengkapi modul Sinkronisasi (Cristian, Lamport, Centralized Mutex)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Logger middleware — tampilkan setiap request di terminal
app.use((req, res, next) => {
  console.log(`[${formatLogTime()}] [HTTP] ${req.method} ${req.path}`);
  next();
});

// ENDPOINT 1: GET /api/menu — Ambil daftar menu
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price, image_url, category, stock FROM menus WHERE stock > 0 ORDER BY category, id'
    );
    console.log(`[${formatLogTime()}] [MENU] Returned ${rows.length} items`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`[${formatLogTime()}] [MENU] Error:`, error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data menu' });
  }
});

// ENDPOINT 2: POST /api/orders — Buat order baru
// Flow: Mutex Lock → Validasi → RMI Reservasi Stok → Simpan Order → RPC Payment → Update Status → Mutex Release
app.post('/api/orders', async (req, res) => {
  const { customerName, items, clientLamportClock } = req.body;

  // Validasi input
  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Data tidak lengkap. Diperlukan: customerName dan items[]',
    });
  }

  // 1. Lamport Clock Rule 3: Sinkronisasi jam logika saat request diterima dari Frontend
  const incomingClock = Number(clientLamportClock) || 0;
  backendLamportClock.receiveEvent(incomingClock, `Order masuk dari Frontend untuk "${customerName}"`);

  // 2. Centralized Mutual Exclusion: Dapatkan lock sebelum mengakses & memodifikasi stok bersama
  const processLockId = `Order-${customerName}-${Date.now()}`;
  await mutexCoordinator.acquire(processLockId, `(Reservasi ${items.length} item)`);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Ambil harga menu dari database dan hitung total
    const menuIds = items.map((item) => item.menuId);
    const [menus] = await conn.query('SELECT id, name, price, stock FROM menus WHERE id IN (?)', [menuIds]);

    const menuMap = {};
    menus.forEach((m) => (menuMap[m.id] = m));

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menu = menuMap[item.menuId];
      if (!menu) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Menu ID ${item.menuId} tidak ditemukan` });
      }
      if (menu.stock < item.quantity) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Stok "${menu.name}" tidak cukup` });
      }

      const subtotal = Number(menu.price) * item.quantity;
      totalAmount += subtotal;
      orderItems.push({ menuId: item.menuId, quantity: item.quantity, subtotal });
    }

    // Simpan order dengan status PENDING dan catatan Lamport Clock saat ini
    const initialClock = backendLamportClock.tick(`Membuat draft order di database`);
    const [orderResult] = await conn.query(
      'INSERT INTO orders (customer_name, total_amount, status, lamport_clock) VALUES (?, ?, ?, ?)',
      [customerName, totalAmount, 'PENDING', initialClock]
    );
    const orderId = orderResult.insertId;
    console.log(`[${formatLogTime()}] [ORDER] Created order #${orderId} (PENDING) - Rp ${totalAmount.toLocaleString('id-ID')} [Lamport: ${initialClock}]`);

    // Simpan item-item order
    for (const item of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, menu_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
        [orderId, item.menuId, item.quantity, item.subtotal]
      );
    }

    // Kurangi stok menu
    for (const item of items) {
      await conn.query('UPDATE menus SET stock = stock - ? WHERE id = ?', [item.quantity, item.menuId]);
    }

    await conn.commit();

    // 3. Panggil RMI Inventory Service (port 5000) untuk reservasi stok
    let rmiResult = null;
    const rmiSendClock = backendLamportClock.sendEvent(`Mengirim reservasi stok ke RMI Inventory`);
    console.log(`[${formatLogTime()}] [ORDER] Invoking RMI InventoryManager.reserveStock() for order #${orderId}... [Lamport: ${rmiSendClock}]`);
    try {
      rmiResult = await reserveStock(orderId, items, customerName, rmiSendClock);
      if (rmiResult?.lamportClock) {
        backendLamportClock.receiveEvent(rmiResult.lamportClock, `Respon diterima dari RMI (ref: ${rmiResult.reservationId})`);
      }
      console.log(`[${formatLogTime()}] [ORDER] RMI stock reserved: ${rmiResult.reservationId}`);

      // Update order dengan reservation reference
      await pool.query('UPDATE orders SET reservation_ref = ? WHERE id = ?', [
        rmiResult.reservationId,
        orderId,
      ]);
    } catch (rmiError) {
      console.warn(`[${formatLogTime()}] [ORDER] RMI reservation warning: ${rmiError.message} (order tetap diproses)`);
    }

    // 4. Panggil RPC Payment Service (port 4000) untuk proses pembayaran
    const rpcSendClock = backendLamportClock.sendEvent(`Mengirim otorisasi pembayaran ke RPC Payment`);
    console.log(`[${formatLogTime()}] [ORDER] Invoking RPC processPayment() for order #${orderId}... [Lamport: ${rpcSendClock}]`);
    try {
      const paymentResult = await processPayment(orderId, totalAmount, customerName, rpcSendClock);
      if (paymentResult?.lamportClock) {
        backendLamportClock.receiveEvent(paymentResult.lamportClock, `Respon diterima dari RPC (ref: ${paymentResult.paymentRef})`);
      }

      // Update status order menjadi PAID beserta final Lamport Clock
      const finalClock = backendLamportClock.tick(`Order #${orderId} disahkan menjadi PAID`);
      await pool.query('UPDATE orders SET status = ?, payment_ref = ?, lamport_clock = ? WHERE id = ?', [
        'PAID',
        paymentResult.paymentRef,
        finalClock,
        orderId,
      ]);
      console.log(`[${formatLogTime()}] [ORDER] Order #${orderId} status updated to PAID (ref: ${paymentResult.paymentRef}) [Lamport: ${finalClock}]`);

      res.status(201).json({
        success: true,
        message: 'Order berhasil dibuat, stok direservasi (RMI), dan pembayaran diproses (RPC)',
        data: {
          orderId,
          customerName,
          totalAmount,
          status: 'PAID',
          paymentRef: paymentResult.paymentRef,
          reservationId: rmiResult?.reservationId || null,
          lamportClock: finalClock,
          items: orderItems,
        },
      });
    } catch (rpcError) {
      // Pembayaran gagal → update status ke FAILED
      const failedClock = backendLamportClock.tick(`Order #${orderId} ditolak (FAILED)`);
      await pool.query('UPDATE orders SET status = ?, lamport_clock = ? WHERE id = ?', ['FAILED', failedClock, orderId]);
      console.warn(`[${formatLogTime()}] [ORDER] Order #${orderId} payment failed -> FAILED (${rpcError.message})`);

      res.status(402).json({
        success: false,
        message: `Pembayaran gagal: ${rpcError.message}`,
        data: { orderId, status: 'FAILED', lamportClock: failedClock },
      });
    }
  } catch (error) {
    await conn.rollback();
    console.error(`[${formatLogTime()}] [ORDER] Error:`, error.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal' });
  } finally {
    conn.release();
    // Centralized Mutual Exclusion: Selalu lepaskan lock setelah critical section selesai
    mutexCoordinator.release(processLockId);
  }
});

// ENDPOINT 3: GET /api/orders/:id — Cek status order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT id, customer_name, total_amount, status, payment_ref, reservation_ref, lamport_clock, created_at, updated_at FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    const order = orders[0];

    // Ambil detail item pesanan
    const [items] = await pool.query(
      `SELECT oi.quantity, oi.subtotal, m.name, m.price
       FROM order_items oi
       JOIN menus m ON oi.menu_id = m.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    console.log(`[${formatLogTime()}] [ORDER] Order #${order.id} status: ${order.status} [Lamport: ${order.lamport_clock || 1}]`);
    res.json({ success: true, data: { ...order, items } });
  } catch (error) {
    console.error(`[${formatLogTime()}] [ORDER] Error:`, error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data order' });
  }
});

// ENDPOINT 4: GET /api/orders — List semua order
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, customer_name, total_amount, status, payment_ref, reservation_ref, lamport_clock, created_at, updated_at FROM orders ORDER BY created_at DESC'
    );
    console.log(`[${formatLogTime()}] [ORDER] Returned ${rows.length} orders`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`[${formatLogTime()}] [ORDER] Error:`, error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data orders' });
  }
});

// ENDPOINT 5: GET /api/health — Status semua service
app.get('/api/health', async (req, res) => {
  let rpcStatus = { status: 'down' };
  try {
    rpcStatus = await checkPaymentServiceHealth();
  } catch (e) {
    rpcStatus = { status: 'down', error: e.message };
  }

  let rmiStatus = { status: 'down' };
  try {
    rmiStatus = await checkInventoryServiceHealth();
  } catch (e) {
    rmiStatus = { status: 'down', error: e.message };
  }

  res.json({
    api: { status: 'healthy', port: PORT, lamportClock: backendLamportClock.getTime() },
    rpcPayment: rpcStatus,
    rmiInventory: rmiStatus,
    database: { status: 'healthy', type: 'MySQL' },
    timestamp: new Date().toISOString(),
  });
});

// ENDPOINT 6: GET /api/inventory-report — Ambil laporan dari RMI remote object
app.get('/api/inventory-report', async (req, res) => {
  try {
    console.log(`[${formatLogTime()}] [INVENTORY] Invoking RMI InventoryManager.getInventoryReport()...`);
    const report = await getInventoryReport();
    res.json({ success: true, data: report });
  } catch (error) {
    console.error(`[${formatLogTime()}] [INVENTORY] Error:`, error.message);
    res.status(503).json({ success: false, message: 'RMI Inventory Service tidak tersedia' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT SINKRONISASI (Pertemuan 07: Sinkronisasi)
// ═══════════════════════════════════════════════════════════════════

// 1. Physical Clock Synchronization — Algoritma Cristian (Slide 22-25)
// Client mengirim T1 (waktu kirim lokal). Server mencatat T2 (waktu terima) dan T3 (waktu kirim respon).
// Client mencatat T4 (waktu terima). Offset theta = ((T2 - T1) + (T3 - T4)) / 2, RTT = (T4 - T1) - (T3 - T2).
app.post('/api/sync/cristian', (req, res) => {
  const t2 = Date.now();
  const { t1 } = req.body;
  const t3 = Date.now();

  console.log(`[${formatLogTime()}] [SYNC-CRISTIAN] Sync request: T1=${t1}, T2=${t2}, T3=${t3}`);

  res.json({
    success: true,
    algorithm: "Cristian's Algorithm",
    t1: Number(t1) || t2,
    t2,
    t3,
    serverTime: t3,
    serverIso: new Date(t3).toISOString(),
  });
});

// 2. Logical Clock Synchronization — Lamport's Clock (Slide 44-52)
// Menampilkan status jam logika Lamport saat ini dan riwayat relasi happened-before
app.get('/api/sync/lamport', (req, res) => {
  res.json({
    success: true,
    algorithm: "Lamport's Logical Clock",
    currentClock: backendLamportClock.getTime(),
    history: backendLamportClock.getHistory(),
  });
});

// Trigger internal event untuk simulasi kenaikan jam logika lokal (Aturan 1)
app.post('/api/sync/lamport/tick', (req, res) => {
  const newClock = backendLamportClock.tick('Kejadian internal lokal dipicu dari dashboard');
  console.log(`[${formatLogTime()}] [SYNC-LAMPORT] Manual tick executed -> Lamport Clock: ${newClock}`);
  res.json({
    success: true,
    currentClock: newClock,
    history: backendLamportClock.getHistory(),
  });
});

// 3. Distributed Mutual Exclusion — Centralized Coordinator (Slide 67-72)
// Menampilkan status lock, pemegang aktif, dan antrean (queue) request
app.get('/api/sync/mutex', (req, res) => {
  res.json({
    success: true,
    algorithm: "Centralized Mutual Exclusion (Coordinator with FIFO Queue)",
    data: mutexCoordinator.getState(),
  });
});

// Simulasi eksekusi konkurensi (3 proses P1, P2, P3 berebut stok bersamaan)
app.post('/api/sync/mutex/simulate', async (req, res) => {
  try {
    console.log(`[${formatLogTime()}] [SYNC-MUTEX] Memulai simulasi konkurensi 3 proses...`);
    const logs = await mutexCoordinator.simulateConcurrency();
    res.json({
      success: true,
      logs,
      state: mutexCoordinator.getState(),
    });
  } catch (err) {
    console.error(`[${formatLogTime()}] [SYNC-MUTEX] Error simulasi:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[${formatLogTime()}] [BACKEND] Server berjalan di http://localhost:${PORT}`);
  console.log(`[${formatLogTime()}] [BACKEND] Terhubung ke RPC Payment (port 4000) dan RMI Inventory (port 5000)`);
  console.log(`[${formatLogTime()}] [BACKEND] Modul Sinkronisasi Aktif: Cristian (Jam Fisik), Lamport (Jam Logika), Mutex (Lock Stok)`);
});
