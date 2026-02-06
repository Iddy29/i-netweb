import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import ServiceIcon from '../components/ServiceIcon';
import { HiClock, HiCurrencyDollar, HiChevronDown, HiChevronUp, HiRefresh } from 'react-icons/hi';

function formatPrice(price, currency = 'TZS') {
  if (currency === 'TZS') return `TZS ${Number(price).toLocaleString()}`;
  return `$${Number(price).toFixed(2)}`;
}

function getDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

const PAY_STATUS_STYLE = {
  completed: { label: 'Paid', cls: 'badge-success' },
  pending: { label: 'Pending', cls: 'badge-warning' },
  failed: { label: 'Failed', cls: 'badge-danger' },
  awaiting_verification: { label: 'Verifying', cls: 'badge-info' },
};

export default function Transactions() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await ordersAPI.getAll();
      if (data.success) setOrders(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return o.paymentStatus === 'completed';
    if (filter === 'pending') return o.paymentStatus === 'pending' || o.paymentStatus === 'awaiting_verification';
    if (filter === 'failed') return o.paymentStatus === 'failed';
    return true;
  });

  const totalSpent = orders
    .filter((o) => o.paymentStatus === 'completed')
    .reduce((sum, o) => sum + (o.servicePrice || 0), 0);

  // Group by date
  const groups = {};
  filtered.forEach((o) => {
    const label = getDateLabel(o.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(o);
  });

  const filterCounts = {
    all: orders.length,
    paid: orders.filter(o => o.paymentStatus === 'completed').length,
    pending: orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'awaiting_verification').length,
    failed: orders.filter(o => o.paymentStatus === 'failed').length,
  };

  return (
    <div className="transactions-page">
      <div className="page-title-row">
        <h1><HiClock size={24} /> Transaction History</h1>
        <button className="refresh-btn" onClick={() => { setLoading(true); fetchOrders(); }}>
          <HiRefresh size={18} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="tx-summary">
        <div className="tx-summary-card">
          <HiCurrencyDollar size={24} />
          <div>
            <span>Total Transactions</span>
            <strong>{orders.length}</strong>
          </div>
        </div>
        <div className="tx-summary-card accent">
          <HiCurrencyDollar size={24} />
          <div>
            <span>Total Spent</span>
            <strong>{formatPrice(totalSpent)}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tx-tabs">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            className={`tx-tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label} <span className="tab-count">{filterCounts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="orders-loading">
          {[...Array(4)].map((_, i) => <div key={i} className="order-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-box">
          <HiClock size={48} />
          <h3>No Transactions</h3>
          <p>No transactions match the selected filter</p>
        </div>
      ) : (
        Object.entries(groups).map(([label, items]) => (
          <div key={label} className="tx-group">
            <h3 className="tx-group-title">{label}</h3>
            {items.map((order) => {
              const ps = PAY_STATUS_STYLE[order.paymentStatus] || PAY_STATUS_STYLE.pending;
              const expanded = expandedId === order._id;
              return (
                <div key={order._id} className={`tx-card ${expanded ? 'expanded' : ''}`}>
                  <div className="tx-card-top" onClick={() => setExpandedId(expanded ? null : order._id)}>
                    <div className="tx-icon" style={{ backgroundColor: (order.serviceColor || '#06B6D4') + '15' }}>
                      <ServiceIcon type={order.serviceIconType || 'internet'} size={20} color={order.serviceColor} iconImage={order.serviceIconImage} />
                    </div>
                    <div className="tx-info">
                      <h4>{order.serviceName}</h4>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="tx-right">
                      <span className="tx-amount">{formatPrice(order.servicePrice, order.serviceCurrency)}</span>
                      <span className={`tx-badge ${ps.cls}`}>{ps.label}</span>
                    </div>
                    <span className="expand-icon">{expanded ? <HiChevronUp /> : <HiChevronDown />}</span>
                  </div>
                  {expanded && (
                    <div className="tx-expanded">
                      <div className="tx-detail-grid">
                        <div><span>Order Status</span><strong>{order.status}</strong></div>
                        <div><span>Payment Method</span><strong>{order.paymentMethod === 'manual' ? 'Manual' : 'USSD'}</strong></div>
                        <div><span>Phone</span><strong>{order.paymentPhone}</strong></div>
                        <div><span>Duration</span><strong>{order.serviceDuration}</strong></div>
                        {order.paymentTransactionId && (
                          <div><span>Transaction ID</span><strong className="mono">{order.paymentTransactionId}</strong></div>
                        )}
                        {order.paymentNetwork && (
                          <div><span>Network</span><strong>{order.paymentNetwork}</strong></div>
                        )}
                      </div>
                      {order.adminNote && (
                        <div className="tx-admin-note"><strong>Note:</strong> {order.adminNote}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
