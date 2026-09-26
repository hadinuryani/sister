import { useState, useEffect, useCallback } from 'react';

// ============================================================
// FOOD ORDERING SYSTEM — Main React Application
// Tier 1: Presentation Layer
// Berkomunikasi dengan Backend via REST API (Tier 2)
// ============================================================

const API_BASE = '/api';

// ─── Toast Notification ─────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

// ─── Menu Page ──────────────────────────────────
function MenuPage({ cart, setCart, showToast }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/menu`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMenus(data.data);
        setLoading(false);
      })
      .catch(() => {
        showToast('Gagal memuat menu. Pastikan backend berjalan.', 'error');
        setLoading(false);
      });
  }, [showToast]);

  const addToCart = (menu) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...menu, quantity: 1 }];
    });
    showToast(`${menu.name} ditambahkan ke keranjang`, 'success');
  };

  // Kelompokkan menu berdasarkan kategori
  const categories = {};
  menus.forEach((menu) => {
    if (!categories[menu.category]) categories[menu.category] = [];
    categories[menu.category].push(menu);
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }}></div>
        <p style={{ marginTop: 16 }}>Memuat menu...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">🍽️ Menu Kami</h2>
      <p className="section-subtitle">Pilih makanan dan minuman favoritmu</p>

      {Object.entries(categories).map(([category, items]) => (
        <div key={category}>
          <div className="category-label">
            {category === 'Makanan' ? '🍛' : '🥤'} {category}
          </div>
          <div className="menu-grid">
            {items.map((menu) => {
              const inCart = cart.find((c) => c.id === menu.id);
              return (
                <div className="menu-card" key={menu.id}>
                  <div className="menu-card-top">
                    <span className="menu-emoji">{menu.image_url}</span>
                    <span className="menu-category-tag">{menu.category}</span>
                  </div>
                  <div className="menu-name">{menu.name}</div>
                  <div className="menu-desc">{menu.description}</div>
                  <div className="menu-bottom">
                    <div>
                      <div className="menu-price">
                        <span className="currency">Rp</span>
                        {Number(menu.price).toLocaleString('id-ID')}
                      </div>
                      <div className="menu-stock">Stok: {menu.stock}</div>
                    </div>
                    <button className="add-btn" onClick={() => addToCart(menu)}>
                      {inCart ? `+ Tambah (${inCart.quantity})` : '+ Keranjang'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cart / Checkout Page ────────────────────────
function CartPage({ cart, setCart, showToast, setPage }) {
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const submitOrder = async () => {
    if (!customerName.trim()) {
      showToast('Masukkan nama pelanggan terlebih dahulu', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: cart.map((item) => ({ menuId: item.id, quantity: item.quantity })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast(`✅ Order #${data.data.orderId} berhasil! Ref: ${data.data.paymentRef}`, 'success');
        setCart([]);
        setCustomerName('');
        setPage('status');
      } else {
        showToast(`❌ ${data.message}`, 'error');
      }
    } catch (error) {
      showToast('Gagal mengirim order. Pastikan backend & RPC service aktif.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <h2 className="section-title">🛒 Keranjang</h2>
        <div className="cart-empty">
          <div className="empty-icon">🛒</div>
          <h3>Keranjang masih kosong</h3>
          <p style={{ marginTop: 8 }}>Pilih menu lezat dari halaman menu!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h2 className="section-title">🛒 Keranjang</h2>
      <p className="section-subtitle">{cart.length} item dalam keranjang</p>

      {cart.map((item) => (
        <div className="cart-item" key={item.id}>
          <div className="cart-item-info">
            <span className="cart-item-emoji">{item.image_url}</span>
            <div>
              <div className="cart-item-name">{item.name}</div>
              <div className="cart-item-price">
                Rp {Number(item.price).toLocaleString('id-ID')} / porsi
              </div>
            </div>
          </div>
          <div className="cart-item-controls">
            <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>
              −
            </button>
            <span className="qty-value">{item.quantity}</span>
            <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>
              +
            </button>
          </div>
          <div className="cart-item-subtotal">
            Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
          </div>
          <button className="remove-btn" onClick={() => removeItem(item.id)} title="Hapus">
            ✕
          </button>
        </div>
      ))}

      <div className="checkout-box">
        <div className="checkout-summary">
          <span className="checkout-total-label">Total Pembayaran</span>
          <span className="checkout-total-value">Rp {totalAmount.toLocaleString('id-ID')}</span>
        </div>

        <div className="input-group">
          <label htmlFor="customerName">Nama Pelanggan</label>
          <input
            id="customerName"
            type="text"
            placeholder="Masukkan nama Anda..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <button className="checkout-btn" onClick={submitOrder} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner"></span>Memproses Pembayaran...
            </>
          ) : (
            `💳 Bayar & Pesan — Rp ${totalAmount.toLocaleString('id-ID')}`
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Order Status Page ──────────────────────────
function StatusPage({ showToast }) {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Muat semua order saat halaman dibuka
  useEffect(() => {
    fetch(`${API_BASE}/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAllOrders(data.data);
      })
      .catch(() => {});
  }, []);

  // Auto-refresh setiap 5 detik untuk melihat perubahan status oleh RPA bot
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/orders`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setAllOrders(data.data);
        })
        .catch(() => {});

      // Refresh detail order juga jika sedang ditampilkan
      if (order) {
        fetch(`${API_BASE}/orders/${order.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setOrder(data.data);
          })
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [order]);

  const lookupOrder = async () => {
    if (!orderId.trim()) {
      showToast('Masukkan Order ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId.trim()}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        showToast('Order tidak ditemukan', 'error');
        setOrder(null);
      }
    } catch {
      showToast('Gagal mengambil data order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="order-status-page">
      <h2 className="section-title">📦 Status Pesanan</h2>
      <p className="section-subtitle">Cek status pesanan Anda (auto-refresh setiap 5 detik)</p>

      <div className="order-lookup">
        <input
          type="number"
          placeholder="Masukkan Order ID (contoh: 1)"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookupOrder()}
        />
        <button className="lookup-btn" onClick={lookupOrder} disabled={loading}>
          {loading ? <span className="spinner"></span> : '🔍'} Cari Order
        </button>
      </div>

      {/* Order Detail Card */}
      {order && (
        <div className="order-card">
          <div className="order-card-header">
            <span className="order-id">Order #{String(order.id).padStart(4, '0')}</span>
            <span className={`status-badge status-${order.status}`}>{order.status}</span>
          </div>
          <div className="order-card-body">
            <div className="order-detail-row">
              <span className="detail-label">Pelanggan</span>
              <span className="detail-value">{order.customer_name}</span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Total</span>
              <span className="detail-value" style={{ color: 'var(--success)' }}>
                Rp {Number(order.total_amount).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Ref Pembayaran</span>
              <span className="detail-value">{order.payment_ref || '-'}</span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Dibuat</span>
              <span className="detail-value">{formatDate(order.created_at)}</span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Diperbarui</span>
              <span className="detail-value">{formatDate(order.updated_at)}</span>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="order-items-list">
                <h4>Item Pesanan</h4>
                {order.items.map((item, i) => (
                  <div className="order-item-row" key={i}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Orders Table */}
      {allOrders.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>
            📋 Riwayat Semua Order
          </h3>
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o) => (
                  <tr
                    key={o.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setOrderId(String(o.id));
                      setOrder(null);
                      setTimeout(() => {
                        fetch(`${API_BASE}/orders/${o.id}`)
                          .then((res) => res.json())
                          .then((data) => {
                            if (data.success) setOrder(data.data);
                          });
                      }, 100);
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>#{String(o.id).padStart(4, '0')}</td>
                    <td>{o.customer_name}</td>
                    <td style={{ color: 'var(--success)' }}>
                      Rp {Number(o.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <span className={`status-badge status-${o.status}`}>{o.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ───────────────────────────────────
export default function App() {
  const [page, setPage] = useState('menu');
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="logo">🍔</span>
            <div>
              <h1>Food Order</h1>
              <div className="subtitle">Distributed System Demo</div>
            </div>
          </div>

          <nav className="header-nav">
            <button
              className={`nav-btn ${page === 'menu' ? 'active' : ''}`}
              onClick={() => setPage('menu')}
            >
              🍽️ Menu
            </button>
            <button
              className={`nav-btn ${page === 'cart' ? 'active' : ''}`}
              onClick={() => setPage('cart')}
            >
              🛒 Keranjang
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button
              className={`nav-btn ${page === 'status' ? 'active' : ''}`}
              onClick={() => setPage('status')}
            >
              📦 Status
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="app-container" style={{ paddingBottom: 60 }}>
        {page === 'menu' && <MenuPage cart={cart} setCart={setCart} showToast={showToast} />}
        {page === 'cart' && (
          <CartPage cart={cart} setCart={setCart} showToast={showToast} setPage={setPage} />
        )}
        {page === 'status' && <StatusPage showToast={showToast} />}
      </main>
    </div>
  );
}
