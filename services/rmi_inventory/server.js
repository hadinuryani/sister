const net = require('net');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Service RMI Inventory (TCP Socket)
// Menyediakan remote object InventoryManager untuk reservasi dan cek stok
const RMI_PORT = process.env.RMI_PORT || 5000;

function formatLogTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Remote Object: InventoryManager
// Menyimpan state cache inventori dan riwayat transaksi di memori
class InventoryManager {
  constructor() {
    this.inventoryCache = {};
    this.transactionLog = [];
    this.objectId = `INV-MGR-${Date.now()}`;
    console.log(`[${formatLogTime()}] [RMI-OBJECT] Inisialisasi InventoryManager (ID: ${this.objectId})`);
  }

  // Cek ketersediaan stok
  checkStock(params) {
    const { menuId, menuName, requestedQty } = params;

    console.log(`[${formatLogTime()}] [RMI-OBJECT] checkStock dipanggil: menuId=${menuId}, nama="${menuName}", qty=${requestedQty}`);

    if (!menuId || !requestedQty) {
      throw { code: -32602, message: 'Parameter menuId dan requestedQty wajib diisi' };
    }

    const isAvailable = requestedQty <= 100;
    const estimatedDelivery = isAvailable ? '15-20 menit' : 'Stok habis';

    const result = {
      menuId,
      menuName: menuName || `Item-${menuId}`,
      requestedQty,
      isAvailable,
      estimatedDelivery,
      checkedAt: new Date().toISOString(),
      checkedBy: this.objectId,
    };

    this.transactionLog.push({
      method: 'checkStock',
      params: { menuId, requestedQty },
      result: { isAvailable },
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // Reservasi stok saat pesanan dibuat
  reserveStock(params) {
    const { orderId, items, customerName } = params;

    console.log(`[${formatLogTime()}] [RMI-OBJECT] reserveStock dipanggil: orderId=${orderId}, items=${items?.length || 0}`);

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      throw { code: -32602, message: 'Parameter orderId dan items[] wajib diisi' };
    }

    const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Simulasi ketersediaan stok
    const isSuccess = Math.random() < 0.95;
    if (!isSuccess) {
      console.warn(`[${formatLogTime()}] [RMI-OBJECT] Reservasi gagal untuk orderId=${orderId} (stok tidak cukup)`);
      throw { code: -32000, message: 'Stok pada gudang tidak mencukupi untuk pesanan ini' };
    }

    const reservedItems = items.map((item) => ({
      menuId: item.menuId,
      quantity: item.quantity,
      status: 'RESERVED',
    }));

    const result = {
      success: true,
      reservationId,
      orderId,
      customerName: customerName || 'Unknown',
      reservedItems,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      managedBy: this.objectId,
    };

    // Simpan ke cache internal remote object
    this.inventoryCache[reservationId] = result;

    this.transactionLog.push({
      method: 'reserveStock',
      params: { orderId, itemCount: items.length },
      result: { reservationId, success: true },
      timestamp: new Date().toISOString(),
    });

    console.log(`[${formatLogTime()}] [RMI-OBJECT] Reservasi berhasil: ${reservationId} (order #${orderId})`);
    return result;
  }

  // Rekapitulasi reservasi yang ada di cache
  getInventoryReport() {
    console.log(`[${formatLogTime()}] [RMI-OBJECT] getInventoryReport dipanggil`);

    const reservations = Object.values(this.inventoryCache);
    let totalItemsReserved = 0;

    reservations.forEach((r) => {
      if (r.reservedItems) {
        r.reservedItems.forEach((item) => {
          totalItemsReserved += item.quantity || 0;
        });
      }
    });

    return {
      objectId: this.objectId,
      serviceName: 'RMI Inventory Service',
      totalReservations: reservations.length,
      totalItemsReserved,
      activeReservations: reservations.slice(-10),
      recentTransactions: this.transactionLog.slice(-10),
      generatedAt: new Date().toISOString(),
    };
  }

  // Cek kondisi service
  healthCheck() {
    return {
      service: 'RMI Inventory Service',
      objectId: this.objectId,
      status: 'healthy',
      protocol: 'RMI (TCP JSON Socket)',
      uptime: process.uptime(),
      cacheSize: Object.keys(this.inventoryCache).length,
      logSize: this.transactionLog.length,
      timestamp: new Date().toISOString(),
    };
  }
}

// Inisialisasi instance Remote Object
const inventoryManager = new InventoryManager();

// RMI Skeleton (TCP Socket Server)
// Menangani request dari Stub client lalu memanggil method pada objek InventoryManager
const server = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[${formatLogTime()}] [RMI-SKELETON] Client terhubung: ${clientAddr}`);

  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString();

    // Parse pesan line-delimited JSON
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const rawMessage = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);

      if (!rawMessage) continue;

      try {
        const request = JSON.parse(rawMessage);
        handleRMIRequest(socket, request);
      } catch (parseErr) {
        const errorResponse = {
          id: null,
          error: { code: -32700, message: 'Format pesan JSON tidak valid' },
        };
        socket.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });

  socket.on('end', () => {
    console.log(`[${formatLogTime()}] [RMI-SKELETON] Client terputus: ${clientAddr}`);
  });

  socket.on('error', (err) => {
    console.error(`[${formatLogTime()}] [RMI-SKELETON] Error socket (${clientAddr}): ${err.message}`);
  });
});

// Dispatcher untuk memanggil method remote object
function handleRMIRequest(socket, request) {
  const { id, objectRef, method, params } = request;

  console.log(`[${formatLogTime()}] [RMI-SKELETON] Invokasi masuk: ${objectRef}.${method}() (id=${id})`);

  if (objectRef !== 'InventoryManager') {
    const errorResponse = {
      id,
      error: { code: -32601, message: `Remote object "${objectRef}" tidak terdaftar` },
    };
    socket.write(JSON.stringify(errorResponse) + '\n');
    return;
  }

  if (typeof inventoryManager[method] !== 'function') {
    const errorResponse = {
      id,
      error: { code: -32601, message: `Method "${method}" tidak ditemukan pada object ${objectRef}` },
    };
    socket.write(JSON.stringify(errorResponse) + '\n');
    return;
  }

  try {
    const result = inventoryManager[method](params || {});
    const response = {
      id,
      objectRef,
      method,
      result,
    };

    console.log(`[${formatLogTime()}] [RMI-SKELETON] Eksekusi ${objectRef}.${method}() selesai (id=${id})`);
    socket.write(JSON.stringify(response) + '\n');
  } catch (methodError) {
    const errorResponse = {
      id,
      objectRef,
      method,
      error: {
        code: methodError.code || -32000,
        message: methodError.message || 'Eksekusi method gagal',
      },
    };

    console.error(`[${formatLogTime()}] [RMI-SKELETON] Error ${objectRef}.${method}(): ${methodError.message}`);
    socket.write(JSON.stringify(errorResponse) + '\n');
  }
}

// Jalankan server TCP
server.listen(RMI_PORT, () => {
  console.log(`[${formatLogTime()}] [RMI-SERVER] Inventory Service aktif di port ${RMI_PORT} (TCP Socket)`);
  console.log(`[${formatLogTime()}] [RMI-SERVER] Remote Object: InventoryManager`);
  console.log(`[${formatLogTime()}] [RMI-SERVER] Method tersedia: checkStock, reserveStock, getInventoryReport, healthCheck`);
});

server.on('error', (err) => {
  console.error(`[${formatLogTime()}] [RMI-SERVER] Gagal menjalankan server: ${err.message}`);
  process.exit(1);
});
