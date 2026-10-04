const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const jayson = require('jayson');

// Service pembayaran mandiri via JSON-RPC over HTTP
const RPC_PORT = process.env.RPC_PORT || process.env.PORT || 4000;

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Handler prosedur processPayment
function processPayment(args, callback) {
  const { orderId, amount, customerName } = args;

  console.log(`[${formatLogTime()}] [RPC-PAYMENT] [REQUEST] processPayment - orderId=${orderId}, customer="${customerName}", amount=Rp ${Number(amount || 0).toLocaleString('id-ID')}`);

  if (!orderId || !amount || !customerName) {
    console.warn(`[${formatLogTime()}] [RPC-PAYMENT] [REJECTED] Argumen kurang lengkap untuk orderId=${orderId}`);
    return callback({
      code: -32602,
      message: 'Data pembayaran tidak lengkap. Diperlukan: orderId, amount, customerName',
    });
  }

  if (amount <= 0) {
    console.warn(`[${formatLogTime()}] [RPC-PAYMENT] [REJECTED] Nominal tidak valid (${amount}) untuk orderId=${orderId}`);
    return callback({
      code: -32602,
      message: 'Jumlah pembayaran harus lebih dari 0',
    });
  }

  // Simulasi proses payment gateway (500ms delay)
  const processingTime = 500;

  setTimeout(() => {
    // 97% peluang pembayaran sukses
    const isSuccess = Math.random() < 0.97;

    if (isSuccess) {
      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      console.log(`[${formatLogTime()}] [RPC-PAYMENT] [SUCCESS] Pembayaran diterima untuk orderId=${orderId} (ref: ${paymentRef})`);

      callback(null, {
        success: true,
        paymentRef: paymentRef,
        orderId: orderId,
        customerName: customerName,
        amount: amount,
        processedAt: new Date().toISOString(),
      });
    } else {
      console.error(`[${formatLogTime()}] [RPC-PAYMENT] [FAILED] Simulasi gateway gagal untuk orderId=${orderId}`);
      callback({
        code: -32000,
        message: 'Pembayaran gagal diproses oleh gateway. Silakan coba lagi.',
      });
    }
  }, processingTime);
}

// Cek status service
function healthCheck(args, callback) {
  callback(null, {
    service: 'RPC Payment Service',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

// Daftarkan method ke server JSON-RPC
const server = jayson.Server({
  processPayment: processPayment,
  healthCheck: healthCheck,
});

server.http().listen(RPC_PORT, () => {
  console.log(`[${formatLogTime()}] [RPC-PAYMENT] Server aktif di port ${RPC_PORT} (JSON-RPC over HTTP)`);
  console.log(`[${formatLogTime()}] [RPC-PAYMENT] Method: processPayment, healthCheck`);
});
