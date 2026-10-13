
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  async function fetchNotifications() {
    await loadNotifications();
  }

  fetchNotifications();
}, [loadNotifications]);
  async function markAsRead(notificationId) {
    setUpdatingId(notificationId);
    setError('');

    try {
      await api.patch(`/notifications/${notificationId}/read`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setError(err.message || 'Could not update notification.');
    } finally {
      setUpdatingId(null);
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <section className="notifications-page">
      <header className="notifications-header">
        <div>
          <p className="notifications-eyebrow">CREATORSPACE</p>
          <h1>Notifications</h1>
          <p>Stay updated on your creator marketplace activity.</p>
        </div>

        <button
          type="button"
          className="notifications-refresh"
          onClick={loadNotifications}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="notifications-summary">
        <div>
          <span>Total notifications</span>
          <strong>{notifications.length}</strong>
        </div>

        <div>
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      {error && (
        <p className="notifications-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="notifications-empty">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <span className="notifications-empty-icon">♧</span>
          <h2>You're all caught up</h2>
          <p>Your new notifications will appear here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-card ${
                notification.is_read ? 'is-read' : 'is-unread'
              }`}
            >
              <div className="notification-indicator">
                {notification.is_read ? '✓' : '●'}
              </div>

              <div className="notification-content">
                <p>
                  {notification.message ||
                    notification.content ||
                    notification.title ||
                    'You have a new notification.'}
                </p>

                {notification.created_at && (
                  <time>
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                )}

                {!notification.is_read && (
                  <button
                    type="button"
                    className="notification-read-button"
                    disabled={updatingId === notification.id}
                    onClick={() => markAsRead(notification.id)}
                  >
                    {updatingId === notification.id
                      ? 'Updating...'
                      : 'Mark as read'}
                  </button>
                )}
              </div>

              {!notification.is_read && (
                <span className="notification-unread-label">New</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}