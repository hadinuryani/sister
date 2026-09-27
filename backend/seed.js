const mysql = require('mysql2/promise');

// Seed Script — Inisialisasi Database & Data Awal

const DB_NAME = 'food_ordering';

async function seed() {
  // Koneksi awal tanpa database (untuk CREATE DATABASE)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 3306,
  });

  console.log('[DB] Connected to MySQL Server');

  // 1. Buat database jika belum ada
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.query(`USE \`${DB_NAME}\``);
  console.log(`[DB] Database "${DB_NAME}" ready`);

  // 2. Buat tabel menus
  await connection.query(`
    CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255) DEFAULT '',
      price DECIMAL(10, 2) NOT NULL,
      image_url VARCHAR(255) DEFAULT '',
      category VARCHAR(50) DEFAULT 'Makanan',
      stock INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] Table "menus" created');

  // 3. Buat tabel orders
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status ENUM('PENDING', 'PAID', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
      payment_ref VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] Table "orders" created');

  // 4. Buat tabel order_items
  await connection.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      subtotal DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
    )
  `);
  console.log('[DB] Table "order_items" created');

  // 5. Seed data menu (hapus data lama lalu insert ulang)
  await connection.query('DELETE FROM order_items');
  await connection.query('DELETE FROM orders');
  await connection.query('DELETE FROM menus');
  await connection.query('ALTER TABLE menus AUTO_INCREMENT = 1');

  const menus = [
    ['Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan sayuran segar', 25000, '🍛', 'Makanan', 50],
    ['Mie Ayam Bakso', 'Mie ayam dengan bakso sapi kenyal dan kuah kaldu', 20000, '🍜', 'Makanan', 40],
    ['Ayam Geprek Sambal Matah', 'Ayam crispy geprek dengan sambal matah khas Bali', 22000, '🍗', 'Makanan', 35],
    ['Sate Ayam Madura', 'Sate ayam 10 tusuk dengan bumbu kacang dan lontong', 28000, '🥘', 'Makanan', 30],
    ['Gado-Gado Jakarta', 'Sayuran segar dengan bumbu kacang dan kerupuk', 18000, '🥗', 'Makanan', 45],
    ['Es Teh Manis', 'Teh manis dingin segar', 5000, '🧊', 'Minuman', 100],
    ['Jus Alpukat', 'Jus alpukat segar dengan susu coklat', 12000, '🥤', 'Minuman', 60],
    ['Kopi Susu Gula Aren', 'Espresso dengan susu dan gula aren pilihan', 15000, '☕', 'Minuman', 70],
  ];

  const insertQuery = `
    INSERT INTO menus (name, description, price, image_url, category, stock)
    VALUES ?
  `;
  await connection.query(insertQuery, [menus]);
  console.log(`[SEED] Seeded ${menus.length} menu records`);

  // Tampilkan ringkasan
  const [rows] = await connection.query('SELECT id, name, price, category FROM menus ORDER BY id');
  console.log('\nMenu table:');
  console.table(rows);

  await connection.end();
  console.log('\n[SEED] Database seeding complete.');
}

seed().catch((err) => {
  console.error('[ERROR] Database seed failed:', err.message);
  console.error('Ensure MySQL Server is running at localhost:3306');
  process.exit(1);
});
