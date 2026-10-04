import React, { useState, useEffect } from 'react';
import { fetchOrders, fetchOrderById } from '../services/api';
import { IconSearch, IconClock, IconRefresh, IconCheck, IconAlertCircle } from '../components/Icons';

export default function StatusPage({ showToast }) {
  const [orderId, setOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Initial load
  useEffect(() => {
    loadOrders();
  }, []);

  // Auto-refresh interval (5 detik) untuk mendeteksi update
  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders();
      setLastRefreshed(new Date());

      if (activeOrder) {
        fetchOrderById(activeOrder.id)
          .then((data) => setActiveOrder(data))
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [activeOrder]);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setAllOrders(data);
    } catch {
      // Background silent retry
    }
  };

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanId = orderId.trim();
    if (!cleanId) {
      showToast('Masukkan nomor Order ID', 'error');
      return;
    }

    setIsSearching(true);
    try {
      const data = await fetchOrderById(cleanId);
      setActiveOrder(data);
    } catch (err) {
      showToast(err.message || 'Pesanan tidak ditemukan', 'error');
      setActiveOrder(null);
    } finally {
      setIsSearching(false);
    }
  };

  const selectOrder = async (id) => {
    setOrderId(String(id));
    try {
      const data = await fetchOrderById(id);
      setActiveOrder(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast('Gagal memuat detail pesanan', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    let badgeClass = 'status-pending';
    let label = status;

    if (s === 'PAID') {
      badgeClass = 'status-paid';
      label = 'PAID';
    } else if (s === 'COMPLETED') {
      badgeClass = 'status-completed';
      label = 'COMPLETED';
    } else if (s === 'FAILED') {
      badgeClass = 'status-failed';
      label = 'FAILED';
    }

    return (
      <span className={`status-pill ${badgeClass}`}>
        <span className="status-dot" />
        <span className="status-text">{label}</span>
      </span>
    );
  };

  return (
    <section className="page-section">
      <div className="section-header-row">
        <div>
          <h1 className="page-heading">Status & Riwayat Pesanan</h1>
          <p className="page-description">
            Pemantauan lifecycle pesanan: RMI Inventory → RPC Payment → Database
          </p>
        </div>

        <div className="live-status-indicator">
          <span className="live-pulse-dot" />
          <span className="live-status-text">
            Sinkronisasi otomatis ({lastRefreshed.toLocaleTimeString('id-ID')})
          </span>
        </div>
      </div>

      {/* Lookup Bar */}
      <form onSubmit={handleLookup} className="order-lookup-bar">
        <div className="lookup-input-wrapper">
          <IconSearch size={16} className="lookup-search-icon" />
          <input
            type="number"
            placeholder="Ketik Order ID (contoh: 1, 2, 3)..."
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="lookup-input"
          />
        </div>
        <button type="submit" className="lookup-submit-btn" disabled={isSearching}>
          {isSearching ? <span className="minimal-spinner small" /> : <IconSearch size={14} />}
          <span>Cari Pesanan</span>
        </button>
      </form>

      {/* Active Order Detail Card */}
      {activeOrder && (
        <div className="order-inspect-card">
          <div className="inspect-header">
            <div className="inspect-title-group">
              <span className="inspect-id">Order #{String(activeOrder.id).padStart(4, '0')}</span>
              {getStatusBadge(activeOrder.status)}
            </div>
            <span className="inspect-time">
              <IconClock size={13} />
              <span>{formatDate(activeOrder.created_at)}</span>
            </span>
          </div>

          <div className="inspect-grid">
            <div className="inspect-item">
              <span className="inspect-label">Nama Pelanggan</span>
              <span className="inspect-value">{activeOrder.customer_name}</span>
            </div>
            <div className="inspect-item">
              <span className="inspect-label">Total Pembayaran</span>
              <span className="inspect-value text-strong">
                Rp {Number(activeOrder.total_amount).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="inspect-item">
              <span className="inspect-label">Ref. Bayar (RPC)</span>
              <span className="inspect-value monospace-font">
                {activeOrder.payment_ref || '-'}
              </span>
            </div>
            <div className="inspect-item">
              <span className="inspect-label">Ref. Reservasi (RMI)</span>
              <span className="inspect-value monospace-font">
                {activeOrder.reservation_ref || '-'}
              </span>
            </div>
            <div className="inspect-item">
              <span className="inspect-label">Terakhir Diperbarui</span>
              <span className="inspect-value">{formatDate(activeOrder.updated_at)}</span>
            </div>
          </div>

          {/* Item Breakdown */}
          {activeOrder.items && activeOrder.items.length > 0 && (
            <div className="inspect-items-table-wrap">
              <h3 className="inspect-table-heading">Daftar Item Terverifikasi</h3>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th>Harga</th>
                    <th>Jumlah</th>
                    <th className="align-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="item-name-cell">{it.name}</td>
                      <td>Rp {Number(it.price).toLocaleString('id-ID')}</td>
                      <td>{it.quantity}</td>
                      <td className="align-right">
                        Rp {Number(it.subtotal).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Service Status Footer */}
          <div className="service-status-callout">
            <div className="callout-icon">
              {activeOrder.status === 'PAID' || activeOrder.status === 'COMPLETED' ? (
                <IconCheck size={16} />
              ) : (
                <IconClock size={16} />
              )}
            </div>
            <div className="callout-text">
              {activeOrder.status === 'PAID' && (
                <p>
                  <strong>Pembayaran Berhasil:</strong> Stok telah direservasi via{' '}
                  <code>RMI InventoryManager.reserveStock()</code> dan pembayaran diproses via{' '}
                  <code>RPC processPayment()</code>. Pesanan siap diproses.
                </p>
              )}
              {activeOrder.status === 'COMPLETED' && (
                <p>
                  <strong>Pesanan Selesai:</strong> Seluruh proses terdistribusi telah selesai.
                  Inventory direservasi (RMI) dan pembayaran dikonfirmasi (RPC).
                </p>
              )}
              {activeOrder.status === 'PENDING' && (
                <p>
                  <strong>Status Pending:</strong> Pembayaran belum berhasil diselesaikan.
                </p>
              )}
              {activeOrder.status === 'FAILED' && (
                <p>
                  <strong>Gagal:</strong> Transaksi pembayaran ditolak oleh RPC Payment Gateway simulasi.
                </p>
              )}
            </div>
          </div>

          {/* Distributed Flow Diagram */}
          <div className="distributed-flow-strip">
            <div className={`flow-step ${activeOrder.status !== 'FAILED' ? 'step-done' : 'step-done'}`}>
              <span className="flow-step-label">REST API</span>
              <span className="flow-step-protocol">HTTP POST</span>
            </div>
            <div className="flow-arrow">→</div>
            <div className={`flow-step ${activeOrder.reservation_ref ? 'step-done' : 'step-pending'}`}>
              <span className="flow-step-label">RMI Inventory</span>
              <span className="flow-step-protocol">TCP Socket</span>
            </div>
            <div className="flow-arrow">→</div>
            <div className={`flow-step ${activeOrder.payment_ref ? 'step-done' : activeOrder.status === 'FAILED' ? 'step-failed' : 'step-pending'}`}>
              <span className="flow-step-label">RPC Payment</span>
              <span className="flow-step-protocol">JSON-RPC</span>
            </div>
            <div className="flow-arrow">→</div>
            <div className={`flow-step ${activeOrder.status === 'PAID' || activeOrder.status === 'COMPLETED' ? 'step-done' : 'step-pending'}`}>
              <span className="flow-step-label">Database</span>
              <span className="flow-step-protocol">MySQL</span>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="orders-history-section">
        <div className="history-header">
          <h2 className="history-heading">Riwayat Transaksi Sistem</h2>
          <span className="history-count">{allOrders.length} transaksi tercatat</span>
        </div>

        {allOrders.length === 0 ? (
          <div className="empty-history-box">
            <p>Belum ada data transaksi yang tercatat di database.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="clean-table interactive-rows">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Waktu Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => selectOrder(o.id)}
                    className={activeOrder?.id === o.id ? 'is-selected' : ''}
                  >
                    <td className="order-id-cell">
                      #{String(o.id).padStart(4, '0')}
                    </td>
                    <td className="customer-cell">{o.customer_name}</td>
                    <td className="amount-cell">
                      Rp {Number(o.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td>{getStatusBadge(o.status)}</td>
                    <td className="timestamp-cell">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
