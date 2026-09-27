const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// RPA Worker Bot — Robotic Process Automation
//
// Konsep Sistem Terdistribusi:
//   Bot ini berjalan sebagai DAEMON independen (proses terpisah).
//   Tanpa intervensi manusia, bot secara otomatis:
//   1. Memantau database untuk order berstatus PAID
//   2. Men-generate invoice/struk digital
//   3. Mencatat rekap penjualan harian ke CSV
//   4. Meng-update status order → COMPLETED
//
//   Ini memenuhi definisi RPA: software robot yang mengeksekusi
//   tugas repetitif secara otomatis tanpa campur tangan manusia.

const POLLING_INTERVAL = 5000; // Polling setiap 5 detik
const INVOICE_DIR = path.join(__dirname, 'output_invoices');
const REKAP_FILE = path.join(__dirname, 'rekap_harian.csv');

// Buat folder output_invoices jika belum ada
if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

// Buat file rekap CSV dengan header jika belum ada
if (!fs.existsSync(REKAP_FILE)) {
  fs.writeFileSync(REKAP_FILE, 'No,Order ID,Customer,Total,Payment Ref,Processed At\n', 'utf-8');
}

// Koneksi MySQL (sama dengan yang digunakan backend)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'food_ordering',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

let rekapCounter = 0;

// Hitung nomor rekap dari file yang sudah ada
try {
  const existingCsv = fs.readFileSync(REKAP_FILE, 'utf-8');
  const lines = existingCsv.trim().split('\n');
  rekapCounter = Math.max(0, lines.length - 1); // Kurangi header
} catch (e) {
  rekapCounter = 0;
}

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Generate invoice/struk digital dalam format .txt
 */
function generateInvoice(order, items) {
  const invoiceDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const separator = '='.repeat(44);
  const thinLine = '-'.repeat(44);

  let invoice = '';
  invoice += `${separator}\n`;
  invoice += `              FOOD ORDERING SYSTEM\n`;
  invoice += `                STRUK PEMBAYARAN\n`;
  invoice += `${separator}\n`;
  invoice += `\n`;
  invoice += `  No. Order    : #${String(order.id).padStart(4, '0')}\n`;
  invoice += `  Pelanggan    : ${order.customer_name}\n`;
  invoice += `  Tanggal      : ${invoiceDate}\n`;
  invoice += `  Ref Bayar    : ${order.payment_ref || '-'}\n`;
  invoice += `\n`;
  invoice += `${thinLine}\n`;
  invoice += `  PESANAN:\n`;
  invoice += `${thinLine}\n`;

  items.forEach((item, index) => {
    const itemTotal = `Rp ${Number(item.subtotal).toLocaleString('id-ID')}`;
    invoice += `  ${index + 1}. ${item.name}\n`;
    invoice += `     ${item.quantity}x @ Rp ${Number(item.price).toLocaleString('id-ID')}`;
    invoice += `${' '.repeat(Math.max(1, 24 - itemTotal.length))}${itemTotal}\n`;
  });

  invoice += `\n`;
  invoice += `${thinLine}\n`;
  invoice += `  TOTAL : Rp ${Number(order.total_amount).toLocaleString('id-ID')}\n`;
  invoice += `  STATUS: LUNAS\n`;
  invoice += `${separator}\n`;
  invoice += `\n`;
  invoice += `  Terima kasih telah memesan!\n`;
  invoice += `  Pesanan Anda sedang diproses.\n`;
  invoice += `${separator}\n`;

  const filename = `invoice_order_${String(order.id).padStart(4, '0')}_${Date.now()}.txt`;
  const filepath = path.join(INVOICE_DIR, filename);
  fs.writeFileSync(filepath, invoice, 'utf-8');

  return { filename, filepath };
}

/**
 * Tambahkan entry ke rekap penjualan harian CSV
 */
function appendToRekap(order) {
  rekapCounter++;
  const processedAt = new Date().toLocaleString('id-ID');
  const line = `${rekapCounter},${order.id},${order.customer_name},${order.total_amount},${order.payment_ref || '-'},${processedAt}\n`;
  fs.appendFileSync(REKAP_FILE, line, 'utf-8');
  return rekapCounter;
}

/**
 * Proses utama RPA:
 * Polling database → Cari order PAID → Generate invoice → Update status
 */
async function processOrders() {
  try {
    // 1. Cari semua order dengan status PAID
    const [paidOrders] = await pool.query(
      'SELECT id, customer_name, total_amount, status, payment_ref, created_at FROM orders WHERE status = ?',
      ['PAID']
    );

    if (paidOrders.length === 0) {
      return; // Tidak ada order baru
    }

    console.log(`[${formatLogTime()}] [RPA-WORKER] Found ${paidOrders.length} order(s) with status PAID`);

    for (const order of paidOrders) {
      console.log(`[${formatLogTime()}] [RPA-WORKER] Processing order #${order.id} (${order.customer_name})`);

      // 2. Ambil detail item pesanan
      const [items] = await pool.query(
        `SELECT oi.quantity, oi.subtotal, m.name, m.price
         FROM order_items oi
         JOIN menus m ON oi.menu_id = m.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      // 3. Generate invoice otomatis
      const invoice = generateInvoice(order, items);
      console.log(`[${formatLogTime()}] [RPA-WORKER] Invoice generated: ${invoice.filename}`);

      // 4. Catat ke rekap harian
      const rekapNo = appendToRekap(order);
      console.log(`[${formatLogTime()}] [RPA-WORKER] Appended to rekap_harian.csv (row #${rekapNo})`);

      // 5. Update status order → COMPLETED
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['COMPLETED', order.id]);
      console.log(`[${formatLogTime()}] [RPA-WORKER] Order #${order.id} status updated to COMPLETED`);
    }
  } catch (error) {
    console.error(`[${formatLogTime()}] [RPA-WORKER] Error:`, error.message);
  }
}

// Start RPA Bot (Daemon Mode)
console.log(`[${formatLogTime()}] [RPA-WORKER] Daemon started`);
console.log(`[${formatLogTime()}] [RPA-WORKER] Polling interval: ${POLLING_INTERVAL / 1000}s`);
console.log(`[${formatLogTime()}] [RPA-WORKER] Invoice directory: ${INVOICE_DIR}`);
console.log(`[${formatLogTime()}] [RPA-WORKER] Daily report file: ${REKAP_FILE}`);
console.log(`[${formatLogTime()}] [RPA-WORKER] Waiting for PAID orders...`);

// Jalankan polling secara berkala
setInterval(processOrders, POLLING_INTERVAL);

// Jalankan sekali saat startup
processOrders();
