# Sistem Food Ordering Terdistribusi
> Tugas Besar Mata Kuliah Sistem Terdistribusi (Semester 5)  
> Implementasi 4 Pilar: **REST API • Remote Procedure Call (RPC) • Remote Method Invocation (RMI) • 4-Tier Architecture**

---

## 📌 Daftar Isi
1. [Arsitektur Sistem & Port](#-arsitektur-sistem--port)
2. [Instalasi Awal](#-instalasi-awal)
3. [Panduan 1: Menjalankan di 1 Laptop (Lokal)](#-panduan-1-menjalankan-di-1-laptop-lokal)
4. [Panduan 2: Menjalankan di 3 Laptop via Ngrok (Internet)](#-panduan-2-menjalankan-di-3-laptop-via-ngrok-internet)
5. [Panduan 3: Menjalankan di 3 Laptop via 1 Wi-Fi / Hotspot (LAN IP)](#-panduan-3-menjalankan-di-3-laptop-via-1-wi-fi--hotspot-lan-ip)
6. [Alur Transaksi & Pengujian](#-alur-transaksi--pengujian)

---

## 🏛 Arsitektur Sistem & Port

Sistem ini memisahkan tanggung jawab komputasi ke dalam 4 tier terisolasi:

```text
┌────────────────────────────────────────────────────────┐
│ TIER 1: FRONTEND (React + Vite)                        │ Port: 5173
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST
┌──────────────────────────▼─────────────────────────────┐
│ TIER 2: BACKEND REST API (Express)                     │ Port: 3000
└────────────┬─────────────────────────────┬─────────────┘
             │ JSON-RPC (HTTP)             │ Raw TCP Socket
┌────────────▼──────────────┐┌─────────────▼─────────────┐
│ TIER 3A: RPC PAYMENT      ││ TIER 3B: RMI INVENTORY    │
│ Port: 4000                ││ Port: 5000                │
│ (processPayment)          ││ (InventoryManager)        │
└───────────────────────────┘└───────────────────────────┘
             │                             │
             └──────────────┬──────────────┘
                            │ MySQL Protocol
┌───────────────────────────▼────────────────────────────┐
│ TIER 4: DATABASE (MySQL Server)                        │ Port: 3306
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Instalasi Awal

Pastikan Node.js (versi 18+) dan MySQL Server telah terpasang.

1. **Install Dependencies di seluruh folder:**
   ```bash
   # Masuk ke folder backend
   cd backend && npm install

   # Masuk ke folder RPC Payment
   cd ../services/rpc_payment && npm install

   # Masuk ke folder RMI Inventory
   cd ../services/rmi_inventory && npm install

   # Masuk ke folder frontend
   cd ../../frontend && npm install
   ```

2. **Inisialisasi Database MySQL:**
   Pastikan MySQL berjalan (XAMPP / MySQL Service), lalu jalankan:
   ```bash
   cd backend && npm run seed
   ```
   *Script ini akan membuat database `food_ordering` beserta tabel `menus`, `orders`, `order_items`, dan mengisi data awal menu.*

---

## 💻 Panduan 1: Menjalankan di 1 Laptop (Lokal)

Cukup buka **4 terminal** berdampingan di VS Code / Command Prompt:

* **Terminal 1 (RPC Payment Service):**
  ```bash
  cd services/rpc_payment && node server.js
  # Aktif di port 4000
  ```

* **Terminal 2 (RMI Inventory Service):**
  ```bash
  cd services/rmi_inventory && node server.js
  # Aktif di port 5000
  ```

* **Terminal 3 (Backend API):**
  ```bash
  cd backend && npm start
  # Aktif di port 3000
  ```

* **Terminal 4 (Frontend React):**
  ```bash
  cd frontend && npm run dev
  # Aktif di http://localhost:5173
  ```

Buka browser di **`http://localhost:5173`** untuk memesan makanan.

---

## 🌐 Panduan 2: Menjalankan di 3 Laptop via Ngrok (Internet)

Gunakan skenario ini jika 3 laptop berada di jaringan internet berbeda (misalnya menggunakan kuota masing-masing).

### 👥 Pembagian Peran 3 Laptop:
* **Laptop 1:** Klien Frontend (Vite React)
* **Laptop 2:** Backend REST API & Database MySQL (Orchestrator)
* **Laptop 3:** Microservices (RPC Payment + RMI Inventory)

---

### Langkah 1: Setup di LAPTOP 3 (RPC & RMI Services)
1. Jalankan kedua service di 2 terminal:
   ```bash
   # Terminal 1: RPC Payment
   cd services/rpc_payment && node server.js

   # Terminal 2: RMI Inventory
   cd services/rmi_inventory && node server.js
   ```

2. Buka 2 tunnel Ngrok di terminal baru:
   * **Tunnel HTTP untuk RPC Payment (Port 4000):**
     ```bash
     ngrok http 4000
     ```
     *Salin domain HTTPS yang didapat, contoh:*  
     `https://rpc-service-abc.ngrok-free.app`

   * **Tunnel TCP untuk RMI Inventory (Port 5000):**
     ```bash
     ngrok tcp 5000
     ```
     *Salin host dan port TCP yang didapat, contoh:*  
     `tcp://4.tcp.ngrok.io:18452` *(Host: `4.tcp.ngrok.io`, Port: `18452`)*

3. File `.env` di Laptop 3:
   * `services/rpc_payment/.env`: `RPC_PORT=4000`
   * `services/rmi_inventory/.env`: `RMI_PORT=5000`

---

### Langkah 2: Setup di LAPTOP 2 (Backend & Database)
1. Buka file `backend/.env` dan arahkan ke alamat Ngrok Laptop 3:
   ```env
   PORT=3000

   # Database MySQL lokal di Laptop 2
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=
   DB_NAME=food_ordering

   # Arahkan ke Ngrok HTTP Laptop 3 (RPC Payment)
   RPC_HOST=rpc-service-abc.ngrok-free.app
   RPC_PORT=443

   # Arahkan ke Ngrok TCP Laptop 3 (RMI Inventory)
   RMI_HOST=4.tcp.ngrok.io
   RMI_PORT=18452
   ```

2. Jalankan Backend:
   ```bash
   cd backend && npm start
   ```

3. Buka tunnel Ngrok untuk Backend (Port 3000):
   ```bash
   ngrok http 3000
   ```
   *Salin domain HTTPS yang didapat, contoh:*  
   `https://backend-api-xyz.ngrok-free.app`

---

### Langkah 3: Setup di LAPTOP 1 (Frontend Web)
1. Buka file `frontend/.env` dan arahkan ke domain Ngrok Backend Laptop 2:
   ```env
   FRONTEND_PORT=5173

   # Arahkan ke Ngrok Backend Laptop 2
   BACKEND_HOST=backend-api-xyz.ngrok-free.app
   BACKEND_PORT=443
   ```

2. Jalankan Frontend:
   ```bash
   cd frontend && npm run dev
   ```
3. Buka browser di **`http://localhost:5173`**. Pesanan akan otomatis mengalir dari Laptop 1 $\rightarrow$ Laptop 2 $\rightarrow$ Laptop 3!

---

## 📶 Panduan 3: Menjalankan di 3 Laptop via 1 Wi-Fi / Hotspot (LAN IP)

> **💡 Rekomendasi Terbaik untuk Demo Presentasi:**  
> Jika 3 laptop terhubung ke 1 Wi-Fi kampus atau hotspot HP yang sama, gunakan metode IP LAN ini. Jauh lebih cepat, stabil, tanpa delay internet, dan tidak butuh akun ngrok.

1. **Cek IP Address masing-masing laptop:**
   Buka terminal/CMD lalu ketik `ipconfig` (Windows) pada Laptop 2 dan Laptop 3.  
   Lihat baris `IPv4 Address`, contoh:
   * IP Laptop 3 (Services): `192.168.1.15`
   * IP Laptop 2 (Backend): `192.168.1.10`

2. **Laptop 3 (Services):**
   Jalankan RPC (`cd services/rpc_payment && node server.js`) dan RMI (`cd services/rmi_inventory && node server.js`). Tidak perlu ubah `.env`.

3. **Laptop 2 (Backend):**
   Edit `backend/.env`:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=
   DB_NAME=food_ordering

   # Masukkan IP Laptop 3
   RPC_HOST=192.168.1.15
   RPC_PORT=4000
   RMI_HOST=192.168.1.15
   RMI_PORT=5000
   ```
   Lalu jalankan `cd backend && npm start`.

4. **Laptop 1 (Frontend):**
   Edit `frontend/.env`:
   ```env
   FRONTEND_PORT=5173

   # Masukkan IP Laptop 2
   BACKEND_HOST=192.168.1.10
   BACKEND_PORT=3000
   ```
   Lalu jalankan `cd frontend && npm run dev` dan buka browser di `http://localhost:5173`.

---

## 🧪 Alur Transaksi & Pengujian

### 1. Happy Path (Pemesanan Normal)
1. Pilih menu makanan di web frontend, masukkan nama pemesan, dan klik **Bayar Sekarang**.
2. Perhatikan konsol di masing-masing laptop:
   * **Backend:** Menerima order $\rightarrow$ membuka transaksi DB $\rightarrow$ memanggil RMI $\rightarrow$ memanggil RPC $\rightarrow$ update status ke `PAID`.
   * **RMI Service:** Menerima koneksi TCP $\rightarrow$ method `reserveStock()` dipanggil $\rightarrow$ mengembalikan kode `RSV-xxxx`.
   * **RPC Service:** Menerima JSON-RPC request $\rightarrow$ prosedur `processPayment()` dipanggil $\rightarrow$ mengembalikan kode `PAY-xxxx`.
3. Web otomatis menampilkan tanda lunas dengan referensi pembayaran dan reservasi stok.

### 2. Pengujian Fault Tolerance (Simulasi Error)
* **Matikan RPC Payment Service (Ctrl + C):**
  Coba lakukan pemesanan di web. Backend akan menangkap error jaringan tanpa crash, dan status pesanan otomatis berubah menjadi `FAILED`.
* **Cek Laporan Cache Objek RMI:**
  Buka URL browser di `http://localhost:3000/api/inventory-report` (atau via URL backend). Laporan transaksi dan cache stok yang disimpan di RAM remote object `InventoryManager` dapat langsung dilihat.
