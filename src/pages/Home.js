import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI, servicesAPI } from '../services/api';
import ServiceIcon, { CategoryIcon } from '../components/ServiceIcon';
import ServiceDetailModal from '../components/ServiceDetailModal';
import { HiSearch } from 'react-icons/hi';

function formatPrice(price, currency = 'TZS') {
  if (currency === 'TZS') return `TZS ${Number(price).toLocaleString()}`;
  return `$${Number(price).toFixed(2)}`;
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        categoriesAPI.getAll(),
        servicesAPI.getAll(activeCategory !== 'all' ? activeCategory : undefined),
      ]);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (svcRes.data.success) setServices(svcRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="home-page">
      {/* Search */}
      <div className="search-bar">
        <HiSearch size={20} />
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="category-chips">
        <button
          className={`chip ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <CategoryIcon category="all" size={14} />
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={`chip ${activeCategory === cat.name ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.name)}
          >
            <CategoryIcon category={cat.icon || cat.name} size={14} />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="services-loading">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="service-card-skeleton">
              <div className="skel-icon" />
              <div className="skel-text skel-title" />
              <div className="skel-text skel-sub" />
              <div className="skel-text skel-desc" />
              <div className="skel-row">
                <div className="skel-text skel-price" />
                <div className="skel-btn" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-services">
          <HiSearch size={48} />
          <h3>No services found</h3>
          <p>{search ? 'Try a different search term' : 'No services available in this category'}</p>
        </div>
      ) : (
        <div className="services-grid">
          {filtered.map((service) => (
            <div
              key={service._id}
              className="service-card"
              onClick={() => setSelectedService(service)}
            >
              <div className="sc-icon" style={{ backgroundColor: (service.color || '#06B6D4') + '15' }}>
                <ServiceIcon type={service.iconType} size={28} color={service.color} iconImage={service.iconImage} />
              </div>
              <h3 className="sc-name">{service.name}</h3>
              <span className="sc-duration">{service.duration}</span>
              <p className="sc-desc">{service.description}</p>
              <div className="sc-footer">
                <span className="sc-price">{formatPrice(service.price, service.currency)}</span>
                <button className="sc-buy-btn">Buy Now</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}
