const jayson = require('jayson');

// RPC Payment Service — JSON-RPC Server
// Berjalan di port 4000 sebagai service independen
//
// Konsep Sistem Terdistribusi:
//   Service ini TERPISAH dari Backend API. Backend memanggil
//   method di service ini melalui jaringan (JSON-RPC over HTTP),
//   sehingga memenuhi definisi Remote Procedure Call (RPC).

const RPC_PORT = 4000;

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Simulasi pemrosesan pembayaran
 * Dalam produksi nyata, ini akan terhubung ke payment gateway
 * (Midtrans, Stripe, dll.)
 */
function processPayment(args, callback) {
  const { orderId, amount, customerName } = args;

  console.log(`[${formatLogTime()}] [RPC-PAYMENT] [REQUEST] processPayment - orderId=${orderId}, customer="${customerName}", amount=Rp ${Number(amount || 0).toLocaleString('id-ID')}`);

  // Validasi input
  if (!orderId || !amount || !customerName) {
    console.warn(`[${formatLogTime()}] [RPC-PAYMENT] [REJECTED] processPayment failed: missing required arguments (orderId=${orderId})`);
    return callback({
      code: -32602,
      message: 'Data pembayaran tidak lengkap. Diperlukan: orderId, amount, customerName',
    });
  }

  if (amount <= 0) {
    console.warn(`[${formatLogTime()}] [RPC-PAYMENT] [REJECTED] processPayment failed: invalid amount (${amount}) for orderId=${orderId}`);
    return callback({
      code: -32602,
      message: 'Jumlah pembayaran harus lebih dari 0',
    });
  }

  // Simulasi processing delay (seolah-olah menghubungi payment gateway)
  const processingTime = 500 + Math.random() * 1000; // 500-1500ms

  setTimeout(() => {
    // Simulasi: 90% sukses, 10% gagal (untuk demo error handling)
    const isSuccess = Math.random() < 0.9;

    if (isSuccess) {
      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      console.log(`[${formatLogTime()}] [RPC-PAYMENT] [SUCCESS] Payment approved for orderId=${orderId} (ref: ${paymentRef}, ${Math.round(processingTime)}ms)`);

      callback(null, {
        success: true,
        message: 'Pembayaran berhasil diproses',
        paymentRef: paymentRef,
        orderId: orderId,
        amount: amount,
        processedAt: new Date().toISOString(),
      });
    } else {
      console.error(`[${formatLogTime()}] [RPC-PAYMENT] [FAILED] Gateway error simulated for orderId=${orderId}`);
      callback({
        code: -32000,
        message: 'Pembayaran gagal diproses oleh payment gateway. Silakan coba lagi.',
      });
    }
  }, processingTime);
}

/**
 * Health check — untuk memverifikasi service hidup
 */
function healthCheck(args, callback) {
  callback(null, {
    service: 'RPC Payment Service',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

// Buat JSON-RPC server dengan method yang tersedia
const server = jayson.Server({
  processPayment: processPayment,
  healthCheck: healthCheck,
});

// Jalankan server HTTP di port 4000
server.http().listen(RPC_PORT, () => {
  console.log(`[${formatLogTime()}] [RPC-PAYMENT] Server running on port ${RPC_PORT}`);
  console.log(`[${formatLogTime()}] [RPC-PAYMENT] Protocol: JSON-RPC 2.0 over HTTP`);
  console.log(`[${formatLogTime()}] [RPC-PAYMENT] Registered methods: processPayment, healthCheck`);
});
