# DOKUMEN MATERI SLIDE PRESENTASI SISTEM TERDISTRIBUSI
## Proyek: Sistem Food Ordering Terdistribusi (API, RPC, RPA, Tiering)
Mata Kuliah: Sistem Terdistribusi (Semester 5)

---

### SLIDE 1: JUDUL & IDENTITAS PROYEK
* **Judul:** Rancang Bangun Sistem Food Ordering Terdistribusi Berbasis 4-Tier Architecture
* **Sub-judul:** Implementasi Terintegrasi REST API, Remote Procedure Call (RPC), Robotic Process Automation (RPA), dan Tiering Terisolasi
* **Mata Kuliah:** Sistem Terdistribusi (Sistem Paralel & Terdistribusi)
* **Penyusun:** [Nama Mahasiswa / Tim]
* **NIM:** [Nomor Induk Mahasiswa]
* **Program Studi / Jurusan:** Teknik Informatika / Sistem Informasi

> **Catatan Pembicara (Speaker Notes):**
> "Selamat pagi/siang Bapak/Ibu dosen dan rekan-rekan sekalian. Pada kesempatan kali ini, kami mempresentasikan tugas besar Sistem Terdistribusi berupa Sistem Pemesanan Makanan (Food Ordering System). Sistem ini dirancang secara khusus untuk memenuhi empat pilar utama komputasi terdistribusi: REST API, Remote Procedure Call (RPC), Robotic Process Automation (RPA), dan N-Tier Architecture yang terisolasi secara proses."

---

### SLIDE 2: LATAR BELAKANG & TUJUAN ARSITEKTUR
* **Mengapa Sistem Terdistribusi?**
  * Aplikasi monolitik tradisional menggabungkan katalog, pembayaran, dan pemrosesan pesanan dalam satu proses tunggal (*single point of failure*).
  * Sistem modern membutuhkan pemisahan fungsi (*decoupling*) agar setiap layanan dapat berskala (*scalable*), mudah dirawat, dan tahan terhadap gangguan parsial (*fault tolerance*).
* **Tujuan Pengembangan Proyek:**
  1. Memisahkan antarmuka pengguna (*Frontend*) dengan inti logika (*Backend*) melalui REST API.
  2. Mengimplementasikan komunikasi antar-layanan berkinerja tinggi menggunakan Remote Procedure Call (RPC) untuk transaksi finansial.
  3. Mengotomatiskan tugas back-office repetitif menggunakan Robotic Process Automation (RPA) tanpa campur tangan operator manusia.
  4. Menerapkan arsitektur 4-Tier terpisah di mana masing-masing lapisan berjalan di port dan proses independen.

> **Catatan Pembicara (Speaker Notes):**
> "Tujuan utama kami bukan sekadar membuat aplikasi belanja makanan biasa, melainkan membuktikan secara praktis bagaimana komponen-komponen terdistribusi saling berkomunikasi lintas proses dan jaringan untuk menyelesaikan sebuah transaksi secara atomik dan konsisten."

---

### SLIDE 3: DIAGRAM ARSITEKTUR SISTEM (4-TIER ARCHITECTURE)
* **Struktur Lapisan (Tiers):**
  * **Tier 1: Presentation Tier (Client Web)**
    * Port: `5173` | Teknologi: React (Vite)
    * Fungsi: Menampilkan katalog, formulir pesanan, dan monitoring status live.
  * **Tier 2: Business Logic / Application Tier (API Gateway)**
    * Port: `3000` | Teknologi: Node.js, Express.js
    * Fungsi: Manajemen transaksi, validasi pesanan, orchestrator antar-layanan.
  * **Tier 3: Distributed Services Tier (Worker & Microservices)**
    * **RPC Payment Service (Port `4000`):** Service JSON-RPC 2.0 untuk verifikasi pembayaran.
    * **RPA Worker Bot (Background Daemon):** Proses otomatis cetak invoice digital dan pencatatan audit spreadsheet.
  * **Tier 4: Data Tier (Database)**
    * Port: `3306` | Teknologi: MySQL Server
    * Fungsi: Penyimpanan persisten untuk entitas menu, pesanan, dan item pesanan.

> **Catatan Pembicara (Speaker Notes):**
> "Bisa kita lihat pada diagram, sistem ini tidak monolitik. Masing-masing tier memiliki isolasi fungsi dan batasan jaringan sendiri. Tier 1 berkomunikasi ke Tier 2 via HTTP REST, Tier 2 memanggil Tier 3 via JSON-RPC, dan RPA Bot memantau Tier 4 secara berkala untuk mengeksekusi tugas otomatisnya."

---

### SLIDE 4: PILAR 1 — IMPLEMENTASI REST API
* **Karakteristik & Protokol:**
  * Protokol: HTTP/1.1 dengan format pertukaran data JSON.
  * Bersifat *Stateless*: Setiap request membawa konteks lengkap tanpa bergantung pada session memori server.
* **Daftar Endpoint Utama:**
  * `GET /api/menu`: Mengambil daftar menu aktif dan ketersediaan stok dari basis data.
  * `POST /api/orders`: Endpoint transaksional untuk membuat pesanan baru dan memicu pembayaran.
  * `GET /api/orders`: Mengambil seluruh riwayat transaksi untuk monitoring audit.
  * `GET /api/orders/:id`: Mengambil detail pesanan tertentu beserta relasi itemnya.
  * `GET /api/health`: Health-check endpoint untuk memantau status aktif backend dan service terdistribusi.
* **Peran dalam Sistem Terdistribusi:**
  * Bertindak sebagai pintu gerbang (*gateway*) bagi klien eksternal sebelum menjangkau logika bisnis dan database internal.

> **Catatan Pembicara (Speaker Notes):**
> "REST API digunakan pada tier presentasi karena sifatnya yang universal, berbasis standar HTTP, serta mudah dikonsumsi oleh antarmuka modern. Backend Express bertindak sebagai orkestrator yang mengamankan komunikasi langsung ke database."

---

### SLIDE 5: PILAR 2 — REMOTE PROCEDURE CALL (RPC)
* **Konsep Dasar RPC:**
  * Memungkinkan sebuah program memanggil subrutin/fungsi yang berada di ruang memori atau mesin fisik berbeda, seolah-olah memanggil fungsi lokal (*transparent execution*).
* **Spesifikasi Implementasi:**
  * Protokol: **JSON-RPC 2.0 over HTTP**
  * Pustaka: `jayson` (standar industri untuk JSON-RPC pada Node.js)
  * Server RPC: `services/rpc_payment/server.js` (berjalan di port `4000`)
  * Client RPC: `backend/rpc_client.js` (dipanggil oleh backend di port `3000`)
* **Prosedur yang Terdaftar:**
  * `processPayment(orderId, amount, customerName)`:
    * Menerima parameter transaksi finansial.
    * Memvalidasi kelayakan jumlah dan identitas pesanan.
    * Menghasilkan token referensi unik pembayaran (`PAY-timestamp-hash`).
  * `healthCheck()`: Memverifikasi waktu aktif (*uptime*) service pembayaran.
* **Perbedaan dengan REST API:**
  * RPC berfokus pada *action/operation-driven* (menjalankan perintah komputasi `processPayment`), sedangkan REST API berfokus pada manipulasi *resource-driven* (`/orders`).

> **Catatan Pembicara (Speaker Notes):**
> "Dalam skenario nyata, gateway pembayaran tidak boleh digabung ke server web umum. RPC menjamin pemisahan komputasi finansial yang cepat dan terenkapsulasi secara ketat. Ketika backend menerima order, ia tidak memproses uangnya sendiri, melainkan mendelegasikannya ke Payment RPC Server melalui jaringan."

---

### SLIDE 6: PILAR 3 — ROBOTIC PROCESS AUTOMATION (RPA)
* **Definisi RPA:**
  * Perangkat lunak otomatisasi yang meniru tindakan repetitif manusia dalam berinteraksi dengan sistem data dan file dokumen.
* **Arsitektur RPA Worker:**
  * Dijalankan sebagai **Daemon Mandiri** (`services/rpa_worker/bot.js`).
  * Polling berkala setiap 5000ms (5 detik) ke basis data MySQL.
* **Alur Tugas Otomatis (Autonomous Workflow):**
  1. **Deteksi Pesanan:** Bot mencari pesanan yang baru saja diverifikasi pembayarannya (status `PAID`).
  2. **Ekstraksi Data:** Mengambil detail item pesanan dan nama pelanggan secara otomatis.
  3. **Pembuatan Dokumen Digital:** Men-generate invoice digital (.txt) dengan nomor seri resmi di folder `output_invoices/`.
  4. **Pencatatan Rekapitulasi (Audit Trail):** Menambahkan baris transaksi ke file spreadsheet `rekap_harian.csv`.
  5. **Transisi Status:** Memperbarui status pesanan di basis data menjadi `COMPLETED` tanpa intervensi admin/kasir.

> **Catatan Pembicara (Speaker Notes):**
> "Ini adalah bagian RPA yang sangat penting. Setelah kasir atau user menyelesaikan pembayaran, tidak perlu ada admin yang manual mencetak invoice atau manual mencatat pembukuan ke Excel. Bot daemon yang berjalan di latar belakang akan langsung mengambil alih pekerjaan tersebut secara otomatis."

---

### SLIDE 7: PILAR 4 — TIERING & SEPARATION OF CONCERNS
* **Pembagian Tanggung Jawab Antar-Tier:**
  * **Presentation Tier:** Bebas dari business logic berat; hanya menangani UI/UX, validasi input dasar, dan rendering state.
  * **Business Logic Tier:** Menjaga integritas data (Database Transaction: `BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`), validasi stok, dan orkestrasi RPC.
  * **Distributed Services Tier:** Terisolasi dari client frontend. Mengurangi beban server utama dengan membagi tugas pemrosesan pembayaran dan otomasi dokumen ke proses yang berbeda.
  * **Data Tier:** Hanya dapat diakses oleh Backend dan RPA Worker, tidak terekspos langsung ke publik/browser.
* **Keuntungan Arsitektural:**
  * **Maintainability:** Komponen dapat di-update atau diperbaiki tanpa mematikan seluruh ekosistem aplikasi.
  * **Portability:** Masing-masing service dapat dipindahkan ke server virtual (VPS) atau container Docker yang berbeda.

> **Catatan Pembicara (Speaker Notes):**
> "Prinsip pemisahan tier ini membuktikan bahwa arsitektur sistem kami telah mengadopsi standar decoupling industri, di mana kegagalan pada satu service tidak serta-merta meruntuhkan service lainnya."

---

### SLIDE 8: DATA LIFECYCLE & DATABASE SCHEMA
* **Skema Tabel MySQL:**
  * `menus`: `id`, `name`, `description`, `price`, `category`, `stock`, `created_at`
  * `orders`: `id`, `customer_name`, `total_amount`, `status`, `payment_ref`, `created_at`, `updated_at`
  * `order_items`: `id`, `order_id` (FK), `menu_id` (FK), `quantity`, `subtotal`
* **Siklus Status Transaksi (Finite State Machine):**
  * `PENDING` $\rightarrow$ Pesanan dibuat di backend, stok diverifikasi dan dikurangi, menunggu otorisasi pembayaran.
  * `PAID` $\rightarrow$ RPC Payment Service berhasil mengeksekusi pembayaran dan mengembalikan token referensi (`payment_ref`).
  * `COMPLETED` $\rightarrow$ RPA Bot mendeteksi status `PAID`, mencetak invoice, mencatat ke CSV rekap, dan memfinalisasi pesanan.
  * `FAILED` $\rightarrow$ Opsi fallback jika RPC Payment Service menolak transaksi atau gateway simulasi mengalami kendala.

> **Catatan Pembicara (Speaker Notes):**
> "Lifecycle pesanan ini mengilustrasikan transisi yang terdistribusi: dibuat oleh API Tier, disahkan oleh RPC Service di Tier 3, dan difinalisasi oleh RPA Worker di Tier 3 hingga berakhir di Data Tier."

---

### SLIDE 9: SKENARIO DEMO PRESENTASI LANGSUNG (LIVE DEMO)
* **Kondisi Awal (Terminal Berjalan Berdampingan):**
  * Terminal 1: `node server.js` (Backend API - Port 3000)
  * Terminal 2: `node server.js` (RPC Payment Server - Port 4000)
  * Terminal 3: `node bot.js` (RPA Worker Daemon)
  * Terminal 4: `npm run dev` (Frontend React - Port 5173)
* **Langkah Uji Coba Langsung:**
  1. Buka browser pada `http://localhost:5173`.
  2. Pilih menu makanan, masukkan ke keranjang belanja.
  3. Masukkan nama pelanggan dan klik tombol **Bayar Sekarang**.
  4. **Perhatikan Terminal Backend & RPC:** Muncul log pemanggilan remote `[RPC-CLIENT]` dan respon sukses `[RPC-PAYMENT]`.
  5. **Perhatikan Terminal RPA:** Dalam hitungan detik, bot mendeteksi pesanan `PAID`, mencetak file ke `output_invoices/`, dan menambahkan entri ke `rekap_harian.csv`.
  6. **Perhatikan Halaman Status di Frontend:** Status pesanan langsung ter-update otomatis menjadi `COMPLETED (RPA)`.

> **Catatan Pembicara (Speaker Notes):**
> "Bapak/Ibu dosen dapat menyaksikan secara langsung bagaimana 4 jendela terminal saling bersinkronisasi. Ketika tombol ditekan di browser, request mengalir melintasi API, memicu RPC, dan diambil alih oleh RPA bot secara instan."

---

### SLIDE 10: PEMENUHAN KRITERIA TUGAS AKADEMIK
| No | Kriteria Tugas | Implementasi dalam Proyek | Status Pemenuhan |
| :---: | :--- | :--- | :---: |
| 1 | **API (REST API)** | Express RESTful API (`/api/menu`, `/api/orders`, `/api/health`) | **100% Terpenuhi** |
| 2 | **RPC** | JSON-RPC 2.0 over HTTP (`processPayment` pada port 4000) | **100% Terpenuhi** |
| 3 | **RPA** | Worker daemon berkala, invoice generator, rekap CSV | **100% Terpenuhi** |
| 4 | **Tiering** | Pemisahan 4-Tier: React $\rightarrow$ Express $\rightarrow$ RPC/RPA $\rightarrow$ MySQL | **100% Terpenuhi** |
| 5 | **Logging Standar** | Format konsol terstruktur tanpa artefak dekoratif / AI slop | **100% Terpenuhi** |

> **Catatan Pembicara (Speaker Notes):**
> "Tabel ini merangkum bahwa seluruh parameter evaluasi tugas Sistem Terdistribusi telah diimplementasikan secara fungsional tanpa ada kriteria yang dilewatkan."

---

### SLIDE 11: KESIMPULAN & PEMBELAJARAN
* **Kesimpulan:**
  * Berhasil membangun sistem pemesanan makanan terdistribusi yang memisahkan beban kerja antarmuka, orkestrator transaksi, pemrosesan pembayaran, dan otomasi pelaporan.
  * Komunikasi heterogen (REST API berbasis HTTP + Remote Procedure Call JSON-RPC) terbukti efektif dalam membagi tanggung jawab fungsional.
  * Otomasi RPA mengurangi waktu pemrosesan transaksi pasca-bayar menjadi 0 detik intervensi manual.
* **Pembelajaran Teknis yang Didapat:**
  * Penanganan konkurensi data melalui transaksi basis data (`ACID properties`).
  * Desain kontrak komunikasi jarak jauh (RPC request-response contract).
  * Mekanisme sinkronisasi data asinkronus antara background daemon dan aplikasi utama.

---

### SLIDE 12: SESI TANYA JAWAB (Q&A)
* **Terima Kasih**
* Pertanyaan yang Siap Dijawab:
  * *Mengapa memilih JSON-RPC daripada gRPC?* (JSON-RPC ringan, mudah diinspeksi lintas HTTP, tidak memerlukan kompilasi Protobuf rumit namun tetap memenuhi esensi RPC murni).
  * *Bagaimana jika RPC server mati saat transaksi?* (Backend menangkap error jaringan dan mengubah status pesanan menjadi `FAILED`, mencegah data gantung / inkonsistensi).
  * *Bagaimana RPA menghindari duplikasi invoice?* (Pencarian berbasis filter status `WHERE status = 'PAID'` dan transisi atomik menjadi `'COMPLETED'`).
* **Sesi Diskusi & Demonstrasi Dibuka.**
