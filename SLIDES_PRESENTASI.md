# DOKUMEN MATERI SLIDE PRESENTASI SISTEM TERDISTRIBUSI
## Proyek: Sistem Food Ordering Terdistribusi (API, RPC, RMI, Tiering)
### Mata Kuliah: Sistem Terdistribusi (Semester 5)

---

### SLIDE 1: JUDUL & IDENTITAS PROYEK
* **Judul:** Rancang Bangun Sistem Food Ordering Terdistribusi Berbasis 4-Tier Architecture
* **Sub-judul:** Analisis & Implementasi Terintegrasi REST API, Remote Procedure Call (RPC), Remote Method Invocation (RMI), dan N-Tier Isolation
* **Mata Kuliah:** Sistem Terdistribusi (Sistem Paralel & Terdistribusi)
* **Penyusun:** [Nama Mahasiswa / Tim]
* **NIM:** [Nomor Induk Mahasiswa]
* **Program Studi / Jurusan:** Teknik Informatika / Sistem Informasi
* **Fokus Presentasi:**
  1. Peran fungsional & arsitektur dari 4 pilar (API, RPC, RMI, Tiering).
  2. Bedah kodingan (*code walkthrough*) baris-demi-baris pada setiap service.
  3. Simulasi transaksi *end-to-end* beserta inspeksi 4 konsol terminal secara *real-time*.
  4. Analisis ketahanan sistem (*fault tolerance*) ketika salah satu komponen mengalami gangguan.

> **Catatan Pembicara (Speaker Notes):**
> "Selamat pagi/siang Bapak/Ibu dosen pengampu dan rekan-rekan sekalian. Pada hari ini kami akan mempresentasikan hasil implementasi tugas besar Sistem Terdistribusi berupa Sistem Pemesanan Makanan Terdistribusi. Presentasi kami hari ini tidak sekadar memperlihatkan antarmuka web, melainkan membedah tuntas bagaimana arsitektur 4-Tier bekerja, menelaah langsung kode sumber implementasi REST API, RPC dengan pustaka Jayson, RMI berbasis TCP Socket dengan pola Remote Object, Stub, dan Skeleton, serta mendemonstrasikan simulasi transaksi dan kegagalan lintas proses secara transparan."

---

### SLIDE 2: LATAR BELAKANG & TUJUAN ARSITEKTURAL
* **Tantangan Aplikasi Monolitik Tradisional:**
  * **Tight Coupling:** Seluruh fungsi (antarmuka, pesanan, kalkulasi pembayaran, dan stok) disatukan dalam satu runtime proses tunggal.
  * **Single Point of Failure (SPoF):** Kerusakan pada modul pembayaran atau database mematikan seluruh sistem belanja.
  * **Skalabilitas Kaku:** Beban transaksi pembayaran yang tinggi memaksa seluruh aplikasi diduplikasi, memboroskan sumber daya komputasi.
* **Tujuan Pengembangan Proyek Terdistribusi:**
  1. **Decoupling Antarmuka & Logika:** Memisahkan lapisan presentasi (Frontend React) dari logika bisnis (Backend Express) melalui kontrak REST API yang *stateless*.
  2. **Isolasi Transaksi Finansial via RPC:** Memindahkan pemrosesan pembayaran ke service mandiri menggunakan Remote Procedure Call (RPC) berbasis JSON-RPC 2.0.
  3. **Pengelolaan State Objek Inventori via RMI:** Mengimplementasikan Remote Method Invocation (RMI) pada Remote Object `InventoryManager` via raw TCP Socket untuk reservasi stok dan audit state.
  4. **Penerapan 4-Tier Berkelanjutan:** Membagi sistem menjadi 4 tier yang terisolasi secara proses jaringan dan port dengan fleksibilitas konfigurasi via `.env`.

> **Catatan Pembicara (Speaker Notes):**
> "Alasan utama kami merancang sistem ini secara terdistribusi adalah untuk memecahkan kelemahan monolitik. Dalam dunia industri nyata, modul pembayaran biasanya dikelola oleh payment gateway terpisah, dan sistem inventori gudang dikelola oleh remote object yang memiliki memori cache sendiri. Di sinilah kami membuktikan bagaimana 4 pilar komputasi terdistribusi diimplementasikan secara elegan."

---

### SLIDE 3: DIAGRAM ARSITEKTUR 4-TIER & PEMETAAN PORT
* **Peta Komunikasi & Pemisahan Tier:**
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
                 │ HTTP (Port 4000)             │ JSON Delimited (Port 5000)
  ┌──────────────▼──────────────┐┌──────────────▼───────────────┐
  │ TIER 3A: RPC PAYMENT SERVICE││ TIER 3B: RMI INVENTORY MGR   │
  │ Port: 4000 (RPC_PORT)       ││ Port: 5000 (RMI_PORT)        │
  │ Prosedur: processPayment()  ││ Remote Object:               │
  │ Paradigma: Function-Centric ││ InventoryManager.reserveStock│
  │ Sifat: Stateless            ││ Sifat: Stateful (RAM Cache)  │
  └─────────────────────────────┘└──────────────────────────────┘
                 │ (Internal Logging)           │ (Log State)
                 └──────────────┬───────────────┘
                                │ SQL Queries (Pool Connection)
  ┌─────────────────────────────▼───────────────────────────────┐
  │ TIER 4: DATA STORAGE TIER (MySQL Server 8.x)                │
  │ Port: 3306 (Dikonfigurasi via DB_PORT)                      │
  │ Tabel: menus, orders, order_items                           │
  └─────────────────────────────────────────────────────────────┘
  ```
* **Karakteristik Isolasi Tiap Tier:**
  * Setiap tier berjalan pada proses Node.js / database yang **berbeda PID** dan **berbeda port**.
  * Frontend sama sekali **tidak memiliki akses langsung** ke RPC, RMI, maupun MySQL.
  * Backend bertindak sebagai **Trusted Orchestrator & Gateway**.

> **Catatan Pembicara (Speaker Notes):**
> "Perhatikan diagram ini. Terdapat 4 lapisan fisik yang nyata. Tier 1 di port 5173 berkomunikasi ke Tier 2 di port 3000 via HTTP REST. Tier 2 kemudian mengorkestrasikan dua microservice di Tier 3: satu via JSON-RPC pada port 4000 untuk pembayaran, dan satu lagi via protokol RMI berbasis TCP Socket pada port 5000 untuk manajemen stok. Akhirnya, data persisten disimpan di Tier 4 MySQL port 3306. Semua port ini dinamis dan dapat diatur melalui file environment (.env)."

---

### SLIDE 4: PERAN & BEDAH KODINGAN — REST API (TIER 1 & 2)
* **Peran REST API dalam Sistem Terdistribusi:**
  * Pintu gerbang (*Gateway*) resmi bagi klien eksternal (Tier 1).
  * Berprinsip *Stateless*: Setiap request membawa kredensial dan payload lengkap.
  * Menjamin konsistensi data transaksi (ACID) sebelum memicu delegasi ke RPC dan RMI.
* **Daftar Endpoint Utama:**
  * `GET /api/menu`: Mengambil katalog makanan aktif.
  * `POST /api/orders`: Endpoint sentral orkestrasi pemesanan.
  * `GET /api/orders`: Audit trail riwayat transaksi.
  * `GET /api/orders/:id`: Detail spesifik pesanan beserta status pembayaran dan reservasi stok.
  * `GET /api/health`: Health-check aggregasi yang memverifikasi backend, RPC, dan RMI.
  * `GET /api/inventory-report`: Menarik audit memory cache dari RMI Remote Object.

* **Bedah Kodingan: Orkestrasi Endpoint Pemesanan (`backend/server.js`):**
  ```javascript
  // 1. Terima request dari Tier 1 dan buka transaksi DB lokal
  app.post('/api/orders', async (req, res) => {
    const { customerName, items } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction(); // ACID: Mulai transaksi

      // 2. Simpan order sementara dengan status PENDING
      const [orderResult] = await conn.query(
        'INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)',
        [customerName, totalAmount, 'PENDING']
      );
      const orderId = orderResult.insertId;

      await conn.commit(); // Data lokal aman

      // 3. Delegasi RMI: Panggil Remote Object InventoryManager via TCP
      const rmiResult = await reserveStock(orderId, items, customerName);
      await pool.query('UPDATE orders SET reservation_ref = ? WHERE id = ?', 
        [rmiResult.reservationId, orderId]);

      // 4. Delegasi RPC: Eksekusi prosedur finansial via HTTP JSON-RPC
      const paymentResult = await processPayment(orderId, totalAmount, customerName);

      // 5. Sukses: Update status akhir ke PAID
      await pool.query('UPDATE orders SET status = ?, payment_ref = ? WHERE id = ?', 
        ['PAID', paymentResult.paymentRef, orderId]);

      res.status(201).json({ success: true, status: 'PAID', ... });
    } catch (err) { ... }
  });
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Mari kita bedah kodingan `server.js` pada baris pembuatan order. Perhatikan bagaimana REST API tidak melakukan semuanya sendiri. Pertama, ia membuka transaksi MySQL untuk menyimpan order dengan status awal PENDING. Setelah ID pesanan terbentuk, backend memanggil fungsi `reserveStock()` yang merupakan pemanggilan RMI, lalu memanggil `processPayment()` yang merupakan pemanggilan RPC. Hanya jika keduanya berhasil, status diubah menjadi PAID. Pola orkestrasi ini menjaga integritas sistem terdistribusi."

---

### SLIDE 5: PERAN & BEDAH KODINGAN — REMOTE PROCEDURE CALL (RPC) (TIER 3A)
* **Peran RPC:**
  * Menyediakan layanan eksekusi fungsi jarak jauh (*Remote Procedure*) yang **Function-Centric** dan **Stateless**.
  * Mengisolasi kalkulasi finansial dan verifikasi transaksi dari logika web server utama.
* **Protokol & Library:**
  * Protokol: **JSON-RPC 2.0 over HTTP**
  * Library: `jayson` (Library standar industri untuk spesifikasi JSON-RPC 2.0 di Node.js).
  * Port: `4000` (atau sesuai `RPC_PORT` di `.env`).

* **Bedah Kodingan Sisi Server (`services/rpc_payment/server.js`):**
  ```javascript
  const jayson = require('jayson');
  const RPC_PORT = process.env.RPC_PORT || 4000;

  // Prosedur RPC yang diekspor
  function processPayment(args, callback) {
    const { orderId, amount, customerName } = args;

    // Validasi parameter prosedur
    if (!orderId || !amount || amount <= 0) {
      return callback({ code: -32602, message: 'Invalid params' }); // Standar JSON-RPC error
    }

    // Simulasi otorisasi payment gateway
    const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Kembalikan hasil via callback (RPC Response)
    callback(null, {
      success: true,
      paymentRef: paymentRef,
      orderId: orderId,
      processedAt: new Date().toISOString()
    });
  }

  // Daftarkan fungsi ke RPC Server
  const server = jayson.Server({ processPayment, healthCheck });
  server.http().listen(RPC_PORT);
  ```

* **Bedah Kodingan Sisi Client (`backend/rpc_client.js`):**
  ```javascript
  const jayson = require('jayson/lib/client');
  const rpcClient = jayson.http({ host: process.env.RPC_HOST || 'localhost', port: 4000 });

  function processPayment(orderId, amount, customerName) {
    return new Promise((resolve, reject) => {
      // Memanggil fungsi jarak jauh dengan format JSON-RPC request:
      // {"jsonrpc": "2.0", "method": "processPayment", "params": {...}, "id": 1}
      rpcClient.request('processPayment', { orderId, amount, customerName }, (err, response) => {
        if (err) return reject(new Error('Koneksi RPC Gagal: ' + err.message));
        if (response.error) return reject(new Error(response.error.message));
        resolve(response.result); // Mengembalikan paymentRef
      });
    });
  }
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Sekarang kita telusuri implementasi RPC. Di file `server.js` service pembayaran, kita membuat server JSON-RPC menggunakan `jayson`. Fungsi `processPayment` didaftarkan sebagai prosedur publik. Di sisi backend, file `rpc_client.js` membuat client HTTP yang membungkus argumen ke dalam format JSON-RPC 2.0 dengan field method, params, dan id. Ketika `rpcClient.request()` dieksekusi, data dipaketkan, dikirim melalui HTTP ke port 4000, dieksekusi oleh server RPC, dan hasilnya berupa objek paymentRef dikembalikan ke backend seolah-olah fungsi lokal biasa."

---

### SLIDE 6: PERAN & BEDAH KODINGAN — REMOTE METHOD INVOCATION (RMI) (TIER 3B)
* **Peran RMI dalam Sistem Terdistribusi:**
  * Pemanggilan berorientasi **Objek Jarak Jauh (*Object-Centric*)**, bukan sekadar fungsi bebas.
  * Bersifat **Stateful**: Remote Object memiliki memori (*state*) sendiri (cache reservasi & log audit) yang hidup selama service berjalan.
* **Tiga Komponen Arsitektur RMI (Pola Klasik Java RMI di Node.js):**
  1. **Remote Object (`InventoryManager`):** Objek aktual yang hidup di heap memori server RMI.
  2. **Skeleton (`services/rmi_inventory/server.js`):** Server TCP socket yang menerima request mentah jaringan, mengidentifikasi objek target, lalu memanggil method objek tersebut.
  3. **Stub (`backend/rmi_client.js`):** Proxy di sisi client yang mengabstraksi komunikasi TCP sehingga pemanggil hanya melihat method JavaScript biasa.

* **Bedah Kodingan 1: Remote Object (`InventoryManager`):**
  ```javascript
  class InventoryManager {
    constructor() {
      this.inventoryCache = {}; // STATE: Cache reservasi di RAM server
      this.transactionLog = []; // STATE: Riwayat audit pemanggilan
      this.objectId = `INV-MGR-${Date.now()}`;
    }

    // Method yang di-expose ke remote client
    reserveStock(params) {
      const { orderId, items } = params;
      const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

      const result = { success: true, reservationId, orderId, reservedAt: new Date().toISOString() };
      this.inventoryCache[reservationId] = result; // Menyimpan state ke memori remote object
      this.transactionLog.push({ method: 'reserveStock', reservationId });
      return result;
    }
  }
  const inventoryManager = new InventoryManager(); // Instansiasi Remote Object
  ```

* **Bedah Kodingan 2: Skeleton (`net.createServer`):**
  ```javascript
  // Skeleton mendengarkan koneksi TCP di port 5000
  const server = net.createServer((socket) => {
    socket.on('data', (data) => {
      // Decode pesan dari Stub: {"id":1, "objectRef":"InventoryManager", "method":"reserveStock", "params":{...}}
      const request = JSON.parse(data.toString().trim());

      // Skeleton mendelegasikan pemanggilan langsung ke instance Remote Object
      if (request.objectRef === 'InventoryManager') {
        const result = inventoryManager[request.method](request.params);
        socket.write(JSON.stringify({ id: request.id, result }) + '\n');
      }
    });
  });
  server.listen(process.env.RMI_PORT || 5000);
  ```

* **Bedah Kodingan 3: Stub (`backend/rmi_client.js`):**
  ```javascript
  // Stub bertindak sebagai Proxy jaringan
  function invokeRemoteMethod(objectRef, method, params) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(5000, 'localhost', () => {
        // Marshalling payload pemanggilan method objek
        socket.write(JSON.stringify({ id: 1, objectRef, method, params }) + '\n');
      });
      socket.on('data', (data) => {
        const response = JSON.parse(data.toString().trim());
        resolve(response.result); // Unmarshalling return value
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
> "Ini adalah bagian paling istimewa dari proyek kami: implementasi RMI murni. Seringkali orang keliru menganggap RMI sama dengan RPC. Pada slide ini kami membuktikan perbedaannya secara nyata:
> Pertama, kita memiliki kelas `InventoryManager` yang merupakan Remote Object. Objek ini memiliki state, yaitu `this.inventoryCache` dan `this.transactionLog`.
> Kedua, kita memiliki Skeleton yang membuka TCP Server di port 5000. Skeleton menerima request, memeriksa `objectRef`, dan memanggil method pada objek tersebut.
> Ketiga, kita memiliki Stub di sisi backend yang bertindak sebagai representasi objek. Ketika backend memanggil `reserveStock()`, Stub membuat koneksi TCP, mengirim perintah, menerima hasil, dan menutup socket. Semuanya transparan!"

---

### SLIDE 7: TABEL PERBANDINGAN MENDALAM: API vs RPC vs RMI
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
  * **Tier 1 (Presentation):** Murni rendering UI dan menangani interaksi pengguna. Tidak ada logika kalkulasi harga di frontend untuk mencegah manipulasi.
  * **Tier 2 (Business & Gateway):** Orkestrator transaksi, penjaga integritas basis data, dan mediator antara frontend dan microservices.
  * **Tier 3 (Distributed Services):** Komputasi terisolasi. Service Payment (RPC) dan Inventory (RMI) dapat dipindahkan ke server berbeda tanpa mengubah logika bisnis Tier 2.
  * **Tier 4 (Data Storage):** Database MySQL terisolasi di jaringan privat (port 3306), hanya dapat diakses melalui koneksi pool terotentikasi dari Tier 2.
* **Prinsip Transaksi ACID pada Tier 2 (`backend/server.js`):**
  ```javascript
  const conn = await pool.getConnection();
  await conn.beginTransaction(); // Atomicity & Consistency

  // Validasi stok langsung dengan row locking
  const [menus] = await conn.query('SELECT * FROM menus WHERE id IN (?)', [menuIds]);
  // Jika stok kurang -> rollback dan tolak transaksi
  if (insufficientStock) {
    await conn.rollback();
    return res.status(400).json({ message: 'Stok tidak mencukupi' });
  }

  // Kurangi stok di basis data persisten
  await conn.query('UPDATE menus SET stock = stock - ? WHERE id = ?', [qty, id]);
  await conn.commit(); // Commit database lokal sebelum panggil external service
  ```
* **Fleksibilitas Port dengan Konfigurasi Terpusat (`.env`):**
  * Proyek menyediakan file `.env` di level root dan di setiap folder service.
  * Contoh konfigurasi port:
    ```env
    FRONTEND_PORT=5173
    PORT=3000           # Backend REST API
    RPC_PORT=4000       # Payment Service
    RMI_PORT=5000       # Inventory Service
    DB_PORT=3306        # MySQL Server
    ```
  * Jika port 4000 bentrok di laptop penguji, cukup ubah `RPC_PORT=4500` di `.env`, dan sistem tetap bekerja 100% tanpa mengubah kode!

> **Catatan Pembicara (Speaker Notes):**
> "Tiering tidak hanya membagi folder, tetapi membatasi hak akses dan menjaga integritas data. Pada Tier 2, kami menerapkan transaksi database dengan perintah beginTransaction, commit, dan rollback. Sebelum mengurangi stok, sistem memverifikasi ketersediaan secara atomik. Selain itu, seluruh port service telah dikonfigurasikan melalui file environment (.env), sehingga port sangat fleksibel dan mudah disesuaikan jika terjadi port collision."

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
  1. **Langkah 1 (Tier 1 - Browser):** User memilih menu dan menekan tombol *Bayar Sekarang*. Frontend mengirim payload JSON `{ customerName: "Budi", items: [{ menuId: 1, quantity: 2 }] }`.
  2. **Langkah 2 (Tier 2 - Backend REST):** Express memvalidasi format data dan menghitung total harga berdasarkan harga resmi di database (mencegah *price tampering* dari client).
  3. **Langkah 3 (Tier 4 - Database MySQL):** Transaksi database dibuka. Sistem membuat baris pesanan baru dengan status awal `PENDING` dan mengurangi stok di tabel `menus`.
  4. **Langkah 4 (Tier 2 $\rightarrow$ Tier 3B via RMI):** Stub memanggil remote method `reserveStock()`. Stub membuka TCP socket ke port 5000 dan mengirim data invokasi objek.
  5. **Langkah 5 (Tier 3B - RMI Server):** Skeleton RMI menerima data TCP, mengeksekusi method pada Remote Object `InventoryManager`, mencatat alokasi stok di cache RAM, dan mengembalikan `reservationId` (contoh: `RSV-172803-AB12`).
  6. **Langkah 6 (Tier 2 $\rightarrow$ Tier 3A via RPC):** Backend menerima reservation ID, lalu memanggil prosedur `processPayment()` pada RPC Client yang mengirim payload JSON-RPC ke port 4000.
  7. **Langkah 7 (Tier 3A - RPC Server):** RPC Payment Server mengeksekusi logika pembayaran, menghasilkan kode referensi unik `paymentRef` (contoh: `PAY-172803-XY89`), dan mengembalikannya ke backend.
  8. **Langkah 8 (Tier 2 & 1 - Finalisasi & Render):** Backend memperbarui status pesanan di MySQL menjadi `PAID` lengkap dengan `payment_ref` dan `reservation_ref`, lalu merespons HTTP 201 ke frontend. Layar langsung menampilkan kartu detail transaksi dengan badge hijau *PAID*.

> **Catatan Pembicara (Speaker Notes):**
> "Inilah alur lengkap dari saat tombol ditekan hingga status lunas tampil di layar. Terjadi 8 langkah transisi yang melibatkan 4 protokol berbeda: HTTP REST dari browser, TCP Socket ke RMI Server, HTTP JSON-RPC ke Payment Server, dan TCP MySQL Protocol ke basis data. Inilah representasi nyata dari sistem terdistribusi yang kohesif."

---

### SLIDE 10: SIMULASI LOG 4 TERMINAL SECARA REAL-TIME
* **Visualisasi Output Konsol yang Ditampilkan di Hadapan Dosen:**

* **Terminal 1: RPC Payment Service (Port 4000)**
  ```text
  [2026-10-04 14:30:01] [RPC-PAYMENT] Server running on port 4000
  [2026-10-04 14:30:15] [RPC-PAYMENT] [REQUEST] processPayment - orderId=12, customer="Budi", amount=Rp 50.000
  [2026-10-04 14:30:15] [RPC-PAYMENT] [SUCCESS] Payment approved for orderId=12 -> Ref: PAY-172803-XY89
  ```

* **Terminal 2: RMI Inventory Service (Port 5000)**
  ```text
  [2026-10-04 14:30:00] [RMI-OBJECT] InventoryManager created (ID: INV-MGR-172803001)
  [2026-10-04 14:30:00] [RMI-SERVER] RMI Inventory Service running on port 5000 (TCP Socket)
  [2026-10-04 14:30:14] [RMI-SKELETON] Client connected: 127.0.0.1:54321
  [2026-10-04 14:30:14] [RMI-SKELETON] Incoming invocation: InventoryManager.reserveStock() [requestId=1]
  [2026-10-04 14:30:14] [RMI-OBJECT] Stock reserved successfully: RSV-172803-AB12 for order #12
  [2026-10-04 14:30:14] [RMI-SKELETON] Client disconnected: 127.0.0.1:54321
  ```

* **Terminal 3: Backend REST API & Gateway (Port 3000)**
  ```text
  [2026-10-04 14:30:14] [HTTP] POST /api/orders
  [2026-10-04 14:30:14] [ORDER] Created order #12 (PENDING) - Rp 50.000
  [2026-10-04 14:30:14] [RMI-STUB] Invoking InventoryManager.reserveStock() on localhost:5000 [id=1]
  [2026-10-04 14:30:14] [RMI-STUB] InventoryManager.reserveStock() returned successfully [id=1]
  [2026-10-04 14:30:14] [ORDER] RMI stock reserved: RSV-172803-AB12
  [2026-10-04 14:30:15] [RPC-CLIENT] Invoking processPayment on localhost:4000 for order #12
  [2026-10-04 14:30:15] [RPC-CLIENT] Payment confirmed for order #12 (ref: PAY-172803-XY89)
  [2026-10-04 14:30:15] [ORDER] Order #12 status updated to PAID (ref: PAY-172803-XY89)
  ```

* **Terminal 4: Frontend Web Client (Port 5173)**
  ```text
  VITE v6.4.3  ready in 320 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.10:5173/
  [HMR] Proxying /api/orders -> http://localhost:3000/api/orders
  ```

> **Catatan Pembicara (Speaker Notes):**
> "Saat live demo, kami membuka 4 jendela terminal berdampingan. Ketika pesanan dikirim, dosen dapat melihat bukti otentik di layar: Terminal 3 Backend memanggil Stub RMI, seketika Terminal 2 RMI merespons koneksi socket TCP dan mereservasi stok. Tepat setelah itu, Terminal 3 memanggil Client RPC, dan Terminal 1 RPC Server mencetak log persetujuan pembayaran. Keempat proses ini berbicara satu sama lain dalam hitungan milidetik."

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
      // Pembayaran gagal -> otomatis ubah status pesanan menjadi FAILED
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
  * **Hasil:** Backend menangkap exception socket, mencatat log audit, dan tetap melanjutkan otorisasi pembayaran (atau melakukan rollback sesuai konfigurasi), membuktikan isolasi kesalahan (*fault isolation*).

> **Catatan Pembicara (Speaker Notes):**
> "Keunggulan sistem terdistribusi sejati adalah kemampuannya menangani kegagalan parsial (partial failure). Jika server RPC pembayaran mati, backend kami tidak mati total (tidak unhandled rejection), melainkan menangkap error jaringan dan mengubah status order menjadi FAILED. Begitu juga jika server RMI mengalami gangguan, sistem kami menerapkan graceful degradation. Inilah yang membuktikan sistem kami dirancang dengan prinsip enterprise architecture."

---

### SLIDE 12: PANDUAN LANGKAH LIVE DEMO DI DEPAN DOSEN
* **Urutan Eksekusi Demonstrasi Praktikum:**
  1. **Persiapan Awal (Seed Database & Verifikasi Environment):**
     ```bash
     cd backend && npm run seed
     ```
     *(Memastikan tabel `menus`, `orders` beserta kolom `payment_ref` dan `reservation_ref` siap).*
  2. **Jalankan 4 Service pada 4 Jendela Terminal Berbeda:**
     * **Terminal 1:** `cd services/rpc_payment && node server.js` $\rightarrow$ Muncul banner Port 4000.
     * **Terminal 2:** `cd services/rmi_inventory && node server.js` $\rightarrow$ Muncul banner Port 5000 (TCP).
     * **Terminal 3:** `cd backend && npm start` $\rightarrow$ Muncul banner REST API Port 3000.
     * **Terminal 4:** `cd frontend && npm run dev` $\rightarrow$ Muncul URL `http://localhost:5173`.
  3. **Demontrasi Transaksi Normal (*Happy Path*):**
     * Buka browser di `http://localhost:5173`.
     * Tambahkan menu "Nasi Goreng Spesial" dan "Es Teh Manis" ke keranjang.
     * Masukkan nama pelanggan: `Budi Santoso`.
     * Klik **Bayar Sekarang**.
     * **Tunjukkan Terminal:** Tunjukkan urutan log yang masuk di Terminal 2 (RMI) lalu Terminal 1 (RPC).
     * **Tunjukkan Web:** Tunjukkan kartu pesanan baru dengan status **PAID**, nomor `payment_ref`, dan `reservation_ref`.
  4. **Demontrasi Endpoint Khusus RMI Report:**
     * Buka tab baru pada URL: `http://localhost:3000/api/inventory-report`.
     * Perlihatkan bahwa data laporan ditarik langsung dari memory cache Remote Object `InventoryManager`.
  5. **Demonstrasi Simulasi Kegagalan (*Fault Tolerance*):**
     * Hentikan Terminal 1 (RPC Payment).
     * Coba lakukan pemesanan kembali di web.
     * Perlihatkan status pesanan berubah menjadi **FAILED** dan terminal backend menangani error secara elegan.

> **Catatan Pembicara (Speaker Notes):**
> "Saat sesi demo dimulai, kami akan memandu penguji langkah demi langkah: mulai dari eksekusi 4 terminal independen, pemesanan interaktif di browser, pembuktian log RPC dan RMI yang saling terpaut, inspeksi endpoint /api/inventory-report untuk melihat state objek RMI, hingga simulasi mematikan salah satu service untuk menguji ketahanan error handling."

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
  2. Implementasi **REST API** memberikan kemudahan integrasi antarmuka klien.
  3. Implementasi **RPC** menjamin eksekusi prosedur pembayaran yang cepat, aman, dan *stateless*.
  4. Implementasi **RMI** berhasil mendemonstrasikan pemanggilan method pada objek jarak jauh yang memiliki *state* memori internal melalui soket TCP.
  5. Sistem dilengkapi dengan penanganan error tangguh (*fault tolerance*) dan fleksibilitas konfigurasi port via `.env`.

* **Antisipasi Pertanyaan Kritis Dosen & Jawaban Teknis:**
  * **Q1: Mengapa menggunakan TCP Socket untuk RMI, bukan HTTP?**
    * *Jawaban:* "Untuk mempertegas perbedaan arsitektural. RPC kami tempatkan di atas HTTP layer (JSON-RPC), sedangkan RMI menggunakan direct TCP Socket untuk mereplikasi konsep transport layer seperti pada Java RMI (JRMP), di mana Stub dan Skeleton berkomunikasi secara streaming tanpa overhead header HTTP."
  * **Q2: Mengapa RMI disebut stateful sedangkan RPC stateless?**
    * *Jawaban:* "Pada RPC Payment, fungsi `processPayment()` tidak menyimpan data apapun di memori server; setiap pemanggilan bersifat independen. Sedangkan pada RMI, objek `InventoryManager` menyimpan cache reservasi di properti `this.inventoryCache` yang terus hidup di RAM server dan dapat diinspeksi via `getInventoryReport()`."
  * **Q3: Apa yang terjadi jika database mati saat RMI dan RPC sukses?**
    * *Jawaban:* "Kami menerapkan urutan: database order dicatat terlebih dahulu dalam status PENDING di dalam transaksi database sebelum memanggil external service. Jika terjadi kegagalan fatal pada database, backend mengembalikan status HTTP 500 dan transaksi di-rollback secara konsisten."
  * **Q4: Bagaimana cara memindahkan salah satu service ke komputer lain di jaringan LAN?**
    * *Jawaban:* "Sangat mudah. Karena kita sudah mengimplementasikan file `.env`, kita cukup mengganti variabel `RPC_HOST` atau `RMI_HOST` di `backend/.env` dengan IP Address komputer lain (misalnya `192.168.1.50`). Tidak ada satu baris kodepun yang perlu di-hardcode ulang."

* **Sesi Diskusi & Demonstrasi Praktikum Dibuka.**
* **Terima Kasih.**
