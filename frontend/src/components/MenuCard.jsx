import React from 'react';
import { IconPlus, IconUtensils, IconCoffee } from './Icons';

export default function MenuCard({ menu, inCart, onAddToCart }) {
  const isFood = menu.category === 'Makanan';

  return (
    <article className="menu-card">
      <div className="menu-card-header">
        <div className="category-pill">
          {isFood ? <IconUtensils size={13} /> : <IconCoffee size={13} />}
          <span>{menu.category}</span>
        </div>
        <span className="stock-label">
          {menu.stock > 0 ? `Tersedia: ${menu.stock}` : 'Habis'}
        </span>
      </div>

      <div className="menu-card-body">
        <h3 className="menu-item-name">{menu.name}</h3>
        <p className="menu-item-desc">{menu.description}</p>
      </div>

      <div className="menu-card-footer">
        <div className="price-container">
          <span className="price-prefix">Rp</span>
          <span className="price-number">{Number(menu.price).toLocaleString('id-ID')}</span>
        </div>

        <button
          type="button"
          className={`add-cart-btn ${inCart ? 'in-cart' : ''}`}
          onClick={() => onAddToCart(menu)}
          disabled={menu.stock <= 0}
        >
          <IconPlus size={14} />
          <span>{inCart ? `Ditambah (${inCart.quantity})` : 'Pesan'}</span>
        </button>
      </div>
    </article>
  );
}
