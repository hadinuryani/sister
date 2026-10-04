import React, { useState } from 'react';
import { createOrder } from '../services/api';
import {
  IconShoppingBag,
  IconPlus,
  IconMinus,
  IconTrash,
  IconArrowRight,
  IconUtensils,
  IconCoffee,
} from '../components/Icons';

export default function CartPage({ cart, setCart, showToast, setPage }) {
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('Harap masukkan nama pelanggan', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        items: cart.map((item) => ({
          menuId: item.id,
          quantity: item.quantity,
        })),
      };

      const result = await createOrder(payload);

      if (result.success) {
        showToast(
          `Pesanan #${result.data.orderId} terkonfirmasi. Ref: ${result.data.paymentRef}`,
          'success'
        );
        setCart([]);
        setCustomerName('');
        setPage('status');
      } else {
        showToast(result.message || 'Pembayaran gagal diproses', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Gagal menghubungi server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <section className="page-section">
        <div className="empty-cart-view">
          <div className="empty-icon-circle">
            <IconShoppingBag size={28} />
          </div>
          <h2 className="empty-title">Keranjang Belanja Kosong</h2>
          <p className="empty-subtitle">
            Anda belum menambahkan menu ke dalam keranjang pesanan.
          </p>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => setPage('menu')}
          >
            <span>Jelajahi Menu</span>
            <IconArrowRight size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="section-header-row">
        <div>
          <h1 className="page-heading">Keranjang Pesanan</h1>
          <p className="page-description">
            {cart.length} jenis item siap diproses via RMI Inventory & RPC Payment
          </p>
        </div>
      </div>

      <div className="cart-layout-grid">
        {/* Left Column: Cart Items List */}
        <div className="cart-items-container">
          {cart.map((item) => {
            const isFood = item.category === 'Makanan';
            const subtotal = Number(item.price) * item.quantity;

            return (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-media">
                  {isFood ? <IconUtensils size={18} /> : <IconCoffee size={18} />}
                </div>

                <div className="cart-item-info">
                  <span className="cart-item-title">{item.name}</span>
                  <span className="cart-item-unit-price">
                    Rp {Number(item.price).toLocaleString('id-ID')} / porsi
                  </span>
                </div>

                <div className="quantity-stepper">
                  <button
                    type="button"
                    aria-label="Kurangi jumlah"
                    className="stepper-btn"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <IconMinus size={13} />
                  </button>
                  <span className="stepper-value">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Tambah jumlah"
                    className="stepper-btn"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <IconPlus size={13} />
                  </button>
                </div>

                <div className="cart-item-subtotal">
                  <span className="subtotal-prefix">Rp</span>
                  <span className="subtotal-amount">
                    {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={`Hapus ${item.name}`}
                  className="cart-remove-btn"
                  onClick={() => removeItem(item.id)}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Column: Checkout Summary Card */}
        <aside className="checkout-summary-card">
          <h2 className="summary-heading">Ringkasan Transaksi</h2>

          <div className="summary-rows">
            <div className="summary-row">
              <span className="summary-label">Total Item</span>
              <span className="summary-value">
                {cart.reduce((s, i) => s + i.quantity, 0)} item
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Protokol Pembayaran</span>
              <span className="summary-value text-accent">JSON-RPC 2.0</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total-row">
              <span className="total-label">Total Pembayaran</span>
              <span className="total-value">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <form onSubmit={handleCheckout} className="checkout-form">
            <div className="form-group">
              <label htmlFor="customerNameInput" className="form-label">
                Nama Pelanggan
              </label>
              <input
                id="customerNameInput"
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="checkout-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="minimal-spinner small" />
                  <span>Memproses via RPC...</span>
                </>
              ) : (
                <>
                  <span>Bayar Sekarang</span>
                  <IconArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="checkout-security-note">
            Order akan dikirim ke REST API, stok direservasi via RMI, dan pembayaran diproses via RPC.
          </p>
        </aside>
      </div>
    </section>
  );
}
