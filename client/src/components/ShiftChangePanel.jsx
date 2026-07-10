import { useEffect, useState, useCallback } from 'react';
import Badge from './Badge';
import api from '../utils/api';

const fmt = (d) => new Date(d).toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Worker/temp shift-change requests: submit + view own. `base` = '/worker' | '/temp-worker'.
export default function ShiftChangePanel({ base }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ original_shift: '', requested_shift: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/shift-change-requests`)
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const r = await api.post(`${base}/shift-change-request`, form);
      setItems((p) => [r.data.data, ...p]);
      setShowForm(false);
      setForm({ original_shift: '', requested_shift: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Failed to submit.');
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Shift-Change Requests</h3>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm text-primary-600 hover:underline">+ Request change</button>
      </div>

      {error && <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-end gap-3">
          <div className="min-w-[190px]">
            <label className="block text-xs text-gray-500 mb-1">Current shift date/time</label>
            <input required type="datetime-local" value={form.original_shift} onChange={(e) => setForm({ ...form, original_shift: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="min-w-[190px]">
            <label className="block text-xs text-gray-500 mb-1">Requested date/time</label>
            <input required type="datetime-local" value={form.requested_shift} onChange={(e) => setForm({ ...form, requested_shift: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}

      <div className="divide-y divide-gray-50">
        {items.map((r) => (
          <div key={r.request_id} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <span className="text-gray-400">{fmt(r.original_shift)}</span>
              <span className="mx-2 text-gray-300">→</span>
              <span className="font-medium">{fmt(r.requested_shift)}</span>
            </div>
            <Badge status={r.status} />
          </div>
        ))}
        {!loading && items.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No shift-change requests.</div>}
        {loading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading…</div>}
      </div>
    </div>
  );
}
