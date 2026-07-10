import { useEffect, useState, useCallback } from 'react';
import Badge from './Badge';
import api from '../utils/api';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'MEDICAL', label: 'Medical Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'OTHER', label: 'Other' },
];
const typeLabel = (t) => LEAVE_TYPES.find((x) => x.value === t)?.label ?? t;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
const fmt = (d) => new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });

// Self-service leave: apply, view history, cancel pending. `base` = '/worker' | '/temp-worker'.
export default function LeavePanel({ base }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'ANNUAL', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/leave`)
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load leave.'))
      .finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const r = await api.post(`${base}/leave`, form);
      setItems((p) => [r.data.data, ...p]);
      setShowForm(false);
      setForm({ leave_type: 'ANNUAL', start_date: '', end_date: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Failed to apply.');
    } finally { setSaving(false); }
  }

  async function cancel(id) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.delete(`${base}/leave/${id}`);
      setItems((p) => p.filter((l) => l.leave_id !== id));
    } catch (e) { alert(e.response?.data?.message || 'Failed to cancel.'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Leave</h2>
          <p className="text-gray-500 text-sm mt-0.5">Apply for leave and view your leave history.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Apply for Leave
        </button>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">New Leave Application</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Leave Type</label>
              <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
            <button type="submit" disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Leave History</h3></div>
        <div className="divide-y divide-gray-50">
          {items.map((l) => (
            <div key={l.leave_id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{typeLabel(l.leave_type)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(l.start_date)} → {fmt(l.end_date)} · {daysBetween(l.start_date, l.end_date)} day{daysBetween(l.start_date, l.end_date) !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={l.status} />
                {l.status === 'PENDING' && <button onClick={() => cancel(l.leave_id)} className="text-xs text-red-500 hover:underline">Cancel</button>}
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && <div className="px-5 py-10 text-center text-gray-400 text-sm">No leave requests yet.</div>}
          {loading && <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>}
        </div>
      </div>
    </div>
  );
}
