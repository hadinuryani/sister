const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const jayson = require('jayson/lib/client');

// Client untuk memanggil RPC Payment Service via HTTP
const RPC_HOST = process.env.RPC_HOST || 'localhost';
const RPC_PORT = process.env.RPC_PORT || 4000;

const rpcClient = jayson.http({
  host: RPC_HOST,
  port: RPC_PORT,
});

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Panggil prosedur processPayment di service pembayaran
function processPayment(orderId, amount, customerName) {
  return new Promise((resolve, reject) => {
    console.log(`[${formatLogTime()}] [RPC-CLIENT] Memanggil processPayment ke ${RPC_HOST}:${RPC_PORT} (order #${orderId})`);

    rpcClient.request(
      'processPayment',
      { orderId, amount, customerName },
      (err, response) => {
        if (err) {
          console.error(`[${formatLogTime()}] [RPC-CLIENT] Network error: ${err.message || JSON.stringify(err)}`);
          return reject(new Error(err.message || 'Gagal menghubungi RPC Payment Service'));
        }

        if (response.error) {
          console.error(`[${formatLogTime()}] [RPC-CLIENT] Pembayaran ditolak untuk order #${orderId}: ${response.error.message}`);
          return reject(new Error(response.error.message));
        }

        console.log(`[${formatLogTime()}] [RPC-CLIENT] Pembayaran sukses untuk order #${orderId} (ref: ${response.result.paymentRef})`);
        resolve(response.result);
      }
    );
  });
}

// Cek status service pembayaran
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
