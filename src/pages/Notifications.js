import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiBell, HiCheck, HiCheckCircle, HiExclamation, HiKey,
  HiTruck, HiClock, HiRefresh,
} from 'react-icons/hi';

const TYPE_ICONS = {
  payment_completed: { Icon: HiCheckCircle, cls: 'notif-success' },
  payment_verified: { Icon: HiCheckCircle, cls: 'notif-success' },
  payment_failed: { Icon: HiExclamation, cls: 'notif-danger' },
  order_active: { Icon: HiCheck, cls: 'notif-info' },
  order_processing: { Icon: HiClock, cls: 'notif-warning' },
  order_delivered: { Icon: HiTruck, cls: 'notif-success' },
  order_cancelled: { Icon: HiExclamation, cls: 'notif-danger' },
  order_credentials: { Icon: HiKey, cls: 'notif-info' },
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { refreshUnread } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        notificationsAPI.getAll(1, 50),
        notificationsAPI.getUnreadCount(),
      ]);
      if (nRes.data.success) setNotifications(nRes.data.data.notifications || nRes.data.data);
      if (cRes.data.success) setUnreadCount(cRes.data.data.count);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      refreshUnread();
      toast.success('All marked as read');
    } catch {}
  };

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationsAPI.markAsRead(n._id);
        setNotifications((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        refreshUnread();
      } catch {}
    }
    if (n.order) navigate('/orders');
  };

  return (
    <div className="notifications-page">
      <div className="page-title-row">
        <h1><HiBell size={24} /> Notifications</h1>
        <div className="notif-actions">
          {unreadCount > 0 && (
            <button className="mark-all-btn" onClick={handleMarkAllRead}>
              <HiCheck size={16} /> Mark all read
            </button>
          )}
          <button className="refresh-btn" onClick={() => { setLoading(true); fetchNotifications(); }}>
            <HiRefresh size={18} />
          </button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="unread-banner">
          You have <strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      {loading ? (
        <div className="orders-loading">
          {[...Array(4)].map((_, i) => <div key={i} className="order-skeleton" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state-box">
          <HiBell size={48} />
          <h3>No Notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const typeInfo = TYPE_ICONS[n.type] || { Icon: HiBell, cls: 'notif-default' };
            const TypeIcon = typeInfo.Icon;
            return (
              <div
                key={n._id}
                className={`notif-card ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className={`notif-icon ${typeInfo.cls}`}>
                  <TypeIcon size={20} />
                </div>
                <div className="notif-body">
                  <h4>{n.title}</h4>
                  <p>{n.message}</p>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </div>
                {!n.isRead && <div className="notif-dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
