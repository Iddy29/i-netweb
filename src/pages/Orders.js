import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import ServiceIcon from '../components/ServiceIcon';
import {
  HiShoppingCart, HiClock, HiCheck, HiX, HiTruck,
  HiExclamation, HiKey, HiRefresh, HiChevronDown, HiChevronUp,
} from 'react-icons/hi';

function formatPrice(price, currency = 'TZS') {
  if (currency === 'TZS') return `TZS ${Number(price).toLocaleString()}`;
  return `$${Number(price).toFixed(2)}`;
}

const STATUS_MAP = {
  pending: { icon: <HiClock />, label: 'Pending', cls: 'status-pending' },
  processing: { icon: <HiRefresh />, label: 'Processing', cls: 'status-processing' },
  active: { icon: <HiCheck />, label: 'Active', cls: 'status-active' },
  delivered: { icon: <HiTruck />, label: 'Delivered', cls: 'status-active' },
  cancelled: { icon: <HiX />, label: 'Cancelled', cls: 'status-failed' },
  expired: { icon: <HiExclamation />, label: 'Expired', cls: 'status-failed' },
};

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Pending', cls: 'pay-pending' },
  completed: { label: 'Paid', cls: 'pay-completed' },
  failed: { label: 'Failed', cls: 'pay-failed' },
  awaiting_verification: { label: 'Awaiting Verification', cls: 'pay-awaiting' },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await ordersAPI.getAll();
      if (data.success) setOrders(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <h1><HiShoppingCart /> My Orders</h1>
        <div className="orders-loading">
          {[...Array(3)].map((_, i) => <div key={i} className="order-skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="page-title-row">
        <h1><HiShoppingCart size={24} /> My Orders</h1>
        <button className="refresh-btn" onClick={() => { setLoading(true); fetchOrders(); }}>
          <HiRefresh size={18} /> Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state-box">
          <HiShoppingCart size={56} />
          <h3>No Orders Yet</h3>
          <p>Your orders will appear here after making a purchase</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
            const payStatus = PAYMENT_STATUS_MAP[order.paymentStatus] || PAYMENT_STATUS_MAP.pending;
            const expanded = expandedId === order._id;

            return (
              <div key={order._id} className={`order-card ${expanded ? 'expanded' : ''}`}>
                <div className="order-top" onClick={() => setExpandedId(expanded ? null : order._id)}>
                  <div className="order-icon" style={{ backgroundColor: (order.serviceColor || '#06B6D4') + '15' }}>
                    <ServiceIcon
                      type={order.serviceIconType || 'internet'}
                      size={24}
                      color={order.serviceColor || '#06B6D4'}
                      iconImage={order.serviceIconImage}
                    />
                  </div>
                  <div className="order-info">
                    <h3>{order.serviceName}</h3>
                    <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="order-right">
                    <span className={`order-status-badge ${status.cls}`}>
                      {status.icon} {status.label}
                    </span>
                    <span className="order-price">{formatPrice(order.servicePrice, order.serviceCurrency)}</span>
                  </div>
                  <button className="expand-btn">
                    {expanded ? <HiChevronUp /> : <HiChevronDown />}
                  </button>
                </div>

                {expanded && (
                  <div className="order-details">
                    <div className="order-detail-grid">
                      <div className="od-item">
                        <span>Payment Status</span>
                        <strong className={`pay-badge ${payStatus.cls}`}>{payStatus.label}</strong>
                      </div>
                      <div className="od-item">
                        <span>Payment Method</span>
                        <strong>{order.paymentMethod === 'manual' ? 'Manual' : 'USSD Push'}</strong>
                      </div>
                      <div className="od-item">
                        <span>Phone</span>
                        <strong>{order.paymentPhone}</strong>
                      </div>
                      <div className="od-item">
                        <span>Duration</span>
                        <strong>{order.serviceDuration}</strong>
                      </div>
                      {order.paymentTransactionId && (
                        <div className="od-item">
                          <span>Transaction ID</span>
                          <strong className="mono">{order.paymentTransactionId}</strong>
                        </div>
                      )}
                      {order.paymentNetwork && (
                        <div className="od-item">
                          <span>Network</span>
                          <strong>{order.paymentNetwork}</strong>
                        </div>
                      )}
                    </div>

                    {/* Credentials */}
                    {(order.status === 'active' || order.status === 'delivered') && order.credentials && (
                      <div className="order-credentials">
                        <h4><HiKey /> Account Credentials</h4>
                        {order.credentials.username && (
                          <div className="cred-row">
                            <span>Username/Email:</span>
                            <code>{order.credentials.username}</code>
                          </div>
                        )}
                        {order.credentials.password && (
                          <div className="cred-row">
                            <span>Password:</span>
                            <code>{order.credentials.password}</code>
                          </div>
                        )}
                        {order.credentials.accountDetails && (
                          <div className="cred-row">
                            <span>Details:</span>
                            <code>{order.credentials.accountDetails}</code>
                          </div>
                        )}
                      </div>
                    )}

                    {order.adminNote && (
                      <div className="order-admin-note">
                        <strong>Admin Note:</strong> {order.adminNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
