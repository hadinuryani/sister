import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Toast from './components/Toast';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import StatusPage from './pages/StatusPage';

export default function App() {
  const [page, setPage] = useState('menu');
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="site-shell">
      {/* Toast Notification */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Minimalist Top Header */}
      <Header
        page={page}
        setPage={setPage}
        cartCount={totalCartCount}
      />

      {/* Main Content Area */}
      <main className="content-container">
        {page === 'menu' && (
          <MenuPage
            cart={cart}
            setCart={setCart}
            showToast={showToast}
          />
        )}

        {page === 'cart' && (
          <CartPage
            cart={cart}
            setCart={setCart}
            showToast={showToast}
            setPage={setPage}
          />
        )}

        {page === 'status' && (
          <StatusPage
            showToast={showToast}
          />
        )}
      </main>

      {/* Subtle Minimalist Footer */}
      <footer className="site-footer">
        <div className="footer-content">
          <span>Food Ordering System</span>
          <span className="footer-dot">•</span>
          <span>Tugas Sistem Terdistribusi (API • RPC • RMI • Tiering)</span>
        </div>
      </footer>
    </div>
  );
}
