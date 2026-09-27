import React from 'react';
import { IconBrand, IconMenu, IconShoppingBag, IconActivity } from './Icons';

export default function Header({ page, setPage, cartCount }) {
  return (
    <header className="site-header">
      <div className="header-container">
        <button 
          type="button"
          className="header-brand" 
          onClick={() => setPage('menu')}
          aria-label="Kembali ke menu"
        >
          <div className="brand-icon-box">
            <IconBrand size={18} />
          </div>
          <div className="brand-text">
            <span className="brand-title">FoodOrder</span>
            <span className="brand-subtitle">Distributed Systems</span>
          </div>
        </button>

        <nav className="nav-tabs" aria-label="Navigasi Utama">
          <button
            type="button"
            className={`nav-tab ${page === 'menu' ? 'is-active' : ''}`}
            onClick={() => setPage('menu')}
          >
            <IconMenu size={15} />
            <span>Menu</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${page === 'cart' ? 'is-active' : ''}`}
            onClick={() => setPage('cart')}
          >
            <IconShoppingBag size={15} />
            <span>Keranjang</span>
            {cartCount > 0 && <span className="tab-badge">{cartCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-tab ${page === 'status' ? 'is-active' : ''}`}
            onClick={() => setPage('status')}
          >
            <IconActivity size={15} />
            <span>Status</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
