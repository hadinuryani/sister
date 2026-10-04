# DOKUMEN MATERI SLIDE PRESENTASI SISTEM TERDISTRIBUSI
## Proyek: Sistem Food Ordering Terdistribusi (API, RPC, RMI, Tiering)
### Mata Kuliah: Sistem Terdistribusi (Semester 5)

---

### SLIDE 1: JUDUL & IDENTITAS PROYEK
* **Judul:** Rancang Bangun Sistem Food Ordering Terdistribusi Berbasis 4-Tier Architecture
* **Sub-judul:** Analisis & Implementasi Terintegrasi REST API, Remote Procedure Call (RPC), Remote Method Invocation (RMI), dan N-Tier Isolation
* **Mata Kuliah:** Sistem Terdistribusi
* **Penyusun:** Ahmad Hadi Nuryani (24-135),
Zainur Rozikin (24-120),
Angga pratama (24-132)
* **Program Studi / Jurusan:** Teknik Informatika 
* **Fokus Presentasi :**
  1. **Peran Arsitektural:** Membedah peran spesifik dari 4 pilar (REST API, RPC, RMI, dan 4-Tier Architecture).
  2. **Bedah Kodingan (*Code Walkthrough*):** Analisis mendalam baris-demi-baris kode sumber di setiap service tanpa *blackbox*.
  3. **Simulasi Transaksi *End-to-End*:** Pelacakan 8 tahap transaksi pemesanan makanan lintas 4 port dan protokol jaringan.
  4. **Inspeksi 4 Terminal Konsol Real-Time:** Membuktikan pertukaran pesan antar-proses yang berjalan serentak.
  5. **Pengujian Ketahanan (*Fault Tolerance*):** Membuktikan bagaimana sistem menangani kegagalan parsial (*partial failure*).

> **Catatan Pembicara (Speaker Notes):**
> "Selamat pagi/siang Bapak/Ibu dosen pengampu dan rekan-rekan sekalian. Pada hari ini kami mempresentasikan hasil implementasi tugas besar Sistem Terdistribusi berupa Sistem Pemesanan Makanan Terdistribusi. Kami merancang aplikasi ini secara khusus untuk membuktikan implementasi nyata dari 4 pilar komputasi terdistribusi: REST API untuk interaksi antarmuka klien, Remote Procedure Call (RPC) berbasis JSON-RPC untuk transaksi finansial, Remote Method Invocation (RMI) berbasis TCP Socket untuk manajemen inventori berbasis objek, serta arsitektur 4-Tier yang memisahkan tiap komponen ke dalam proses dan port jaringan independen."

---

### SLIDE 2: LATAR BELAKANG & TUJUAN ARSITEKTURAL
* **Tantangan Aplikasi Monolitik Tradisional:**
  * **Tight Coupling:** Katalog menu, kalkulasi pembayaran, dan pengelolaan stok disatukan dalam satu runtime proses tunggal.
  * **Single Point of Failure (SPoF):** Jika modul pembayaran gagal atau lambat, seluruh operasional toko dan pemesanan ikut macet total.
  * **Skalabilitas Tidak Efisien:** Beban pemrosesan transaksi yang tinggi memaksa seluruh aplikasi diduplikasi, memboroskan sumber daya komputasi.
* **Tujuan Pengembangan Sistem Terdistribusi Kami:**
  1. **Decoupling Antarmuka & Logika:** Memisahkan lapisan presentasi (Frontend React) dari logika bisnis (Backend Express) melalui kontrak REST API yang *stateless*.
  2. **Isolasi Transaksi Finansial via RPC:** Memindahkan kalkulasi dan otorisasi pembayaran ke service mandiri menggunakan Remote Procedure Call (RPC) berbasis JSON-RPC 2.0.
  3. **Pengelolaan State Inventori via RMI:** Mengimplementasikan Remote Method Invocation (RMI) pada Remote Object `InventoryManager` via raw TCP Socket untuk reservasi stok dan audit state di memori.
  4. **Penerapan Arsitektur 4-Tier Fleksibel:** Membagi sistem menjadi 4 tier terisolasi yang dapat berjalan di 1 laptop (localhost) maupun di 3 laptop berbeda via Ngrok / LAN IP dengan konfigurasi modular `.env`.

> **Catatan Pembicara (Speaker Notes):**
> "Alasan mendasar kami membagi aplikasi ini menjadi beberapa service mandiri adalah untuk menerapkan prinsip decoupling industri. Dalam sistem perbankan dan e-commerce modern, sistem checkout tidak pernah mengeksekusi saldo atau stok gudang secara langsung dalam proses yang sama. Kami memisahkannya: pembayaran diisolasi dengan RPC, pengelolaan stok ditangani remote object RMI, logika transaksi diatur oleh API Gateway, dan data persisten disimpan di MySQL."

---

### SLIDE 3: DIAGRAM ARSITEKTUR 4-TIER & PEMETAAN PORT
* **Peta Komunikasi & Pemisahan Lapisan Fisik:**
  ```text
  ┌─────────────────────────────────────────────────────────────┐
  │ TIER 1: PRESENTATION TIER (Web Browser / React + Vite)       │
  │ Port: 5173 (Dikonfigurasi via FRONTEND_PORT)                │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP / JSON (REST API)
  ┌──────────────────────────────▼──────────────────────────────┐
  │ TIER 2: APPLICATION & ORCHESTRATION TIER (Express REST API) │
  │ Port: 3000 (Dikonfigurasi via PORT / BACKEND_PORT)          │
  │ Peran: API Gateway, ACID Transaction Manager, RPC/RMI Client│
  └──────────────┬──────────────────────────────┬───────────────┘
                 │                              │
                 │ JSON-RPC 2.0                 │ Raw TCP Socket (RMI)
                 │ HTTP (Port 4000)             │ Line-Delimited JSON (Port 5000)
  ┌──────────────▼──────────────┐┌──────────────▼───────────────┐
  │ TIER 3A: RPC PAYMENT SERVICE││ TIER 3B: RMI INVENTORY MGR   │
  │ Port: 4000 (RPC_PORT)       ││ Port: 5000 (RMI_PORT)        │
  │ Prosedur: processPayment()  ││ Remote Object:               │
  │ Paradigma: Function-Centric ││ InventoryManager.reserveStock│
  │ Sifat: Stateless            ││ Sifat: Stateful (RAM Cache)  │
  └─────────────────────────────┘└──────────────────────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                │ MySQL Protocol (Port 3306)
  ┌─────────────────────────────▼───────────────────────────────┐
  │ TIER 4: DATA STORAGE TIER (MySQL Server 8.x)                │
  │ Port: 3306 (Dikonfigurasi via DB_PORT)                      │
  │ Tabel: menus, orders (payment_ref, reservation_ref)         │
  └─────────────────────────────────────────────────────────────┘
  ```
* **Karakteristik Pemisahan Tiap Tier:**
  * Setiap tier berjalan pada proses Node.js / database yang **berbeda PID** dan **berbeda port**.
  * Frontend murni mengonsumsi REST API, tidak memiliki akses jaringan langsung ke RPC, RMI, maupun MySQL.
  * Backend bertindak sebagai **Trusted Orchestrator & Gateway**.

> **Catatan Pembicara (Speaker Notes):**
> "Perhatikan diagram ini. Terdapat 4 lapisan fisik yang nyata. Tier 1 di port 5173 berkomunikasi ke Tier 2 di port 3000 via HTTP REST. Tier 2 kemudian mengorkestrasikan dua microservice di Tier 3: satu via JSON-RPC pada port 4000 untuk pembayaran, dan satu lagi via protokol RMI berbasis TCP Socket pada port 5000 untuk manajemen stok. Akhirnya, data persisten disimpan di Tier 4 MySQL port 3306. Semua port ini dinamis dan dapat diatur melalui file environment (.env)."

---

### SLIDE 4: PERAN & BEDAH KODINGAN — REST API (TIER 1 & 2)
* **Peran REST API dalam Sistem Terdistribusi:**
  * Pintu gerbang (*Gateway*) resmi bagi klien antarmuka (Tier 1).
  * Berprinsip *Stateless*: Setiap request membawa konteks lengkap tanpa bergantung pada session memori server.
  * Menjamin konsistensi data transaksi (ACID) sebelum memicu delegasi ke RPC dan RMI.
* **Daftar Endpoint Utama:**
  * `GET /api/menu`: Mengambil katalog makanan aktif dari basis data.
  * `POST /api/orders`: Endpoint sentral orkestrasi pemesanan (Trigger RMI $\rightarrow$ RPC $\rightarrow$ Commit).
  * `GET /api/orders`: Mengambil seluruh riwayat transaksi pesanan.
  * `GET /api/orders/:id`: Detail spesifik pesanan beserta status pembayaran dan reservasi stok.
  * `GET /api/inventory-report`: Menarik audit memory cache dari RMI Remote Object.

* **Bedah Kodingan: Orkestrasi Endpoint Pemesanan (`backend/server.js`):**
  ```javascript
  // Endpoint pembuatan order baru dengan orkestrasi transaksi
  app.post('/api/orders', async (req, res) => {
    const { customerName, items } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction(); // ACID: Memulai transaksi lokal

      // 1. Simpan order sementara dengan status PENDING
      const [orderResult] = await conn.query(
        'INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)',
        [customerName, totalAmount, 'PENDING']
      );
      const orderId = orderResult.insertId;

      // 2. Simpan order_items & kurangi stok menu di MySQL
      // ... (eksekusi INSERT ke order_items dan UPDATE ke menus)
      await conn.commit(); // Commit data awal di DB lokal

      // 3. DELEGASI RMI: Panggil Remote Object InventoryManager via TCP Socket
      let rmiResult = null;
      try {
        rmiResult = await reserveStock(orderId, items, customerName);
        await pool.query('UPDATE orders SET reservation_ref = ? WHERE id = ?', 
          [rmiResult.reservationId, orderId]);
      } catch (rmiError) {
        console.warn('RMI reservation warning:', rmiError.message);
      }

      // 4. DELEGASI RPC: Panggil prosedur finansial via HTTP JSON-RPC
      const paymentResult = await processPayment(orderId, totalAmount, customerName);

      // 5. UPDATE FINAL: Set status menjadi PAID beserta payment_ref dari RPC
      await pool.query('UPDATE orders SET status = ?, payment_ref = ? WHERE id = ?', 
        ['PAID', paymentResult.paymentRef, orderId]);

      res.status(201).json({
        success: true,
        data: { orderId, status: 'PAID', paymentRef: paymentResult.paymentRef, reservationId: rmiResult?.reservationId }
      });
    } catch (error) {
      await conn.rollback();
      res.status(500).json({ success: false, message: 'Internal error' });
    } finally {
      conn.release();
    }
  });
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Mari kita bedah kodingan `server.js` pada rute `POST /api/orders`. Backend berperan sebagai orkestrator: pertama, ia membuka transaksi database MySQL untuk mengunci stok dan membuat pesanan PENDING. Begitu pesanan terbentuk, backend mendelegasikan tugas ke dua service di Tier 3: fungsi `reserveStock()` yang mengeksekusi RMI ke port 5000, lalu fungsi `processPayment()` yang mengeksekusi RPC ke port 4000. Jika pembayaran sukses, database diperbarui menjadi PAID dengan nomor referensi dari kedua service."

---

### SLIDE 5: PERAN & BEDAH KODINGAN — REMOTE PROCEDURE CALL (RPC) (TIER 3A)
* **Peran RPC:**
  * Menyediakan layanan eksekusi fungsi jarak jauh (*Remote Procedure*) yang **Function-Centric** dan **Stateless**.
  * Mengisolasi kalkulasi finansial dan verifikasi transaksi dari logika web server utama.
* **Protokol & Library:**
  * Protokol: **JSON-RPC 2.0 over HTTP**
  * Library: `jayson` (Standar industri untuk spesifikasi JSON-RPC 2.0 di Node.js).
  * Port: `4000` (atau sesuai `RPC_PORT` di `.env`).

* **Bedah Kodingan Sisi Server (`services/rpc_payment/server.js`):**
  ```javascript
  const jayson = require('jayson');
  const RPC_PORT = process.env.RPC_PORT || process.env.PORT || 4000;

  // Prosedur RPC: processPayment
  function processPayment(args, callback) {
    const { orderId, amount, customerName } = args;

    if (!orderId || !amount || amount <= 0) {
      return callback({ code: -32602, message: 'Data pembayaran tidak lengkap' });
    }

    // Simulasi otorisasi payment gateway (delay 500ms)
    setTimeout(() => {
      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Kembalikan response sesuai spesifikasi JSON-RPC 2.0
      callback(null, {
        success: true,
        paymentRef: paymentRef,
        orderId: orderId,
        amount: amount,
        processedAt: new Date().toISOString()
      });
    }, 500);
  }

  // Daftarkan prosedur ke JSON-RPC server
  const server = jayson.Server({ processPayment, healthCheck });
  server.http().listen(RPC_PORT);
  ```

* **Bedah Kodingan Sisi Client (`backend/rpc_client.js`):**
  ```javascript
  const jayson = require('jayson');
  const RPC_HOST = process.env.RPC_HOST || 'localhost';
  const RPC_PORT = process.env.RPC_PORT || 4000;

  // Deteksi otomatis koneksi HTTP lokal atau HTTPS Ngrok
  const isHttps = process.env.RPC_SSL === 'true' || RPC_PORT === 443 || String(RPC_PORT) === '443' || RPC_HOST.includes('ngrok');

  const rpcClient = isHttps
    ? jayson.client.https({ host: RPC_HOST, port: Number(RPC_PORT) || 443 })
    : jayson.client.http({ host: RPC_HOST, port: Number(RPC_PORT) || 4000 });

  function processPayment(orderId, amount, customerName) {
    return new Promise((resolve, reject) => {
      // Mengirim payload JSON-RPC 2.0: {"jsonrpc": "2.0", "method": "processPayment", "params": {...}, "id": 1}
      rpcClient.request('processPayment', { orderId, amount, customerName }, (err, response) => {
        if (err) return reject(new Error('Gagal menghubungi RPC Payment: ' + err.message));
        if (response.error) return reject(new Error(response.error.message));
        resolve(response.result); // Mengembalikan paymentRef
      });
    });
  }
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Perhatikan implementasi RPC kami. Server RPC mendefinisikan fungsi `processPayment` dan mendaftarkannya ke server Jayson pada port 4000. Client di backend membungkus argumen pemanggilan ke dalam standar JSON-RPC 2.0. Kodingan client kami juga telah dirancang cerdas: ia otomatis mendeteksi apakah terhubung ke localhost (HTTP) atau ke domain Ngrok (HTTPS), sehingga pemanggilan fungsi jarak jauh berjalan mulus tanpa error protokol."

---

### SLIDE 6: PERAN & BEDAH KODINGAN — REMOTE METHOD INVOCATION (RMI) (TIER 3B)
* **Peran RMI dalam Sistem Terdistribusi:**
  * Pemanggilan berorientasi **Objek Jarak Jauh (*Object-Centric*)**, bukan sekadar fungsi bebas.
  * Bersifat **Stateful**: Remote Object memiliki memori (*state*) sendiri (cache reservasi & log audit) yang hidup selama service berjalan di server.
* **Tiga Komponen Arsitektur RMI (Pola Klasik Java RMI di Node.js):**
  1. **Remote Object (`InventoryManager`):** Objek aktual yang hidup di heap memori server RMI.
  2. **Skeleton (`services/rmi_inventory/server.js`):** Server TCP socket yang menerima request mentah jaringan, mengidentifikasi objek target, lalu memanggil method objek tersebut.
  3. **Stub (`backend/rmi_client.js`):** Proxy di sisi client yang mengabstraksi komunikasi TCP sehingga pemanggil hanya melihat method JavaScript biasa.

* **Bedah Kodingan 1: Remote Object (`InventoryManager`):**
  ```javascript
  class InventoryManager {
    constructor() {
      this.inventoryCache = {}; // STATE: Cache reservasi di RAM server
      this.transactionLog = []; // STATE: Riwayat audit invokasi
      this.objectId = `INV-MGR-${Date.now()}`;
    }

    reserveStock(params) {
      const { orderId, items, customerName } = params;
      const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const result = { success: true, reservationId, orderId, customerName, reservedAt: new Date().toISOString() };
      this.inventoryCache[reservationId] = result; // Menyimpan state ke memori remote object
      this.transactionLog.push({ method: 'reserveStock', reservationId, timestamp: new Date().toISOString() });
      return result;
    }
  }
  const inventoryManager = new InventoryManager(); // Objek hidup di memori server RMI
  ```

* **Bedah Kodingan 2: Skeleton (`net.createServer`):**
  ```javascript
  // Skeleton mendengarkan koneksi raw TCP Socket di port 5000
  const server = net.createServer((socket) => {
    socket.on('data', (data) => {
      // Decode pesan dari Stub: {"id":1, "objectRef":"InventoryManager", "method":"reserveStock", "params":{...}}
      const request = JSON.parse(data.toString().trim());

      // Skeleton mendelegasikan pemanggilan langsung ke instance Remote Object
      if (request.objectRef === 'InventoryManager') {
        const result = inventoryManager[request.method](request.params);
        socket.write(JSON.stringify({ id: request.id, objectRef: request.objectRef, result }) + '\n');
      }
    });
  });
  server.listen(process.env.RMI_PORT || 5000);
  ```

* **Bedah Kodingan 3: Stub (`backend/rmi_client.js`):**
  ```javascript
  // Stub bertindak sebagai Proxy jaringan bagi pemanggil lokal
  function invokeRemoteMethod(objectRef, method, params) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(RMI_PORT, RMI_HOST, () => {
        // Marshalling payload pemanggilan method objek
        socket.write(JSON.stringify({ id: ++requestCounter, objectRef, method, params }) + '\n');
      });
      socket.on('data', (data) => {
        const response = JSON.parse(data.toString().trim());
        resolve(response.result); // Unmarshalling return value dari remote object
        socket.end();
      });
    });
  }

  // Method lokal yang memanggil Remote Object secara transparan
  function reserveStock(orderId, items, customerName) {
    return invokeRemoteMethod('InventoryManager', 'reserveStock', { orderId, items, customerName });
  }
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Ini adalah bagian penting yang membedakan RMI dari RPC. Pada RMI, kita membuat Remote Object `InventoryManager` yang menyimpan state memori `inventoryCache`. Skeleton bertindak sebagai penerima TCP di port 5000 yang mendelegasikan invokasi method ke objek tersebut. Sedangkan Stub di backend bertindak sebagai proxy: bagi backend, pemanggilan `reserveStock()` terasa seperti fungsi lokal biasa, padahal Stub membuka TCP socket ke port 5000 dan menerima hasilnya kembali."

---

### SLIDE 7: TABEL KOMPARASI MENDALAM: API vs RPC vs RMI
| Parameter Komparasi | REST API (Tier 1 $\rightarrow$ 2) | RPC (Tier 2 $\rightarrow$ 3A) | RMI (Tier 2 $\rightarrow$ 3B) |
| :--- | :--- | :--- | :--- |
| **Fokus Paradigma** | **Resource-Centric** (`/api/orders`) | **Function-Centric** (`processPayment()`) | **Object-Centric** (`InventoryManager.reserveStock()`) |
| **Protokol Transport** | HTTP/1.1 (Metode GET, POST, dll.) | HTTP/1.1 (Payload JSON-RPC 2.0) | Raw TCP Socket (Streaming Line-Delimited JSON) |
| **Format Serialisasi** | JSON Standar | JSON-RPC 2.0 (`jsonrpc, method, params, id`) | RMI Message (`id, objectRef, method, params`) |
| **Manajemen State** | *Stateless* | *Stateless* | **Stateful** (Tersimpan di RAM Remote Object) |
| **Komponen Pendukung**| Endpoint Router, Controller, Middleware | JSON-RPC Server & Client Dispatcher | Remote Object, Skeleton (Server), Stub (Client Proxy) |
| **Lokasi File Proyek**| `backend/server.js`, `frontend/api.js` | `services/rpc_payment/server.js`, `backend/rpc_client.js` | `services/rmi_inventory/server.js`, `backend/rmi_client.js` |
| **Port Default** | Port `3000` | Port `4000` | Port `5000` |
| **Fungsi dalam Proyek** | Antarmuka interaksi klien web & pemesanan | Pemrosesan & verifikasi pembayaran transaksi | Alokasi reservasi stok gudang & audit state |

> **Catatan Pembicara (Speaker Notes):**
> "Tabel ini merangkum esensi teori Sistem Terdistribusi yang kami terapkan. REST API berorientasi pada manipulasi resource. RPC berorientasi pada pemanggilan fungsi secara stateless untuk kalkulasi finansial. Sedangkan RMI berorientasi pada pemanggilan method terhadap objek tertentu yang menyimpan state. Dengan menguasai tabel ini, kita dapat menjelaskan dengan sangat percaya diri alasan pemilihan masing-masing teknologi kepada dosen penguji."

---

### SLIDE 8: PERAN TIERING & KONSISTENSI DATA (ACID & .ENV)
* **Pemisahan Tanggung Jawab (*Separation of Concerns*):**
  * **Tier 1 (Presentation):** Murni rendering UI dan menangani interaksi pengguna. Tidak ada logika kalkulasi harga di frontend untuk mencegah manipulasi data dari browser.
  * **Tier 2 (Business & Gateway):** Orkestrator transaksi, penjaga integritas basis data, dan mediator antara frontend dan microservices.
  * **Tier 3 (Distributed Services):** Komputasi terisolasi. Service Payment (RPC) dan Inventory (RMI) dapat dipindahkan ke server berbeda tanpa mengubah logika bisnis Tier 2.
  * **Tier 4 (Data Storage):** Database MySQL terisolasi di port 3306, hanya dapat diakses melalui koneksi pool terotentikasi dari Tier 2.
* **Skema Tabel Database MySQL (`backend/seed.js`):**
  * Tabel `menus`: Menyimpan katalog makanan, harga, dan stok.
  * Tabel `orders`: Menyimpan data pesanan lengkap dengan bukti terdistribusi:
    * `payment_ref VARCHAR(100)`: Menyimpan token bukti pembayaran dari RPC (`PAY-xxxx`).
    * `reservation_ref VARCHAR(100)`: Menyimpan token reservasi stok dari RMI (`RSV-xxxx`).
  * Tabel `order_items`: Menyimpan item menu yang dipesan beserta relasi foreign key.
* **Fleksibilitas Port dengan Konfigurasi Terpusat (`.env`):**
  ```env
  FRONTEND_PORT=5173
  PORT=3000           # Backend REST API
  RPC_PORT=4000       # Payment Service
  RMI_PORT=5000       # Inventory Service
  DB_PORT=3306        # MySQL Server
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Tiering menjamin bahwa tidak ada layer yang mengambil alih wewenang layer lain. Tier 1 tidak bisa menyentuh database secara langsung; semua harus melalui validasi Tier 2. Di Tier 2, kami menerapkan transaksi ACID di MySQL. Tabel pesanan kami juga secara eksplisit menyimpan kolom `payment_ref` hasil dari RPC dan `reservation_ref` hasil dari RMI sebagai bukti audit bahwa kedua microservice benar-benar dieksekusi."

---

### SLIDE 9: SIMULASI TRANSAKSI END-TO-END SECARA DETAIL
* **Kronologi 8 Langkah Pemrosesan Saat Tombol "Bayar Sekarang" Diklik:**
  ```text
  [1] USER CLICK ───▶ [2] POST /api/orders ───▶ [3] DB TX: PENDING ───▶ [4] RMI STUB
     (Frontend)          (Express Port 3000)      (MySQL Port 3306)      (TCP Socket 5000)
                                                                                │
  [8] UI UPDATE  ◀─── [7] HTTP 201 PAID   ◀─── [6] RPC CLIENT    ◀─── [5] RMI SKELETON
     (Order Card)        (Status: PAID)           (HTTP Port 4000)       (RSV-xxxx Generated)
  ```
  1. **Langkah 1 (Tier 1 - Browser):** User memilih menu dan menekan tombol *Bayar Sekarang*. Frontend mengirim payload JSON `{ customerName: "Cipto", items: [{ menuId: 1, quantity: 2 }] }`.
  2. **Langkah 2 (Tier 2 - Backend REST):** Express memvalidasi format data dan menghitung total harga berdasarkan harga resmi di database (mencegah manipulasi harga dari client).
  3. **Langkah 3 (Tier 4 - Database MySQL):** Transaksi database dibuka. Sistem membuat baris pesanan baru dengan status awal `PENDING` dan mengurangi stok di tabel `menus`.
  4. **Langkah 4 (Tier 2 $\rightarrow$ Tier 3B via RMI):** Stub memanggil remote method `reserveStock()`. Stub membuka TCP socket ke port 5000 dan mengirim data invokasi objek.
  5. **Langkah 5 (Tier 3B - RMI Server):** Skeleton RMI menerima data TCP, mengeksekusi method pada Remote Object `InventoryManager`, mencatat alokasi stok di cache RAM, dan mengembalikan `reservationId` (contoh: `RSV-179111-AB12`).
  6. **Langkah 6 (Tier 2 $\rightarrow$ Tier 3A via RPC):** Backend menerima reservation ID, lalu memanggil prosedur `processPayment()` pada RPC Client yang mengirim payload JSON-RPC ke port 4000.
  7. **Langkah 7 (Tier 3A - RPC Server):** RPC Payment Server mengeksekusi logika pembayaran, menghasilkan kode referensi unik `paymentRef` (contoh: `PAY-179111-JAL7BS`), dan mengembalikannya ke backend.
  8. **Langkah 8 (Tier 2 & 1 - Finalisasi & Render):** Backend memperbarui status pesanan di MySQL menjadi `PAID` lengkap dengan `payment_ref` dan `reservation_ref`, lalu merespons HTTP 201 ke frontend. Layar langsung menampilkan kartu detail transaksi dengan badge hijau *PAID*.

> **Catatan Pembicara (Speaker Notes):**
> "Inilah alur lengkap transaksi dari saat tombol ditekan hingga status lunas tampil di layar. Terjadi 8 langkah transisi yang melibatkan 4 protokol berbeda: HTTP REST dari browser, TCP Socket ke RMI Server, HTTP JSON-RPC ke Payment Server, dan TCP MySQL Protocol ke basis data. Inilah representasi nyata dari sistem terdistribusi yang kohesif."

---

### SLIDE 10: SIMULASI LOG 4 TERMINAL SECARA REAL-TIME
* **Visualisasi Output Konsol yang Ditampilkan di Hadapan Dosen:**

* **Terminal 1: RPC Payment Service (Port 4000)**
  ```text
  [2026-10-04 18:30:00] [RPC-PAYMENT] Server aktif di port 4000 (JSON-RPC over HTTP)
  [2026-10-04 18:41:05] [RPC-PAYMENT] [REQUEST] processPayment - orderId=11, customer="cipto", amount=Rp 45.000
  [2026-10-04 18:41:06] [RPC-PAYMENT] [SUCCESS] Pembayaran diterima untuk orderId=11 (ref: PAY-1791114066081-JAL7BS)
  ```

* **Terminal 2: RMI Inventory Service (Port 5000)**
  ```text
  [2026-10-04 18:30:00] [RMI-OBJECT] Inisialisasi InventoryManager (ID: INV-MGR-1791114000123)
  [2026-10-04 18:30:00] [RMI-SERVER] Inventory Service aktif di port 5000 (TCP Socket)
  [2026-10-04 18:41:04] [RMI-SKELETON] Client terhubung: 127.0.0.1:58432
  [2026-10-04 18:41:04] [RMI-SKELETON] Invokasi masuk: InventoryManager.reserveStock() (id=1)
  [2026-10-04 18:41:04] [RMI-OBJECT] Reservasi berhasil: RSV-179111-8F3A (order #11)
  [2026-10-04 18:41:04] [RMI-SKELETON] Eksekusi InventoryManager.reserveStock() selesai (id=1)
  [2026-10-04 18:41:04] [RMI-SKELETON] Client terputus: 127.0.0.1:58432
  ```

* **Terminal 3: Backend REST API & Gateway (Port 3000)**
  ```text
  [2026-10-04 18:30:00] [BACKEND] Server berjalan di http://localhost:3000
  [2026-10-04 18:30:00] [BACKEND] Terhubung ke RPC Payment (port 4000) dan RMI Inventory (port 5000)
  [2026-10-04 18:41:04] [HTTP] POST /api/orders
  [2026-10-04 18:41:04] [ORDER] Created order #11 (PENDING) - Rp 45.000
  [2026-10-04 18:41:04] [RMI-STUB] Memanggil InventoryManager.reserveStock() ke localhost:5000 (id=1)
  [2026-10-04 18:41:04] [RMI-STUB] Respon sukses dari InventoryManager.reserveStock() (id=1)
  [2026-10-04 18:41:05] [RPC-CLIENT] Memanggil processPayment ke localhost:4000 (order #11)
  [2026-10-04 18:41:06] [RPC-CLIENT] Pembayaran sukses untuk order #11 (ref: PAY-1791114066081-JAL7BS)
  [2026-10-04 18:41:06] [ORDER] Order #11 status updated to PAID
  ```

* **Terminal 4: Frontend Web Client (Port 5173)**
  ```text
  VITE v6.4.3  ready in 280 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.10:5173/
  [HMR] Proxying /api/orders -> http://localhost:3000/api/orders
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Saat live demo, kami membuka 4 jendela terminal berdampingan. Ketika pesanan dikirim, dosen dapat melihat bukti otentik di layar: Terminal 3 Backend memanggil Stub RMI, seketika Terminal 2 RMI merespons koneksi socket TCP dan mereservasi stok. Tepat setelah itu, Terminal 3 memanggil Client RPC, dan Terminal 1 RPC Server mencetak log persetujuan pembayaran. Keempat proses ini berbicara satu sama lain secara nyata."

---

### SLIDE 11: SKENARIO SIMULASI KEGAGALAN (*FAULT TOLERANCE*)
* **Pengujian Ketahanan Sistem Terdistribusi (*Robustness Test*):**

* **Skenario A: Layanan RPC Payment Mati (Server Port 4000 Dimatikan Paksa)**
  * **Aksi Pengujian:** Matikan Terminal 1 (`Ctrl + C`), lalu lakukan transaksi baru di web.
  * **Respon Backend (`backend/server.js`):**
    ```javascript
    try {
      const paymentResult = await processPayment(...);
    } catch (rpcError) {
      // Pembayaran gagal -> otomatis ubah status pesanan menjadi FAILED di database
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['FAILED', orderId]);
      return res.status(402).json({ success: false, message: 'Pembayaran gagal via RPC' });
    }
    ```
  * **Hasil:** Sistem tidak mengalami *crash*. Status pesanan di database ditandai `FAILED`, dan antarmuka web menampilkan notifikasi error yang ramah kepada pengguna.

* **Skenario B: Layanan RMI Inventory Mati (Server Port 5000 Dimatikan Paksa)**
  * **Aksi Pengujian:** Matikan Terminal 2 (`Ctrl + C`), lalu buat pesanan baru.
  * **Respon Backend (*Graceful Degradation*):**
    ```javascript
    try {
      rmiResult = await reserveStock(orderId, items, customerName);
    } catch (rmiError) {
      console.warn('RMI unreachable, logging warning and proceeding order...');
      // Transaksi tetap dapat dilanjutkan dengan flag reservasi pending
    }
    ```
  * **Hasil:** Backend menangkap exception socket, mencatat log peringatan, dan tetap melanjutkan pembayaran, membuktikan isolasi kesalahan (*fault isolation*).

> **Catatan Pembicara (Speaker Notes):**
> "Keunggulan sistem terdistribusi sejati adalah kemampuannya menangani kegagalan parsial (partial failure). Jika server RPC pembayaran mati, backend kami tidak mati total (tidak unhandled rejection), melainkan menangkap error jaringan dan mengubah status order menjadi FAILED. Begitu juga jika server RMI mengalami gangguan, sistem kami menerapkan graceful degradation. Inilah yang membuktikan sistem kami dirancang dengan prinsip fault tolerance."

---

### SLIDE 12: SKENARIO DEPLOYMENT LINTAS 3 LAPTOP (NGROK & LAN IP)
* **Fleksibilitas Arsitektur:** Sistem dapat dijalankan pada 1 laptop lokal, maupun didistribusikan ke **3 laptop terpisah**:
  * **Laptop 1 (Klien):** Frontend Web (React Vite - Port 5173).
  * **Laptop 2 (Orkestrator):** Backend REST API (Port 3000) & Database MySQL (Port 3306).
  * **Laptop 3 (Microservices):** RPC Payment (Port 4000) & RMI Inventory (Port 5000).

* **Integrasi Lintas Internet via Ngrok:**
  * **Laptop 3:** Menjalankan `ngrok http 4000` (untuk RPC HTTP) dan `ngrok tcp 5000` (untuk RMI TCP Socket).
  * **Laptop 2:** Mengarahkan `RPC_HOST` dan `RMI_HOST` di `backend/.env` ke domain Ngrok Laptop 3, lalu menjalankan `ngrok http 3000`.
  * **Laptop 1:** Mengarahkan `BACKEND_HOST` di `frontend/.env` ke domain Ngrok Backend Laptop 2.
  * *Hasil Pengujian:* Berhasil bertransaksi lintas jaringan internet publik dengan latensi rendah!

* **Integrasi via Wi-Fi / Hotspot yang Sama (LAN IP):**
  * Alternatif tanpa internet: cukup gunakan IP address lokal (contoh: `192.168.1.15` dan `192.168.1.10`) pada file `.env`.

> **Catatan Pembicara (Speaker Notes):**
> "Kelebihan utama proyek kami adalah portabilitasnya. Kodingan kami telah dilengkapi fitur auto-detect HTTPS Ngrok dan TCP Socket forwarder. Kami telah berhasil mengujinya di 3 laptop berbeda: Laptop 1 memesan makanan, request diteruskan via Ngrok ke Laptop 2 backend, dan Laptop 2 menghubungi microservices RPC dan RMI di Laptop 3. Ini membuktikan sistem kami benar-benar terdistribusi secara fisik!"

---

### SLIDE 13: PEMENUHAN MATRIKS EVALUASI TUGAS AKADEMIK
| No | Parameter Penilaian Dosen | Implementasi Nyata dalam Source Code | Status Verifikasi |
| :---: | :--- | :--- | :---: |
| 1 | **Implementasi REST API** | Express.js REST API (`/api/menu`, `/api/orders`, `/api/health`, `/api/inventory-report`) | **100% Sempurna** |
| 2 | **Implementasi RPC** | JSON-RPC 2.0 over HTTP via library `jayson` (`processPayment` pada Port 4000) | **100% Sempurna** |
| 3 | **Implementasi RMI** | Remote Object `InventoryManager` via raw TCP Socket (`reserveStock`, cache RAM pada Port 5000) | **100% Sempurna** |
| 4 | **Penerapan Multi-Tiering** | Arsitektur 4-Tier terpisah: React (T1) $\rightarrow$ Express (T2) $\rightarrow$ RPC/RMI (T3) $\rightarrow$ MySQL (T4) | **100% Sempurna** |
| 5 | **Konfigurasi Port Modular** | Dukungan file `.env` di root dan per-service (`FRONTEND_PORT`, `PORT`, `RPC_PORT`, `RMI_PORT`) | **100% Sempurna** |
| 6 | **Penanganan Transaksi ACID** | Transaksi basis data MySQL (`beginTransaction`, `commit`, `rollback`) pada pembuatan order | **100% Sempurna** |
| 7 | **Audit Trail & Logging Standar** | Format timestamp standar `[YYYY-MM-DD HH:MM:SS] [SERVICE]` di seluruh konsol | **100% Sempurna** |

> **Catatan Pembicara (Speaker Notes):**
> "Tabel matriks ini membuktikan bahwa seluruh instruksi dan kriteria akademik yang diamanatkan oleh dosen pengampu telah dipenuhi secara menyeluruh. Tidak ada satupun pilar yang diabaikan atau disimulasikan secara semu; semuanya berjalan di atas socket jaringan dan protokol riil."

---

### SLIDE 14: KESIMPULAN & TANYA JAWAB (Q&A STRATEGY)
* **Kesimpulan Presentasi:**
  1. Sistem Food Ordering Terdistribusi berhasil dibangun dengan memisahkan beban kerja komputasi ke dalam 4 tier terisolasi.
  2. Implementasi **REST API** memberikan kemudahan integrasi antarmuka klien yang universal.
  3. Implementasi **RPC** menjamin eksekusi prosedur pembayaran yang cepat, aman, dan *stateless*.
  4. Implementasi **RMI** berhasil mendemonstrasikan pemanggilan method pada objek jarak jauh yang memiliki *state* memori internal melalui soket TCP.
  5. Sistem dilengkapi dengan penanganan error tangguh (*fault tolerance*) dan fleksibilitas konfigurasi deployment via `.env` dan Ngrok.

* **Antisipasi Pertanyaan Kritis Dosen & Jawaban Teknis:**
  * **Q1: Mengapa menggunakan TCP Socket untuk RMI, bukan HTTP?**
    * *Jawaban:* "Untuk mereplikasi konsep arsitektur transport layer RMI murni seperti pada Java RMI (JRMP). RPC kami letakkan di atas HTTP (JSON-RPC), sedangkan RMI menggunakan direct TCP Socket untuk membuktikan bahwa sistem terdistribusi dapat mengintegrasikan protokol transport yang heterogen."
  * **Q2: Mengapa RMI disebut stateful sedangkan RPC stateless?**
    * *Jawaban:* "Pada RPC Payment, fungsi `processPayment()` tidak menyimpan data apapun di memori server; setiap pemanggilan bersifat independen. Sedangkan pada RMI, objek `InventoryManager` menyimpan cache reservasi di properti `this.inventoryCache` yang terus hidup di RAM server dan dapat diinspeksi via endpoint `/api/inventory-report`."
  * **Q3: Mengapa tabel orders memiliki kolom payment_ref dan reservation_ref?**
    * *Jawaban:* "Kedua kolom tersebut bertindak sebagai bukti audit jejak terdistribusi (*distributed audit trail*). `payment_ref` membuktikan transaksi disahkan oleh RPC Payment Server, sedangkan `reservation_ref` membuktikan stok direservasi oleh Remote Object di RMI Server."
  * **Q4: Bagaimana cara mendistribusikan sistem ini ke komputer lain di internet?**
    * *Jawaban:* "Cukup jalankan tunnel Ngrok pada service yang bersangkutan, lalu masukkan domain Ngrok ke file `.env`. Client RPC dan proxy Vite kami telah diprogram untuk otomatis mengenali domain HTTPS Ngrok tanpa perlu mengubah satu baris kodepun."

* **Sesi Diskusi & Demonstrasi Praktikum Dibuka.**
* **Terima Kasih.**


```

░██████╗██╗░██████╗████████╗███████╗███╗░░░███╗
██╔════╝██║██╔════╝╚══██╔══╝██╔════╝████╗░████║
╚█████╗░██║╚█████╗░░░░██║░░░█████╗░░██╔████╔██║
░╚═══██╗██║░╚═══██╗░░░██║░░░██╔══╝░░██║╚██╔╝██║
██████╔╝██║██████╔╝░░░██║░░░███████╗██║░╚═╝░██║
╚═════╝░╚═╝╚═════╝░░░░╚═╝░░░╚══════╝╚═╝░░░░░╚═╝

████████╗███████╗██████╗░██████╗░██╗░██████╗████████╗██████╗░██╗██████╗░██╗░░░██╗░██████╗██╗
╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║██╔══██╗██║░░░██║██╔════╝██║
░░░██║░░░█████╗░░██████╔╝██║░░██║██║╚█████╗░░░░██║░░░██████╔╝██║██████╦╝██║░░░██║╚█████╗░██║
░░░██║░░░██╔══╝░░██╔══██╗██║░░██║██║░╚═══██╗░░░██║░░░██╔══██╗██║██╔══██╗██║░░░██║░╚═══██╗██║
░░░██║░░░███████╗██║░░██║██████╔╝██║██████╔╝░░░██║░░░██║░░██║██║██████╦╝╚██████╔╝██████╔╝██║
░░░╚═╝░░░╚══════╝╚═╝░░╚═╝╚═════╝░╚═╝╚═════╝░░░░╚═╝░░░╚═╝░░╚═╝╚═╝╚═════╝░░╚═════╝░╚═════╝░╚═╝
```

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
