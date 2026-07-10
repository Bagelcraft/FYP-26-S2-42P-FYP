import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

// Shared, API-backed notifications view used by every role's Notifications page.
// Renders heading + "mark all read" + the list, reading from GET /notifications.
export default function NotificationsList({ subtitle = 'Your recent alerts and updates.' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/notifications')
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load notifications.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try { await api.patch('/notifications/read-all'); setItems((p) => p.map((n) => ({ ...n, isRead: true }))); }
    catch (e) { setError(e.response?.data?.message || 'Failed.'); }
  };
  const markRead = async (id) => {
    try { await api.patch(`/notifications/${id}/read`); setItems((p) => p.map((n) => (n.id === id ? { ...n, isRead: true } : n))); }
    catch (e) { setError(e.response?.data?.message || 'Failed.'); }
  };
  const remove = async (id) => {
    try { await api.delete(`/notifications/${id}`); setItems((p) => p.filter((n) => n.id !== id)); }
    catch (e) { setError(e.response?.data?.message || 'Failed.'); }
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Notifications{unread > 0 && <span className="ml-2 text-xs font-medium text-primary-700 bg-primary-100 rounded-full px-2 py-0.5">{unread} new</span>}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-primary-600 hover:underline">Mark all as read</button>
        )}
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {items.map((n) => (
          <div key={n.id} className={`px-5 py-4 flex gap-4 ${n.isRead ? '' : 'bg-primary-50/40'}`}>
            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-primary-500'}`} />
            <div className="flex-1 min-w-0">
              {n.type && <p className="text-[11px] uppercase tracking-wide text-gray-400">{n.type}</p>}
              <p className={`text-sm ${n.isRead ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{n.message}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
              {!n.isRead && <button onClick={() => markRead(n.id)} className="text-xs text-primary-600 hover:underline">Read</button>}
              <button onClick={() => remove(n.id)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">No notifications.</div>
        )}
        {loading && <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>}
      </div>
    </div>
  );
}
