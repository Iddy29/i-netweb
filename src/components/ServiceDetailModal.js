import { useState } from 'react';
import ServiceIcon from './ServiceIcon';
import PaymentModal from './PaymentModal';
import { HiX, HiCheck, HiClock, HiCurrencyDollar } from 'react-icons/hi';

function formatPrice(price, currency = 'TZS') {
  if (currency === 'TZS') return `TZS ${Number(price).toLocaleString()}`;
  return `$${Number(price).toFixed(2)}`;
}

export default function ServiceDetailModal({ service, onClose }) {
  const [showPayment, setShowPayment] = useState(false);

  if (!service) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose}>
            <HiX size={20} />
          </button>

          {/* Header */}
          <div className="detail-header" style={{ background: `linear-gradient(135deg, ${service.color || '#06B6D4'}20, ${service.color || '#06B6D4'}08)` }}>
            <div className="detail-icon" style={{ backgroundColor: (service.color || '#06B6D4') + '20' }}>
              <ServiceIcon type={service.iconType} size={40} color={service.color} iconImage={service.iconImage} />
            </div>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
          </div>

          {/* Info */}
          <div className="detail-body">
            <div className="detail-info-row">
              <div className="detail-info-item">
                <HiCurrencyDollar size={18} />
                <div>
                  <span>Price</span>
                  <strong>{formatPrice(service.price, service.currency)}</strong>
                </div>
              </div>
              <div className="detail-info-item">
                <HiClock size={18} />
                <div>
                  <span>Duration</span>
                  <strong>{service.duration}</strong>
                </div>
              </div>
            </div>

            {/* Features */}
            {service.features?.length > 0 && (
              <div className="detail-features">
                <h3>Features</h3>
                <ul>
                  {service.features.map((f, i) => (
                    <li key={i}>
                      <HiCheck size={16} color="#10B981" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="order-btn" onClick={() => setShowPayment(true)}>
              Order Now - {formatPrice(service.price, service.currency)}
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          service={service}
          onClose={() => { setShowPayment(false); onClose(); }}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
