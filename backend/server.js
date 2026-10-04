const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { processPayment, checkPaymentServiceHealth } = require('./rpc_client');
const { reserveStock, checkInventoryServiceHealth, getInventoryReport } = require('./rmi_client');


// REST API server untuk backend aplikasi pemesanan makanan
// Menghubungkan frontend ke database serta service RMI (Inventory) dan RPC (Payment)

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
// Flow: Validasi → RMI Reservasi Stok → Simpan Order → RPC Payment → Update Status
app.post('/api/orders', async (req, res) => {
  const { customerName, items } = req.body;

  // Validasi input
  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Data tidak lengkap. Diperlukan: customerName dan items[]',
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Ambil harga menu dari database dan hitung total
    const menuIds = items.map((item) => item.menuId);
    const [menus] = await conn.query('SELECT id, name, price, stock FROM menus WHERE id IN (?)', [menuIds]);

    // Buat lookup map
    const menuMap = {};
    menus.forEach((m) => (menuMap[m.id] = m));

    // Validasi semua menu ditemukan dan stok cukup
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

    // 2. Simpan order dengan status PENDING
    const [orderResult] = await conn.query(
      'INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)',
      [customerName, totalAmount, 'PENDING']
    );
    const orderId = orderResult.insertId;
    console.log(`[${formatLogTime()}] [ORDER] Created order #${orderId} (PENDING) - Rp ${totalAmount.toLocaleString('id-ID')}`);

    // 3. Simpan item-item order
    for (const item of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, menu_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
        [orderId, item.menuId, item.quantity, item.subtotal]
      );
    }

    // 4. Kurangi stok menu
    for (const item of items) {
      await conn.query('UPDATE menus SET stock = stock - ? WHERE id = ?', [item.quantity, item.menuId]);
    }

    await conn.commit();

    // 5. Panggil RMI Inventory Service (port 5000) untuk reservasi stok — INI BAGIAN RMI!
    let rmiResult = null;
    console.log(`[${formatLogTime()}] [ORDER] Invoking RMI InventoryManager.reserveStock() for order #${orderId}...`);
    try {
      rmiResult = await reserveStock(orderId, items, customerName);
      console.log(`[${formatLogTime()}] [ORDER] RMI stock reserved: ${rmiResult.reservationId}`);

      // Update order dengan reservation reference
      await pool.query('UPDATE orders SET reservation_ref = ? WHERE id = ?', [
        rmiResult.reservationId,
        orderId,
      ]);
    } catch (rmiError) {
      console.warn(`[${formatLogTime()}] [ORDER] RMI reservation warning: ${rmiError.message} (order tetap diproses)`);
      // Order tetap dilanjutkan meski RMI gagal (graceful degradation)
    }

    // 6. Panggil RPC Payment Service (di port 4000) — INI BAGIAN RPC!
    console.log(`[${formatLogTime()}] [ORDER] Invoking RPC processPayment() for order #${orderId}...`);
    try {
      const paymentResult = await processPayment(orderId, totalAmount, customerName);

      // 7. Update status order menjadi PAID
      await pool.query('UPDATE orders SET status = ?, payment_ref = ? WHERE id = ?', [
        'PAID',
        paymentResult.paymentRef,
        orderId,
      ]);
      console.log(`[${formatLogTime()}] [ORDER] Order #${orderId} status updated to PAID (ref: ${paymentResult.paymentRef})`);

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
          items: orderItems,
        },
      });
    } catch (rpcError) {
      // Pembayaran gagal → update status ke FAILED
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['FAILED', orderId]);
      console.warn(`[${formatLogTime()}] [ORDER] Order #${orderId} payment failed -> FAILED (${rpcError.message})`);

      res.status(402).json({
        success: false,
        message: `Pembayaran gagal: ${rpcError.message}`,
        data: { orderId, status: 'FAILED' },
      });
    }
  } catch (error) {
    await conn.rollback();
    console.error(`[${formatLogTime()}] [ORDER] Error:`, error.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal' });
  } finally {
    conn.release();
  }
});

// ENDPOINT 3: GET /api/orders/:id — Cek status order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT id, customer_name, total_amount, status, payment_ref, reservation_ref, created_at, updated_at FROM orders WHERE id = ?',
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

    console.log(`[${formatLogTime()}] [ORDER] Order #${order.id} status: ${order.status}`);
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
      'SELECT id, customer_name, total_amount, status, payment_ref, reservation_ref, created_at, updated_at FROM orders ORDER BY created_at DESC'
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
    api: { status: 'healthy', port: PORT },
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

// Start Server
app.listen(PORT, () => {
  console.log(`[${formatLogTime()}] [BACKEND] Server berjalan di http://localhost:${PORT}`);
  console.log(`[${formatLogTime()}] [BACKEND] Terhubung ke RPC Payment (port 4000) dan RMI Inventory (port 5000)`);
});
