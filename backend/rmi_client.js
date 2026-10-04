const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const net = require('net');

// Client stub untuk memanggil Remote Object InventoryManager via TCP socket
const RMI_HOST = process.env.RMI_HOST || 'localhost';
const RMI_PORT = process.env.RMI_PORT || 5000;

let requestCounter = 0;

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Kirim request pemanggilan method remote via TCP socket
function invokeRemoteMethod(objectRef, method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++requestCounter;
    const timeoutMs = 10000;

    console.log(`[${formatLogTime()}] [RMI-STUB] Memanggil ${objectRef}.${method}() ke ${RMI_HOST}:${RMI_PORT} (id=${requestId})`);

    const socket = new net.Socket();
    let buffer = '';
    let responded = false;

    const timer = setTimeout(() => {
      if (!responded) {
        responded = true;
        socket.destroy();
        reject(new Error(`Timeout pemanggilan RMI: ${objectRef}.${method}() (${timeoutMs}ms)`));
      }
    }, timeoutMs);

    socket.connect(RMI_PORT, RMI_HOST, () => {
      const request = {
        id: requestId,
        objectRef,
        method,
        params,
      };

      socket.write(JSON.stringify(request) + '\n');
    });

    socket.on('data', (data) => {
      buffer += data.toString();

      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const rawResponse = buffer.substring(0, newlineIndex).trim();
        if (!responded) {
          responded = true;
          clearTimeout(timer);

          try {
            const response = JSON.parse(rawResponse);

            if (response.error) {
              console.error(`[${formatLogTime()}] [RMI-STUB] Error pada ${objectRef}.${method}(): ${response.error.message}`);
              reject(new Error(response.error.message));
            } else {
              console.log(`[${formatLogTime()}] [RMI-STUB] Respon sukses dari ${objectRef}.${method}() (id=${requestId})`);
              resolve(response.result);
            }
          } catch (parseErr) {
            reject(new Error('Gagal parse respon RMI'));
          }

          socket.end();
        }
      }
    });

    socket.on('error', (err) => {
      if (!responded) {
        responded = true;
        clearTimeout(timer);
        console.error(`[${formatLogTime()}] [RMI-STUB] Koneksi gagal: ${err.message}`);
        reject(new Error(`Gagal menghubungi RMI Inventory Service: ${err.message}`));
      }
    });

    socket.on('close', () => {
      if (!responded) {
        responded = true;
        clearTimeout(timer);
        reject(new Error('Koneksi RMI terputus sebelum menerima data'));
      }
    });
  });
}

// Cek ketersediaan stok menu tertentu
function checkStock(menuId, menuName, requestedQty) {
  return invokeRemoteMethod('InventoryManager', 'checkStock', {
    menuId,
    menuName,
    requestedQty,
  });
}

// Reservasi stok pesanan
function reserveStock(orderId, items, customerName) {
  return invokeRemoteMethod('InventoryManager', 'reserveStock', {
    orderId,
    items,
    customerName,
  });
}

// Ambil laporan reservasi dan status inventori
function getInventoryReport() {
  return invokeRemoteMethod('InventoryManager', 'getInventoryReport', {});
}

// Cek status service RMI
function checkInventoryServiceHealth() {
  return invokeRemoteMethod('InventoryManager', 'healthCheck', {});
}

module.exports = { checkStock, reserveStock, getInventoryReport, checkInventoryServiceHealth };
