const jayson = require('jayson/lib/client');

// ============================================================
// RPC Client — Modul untuk memanggil RPC Payment Service
//
// Konsep Sistem Terdistribusi:
//   Client ini mengirim request JSON-RPC ke Payment Service
//   yang berjalan di port 4000 (proses/server terpisah).
//   Ini adalah Remote Procedure Call — memanggil fungsi
//   di service lain melalui jaringan.
// ============================================================

const RPC_HOST = process.env.RPC_HOST || 'localhost';
const RPC_PORT = process.env.RPC_PORT || 4000;

const rpcClient = jayson.http({
  host: RPC_HOST,
  port: RPC_PORT,
});

/**
 * Memanggil method processPayment di RPC Payment Service
 * @param {number} orderId - ID order yang akan dibayar
 * @param {number} amount - Jumlah pembayaran
 * @param {string} customerName - Nama pelanggan
 * @returns {Promise<object>} Hasil pembayaran dari RPC server
 */
function processPayment(orderId, amount, customerName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📡 [RPC CLIENT] Memanggil processPayment ke ${RPC_HOST}:${RPC_PORT}`);

    rpcClient.request(
      'processPayment',
      { orderId, amount, customerName },
      (err, response) => {
        if (err) {
          console.log(`   ❌ RPC Error: ${err.message || JSON.stringify(err)}`);
          return reject(new Error(err.message || 'Gagal menghubungi RPC Payment Service'));
        }

        if (response.error) {
          console.log(`   ❌ Payment Error: ${response.error.message}`);
          return reject(new Error(response.error.message));
        }

        console.log(`   ✅ RPC Response diterima: ${response.result.paymentRef}`);
        resolve(response.result);
      }
    );
  });
}

/**
 * Cek apakah RPC Payment Service sedang aktif
 * @returns {Promise<object>} Status health check
 */
function checkPaymentServiceHealth() {
  return new Promise((resolve, reject) => {
    rpcClient.request('healthCheck', {}, (err, response) => {
      if (err) return reject(new Error('RPC Payment Service tidak aktif'));
      if (response.error) return reject(new Error(response.error.message));
      resolve(response.result);
    });
  });
}

module.exports = { processPayment, checkPaymentServiceHealth };
