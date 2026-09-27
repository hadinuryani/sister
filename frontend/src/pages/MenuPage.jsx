import React, { useState, useEffect, useMemo } from 'react';
import { fetchMenus } from '../services/api';
import MenuCard from '../components/MenuCard';
import { IconSearch, IconUtensils, IconCoffee } from '../components/Icons';

export default function MenuPage({ cart, setCart, showToast }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMenus()
      .then((data) => {
        setMenus(data);
        setLoading(false);
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat menu. Periksa koneksi backend.', 'error');
        setLoading(false);
      });
  }, [showToast]);

  const handleAddToCart = (menu) => {
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

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchesCategory =
        selectedCategory === 'ALL' || menu.category.toUpperCase() === selectedCategory.toUpperCase();
      const matchesSearch =
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menus, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="state-container">
        <div className="minimal-spinner" />
        <p className="state-text">Memuat katalog menu...</p>
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="section-header-row">
        <div>
          <h1 className="page-heading">Katalog Menu</h1>
          <p className="page-description">Pilihan hidangan utama dan minuman segar</p>
        </div>

        <div className="filter-toolbar">
          <div className="search-field">
            <IconSearch size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-tabs">
            <button
              type="button"
              className={`category-tab ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              Semua
            </button>
            <button
              type="button"
              className={`category-tab ${selectedCategory === 'Makanan' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Makanan')}
            >
              <IconUtensils size={13} />
              <span>Makanan</span>
            </button>
            <button
              type="button"
              className={`category-tab ${selectedCategory === 'Minuman' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Minuman')}
            >
              <IconCoffee size={13} />
              <span>Minuman</span>
            </button>
          </div>
        </div>
      </div>

      {filteredMenus.length === 0 ? (
        <div className="empty-catalog-state">
          <p className="empty-catalog-title">Tidak ada menu yang sesuai</p>
          <p className="empty-catalog-sub">Coba ubah kata kunci pencarian atau kategori filter.</p>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredMenus.map((menu) => {
            const inCart = cart.find((item) => item.id === menu.id);
            return (
              <MenuCard
                key={menu.id}
                menu={menu}
                inCart={inCart}
                onAddToCart={handleAddToCart}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
