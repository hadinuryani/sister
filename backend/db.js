const mysql = require('mysql2/promise');

// ============================================================
// Konfigurasi Koneksi MySQL
// Digunakan oleh Backend API untuk operasi CRUD ke database
// ============================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'food_ordering',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
