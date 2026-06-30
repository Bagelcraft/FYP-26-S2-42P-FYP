import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { TEMP_NAV } from './nav';
import api from '../../utils/api';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Availability() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    api.get('/temp-worker/availability')
      .then((r) => {
        const rows = r.data.data ?? [];
        setBlocked(rows.filter((s) => s.status === 'UNAVAILABLE'));
      })
      .catch(() => setError('Failed to load unavailable days.'))
      .finally(() => setLoading(false));
  }, []);

  const alreadyBlocked = (d) => blocked.some((s) => s.start_datetime.slice(0, 10) === d);

  async function markUnavailable() {
    if (!date) { setError('Please select a date.'); return; }
    if (alreadyBlocked(date)) { setError('That date is already marked unavailable.'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/temp-worker/availability', {
        start_datetime: `${date}T00:00:00`,
        end_datetime:   `${date}T23:59:59`,
        status: 'UNAVAILABLE',
      });
      setBlocked((prev) => [...prev, res.data.data].sort((a, b) =>
        a.start_datetime.localeCompare(b.start_datetime)));
      setDate('');
      showToast('Day marked as unavailable.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(slot) {
    try {
      await api.delete(`/temp-worker/availability/${slot.availability_id}`);
      setBlocked((prev) => prev.filter((s) => s.availability_id !== slot.availability_id));
      showToast('Day removed.');
    } catch {
      setError('Failed to remove day.');
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <div className="space-y-6 max-w-xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Days I Can't Work</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Mark dates you are unavailable. Tasks will not be assigned to you on these days.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Add date */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add an unavailable date</h3>
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setError(''); }}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={markUnavailable}
              disabled={saving || !date}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Mark Unavailable'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <div className="px-5 py-3 bg-gray-50 rounded-t-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unavailable Dates</p>
          </div>
          {loading && <p className="px-5 py-6 text-sm text-gray-400 text-center">Loading…</p>}
          {!loading && blocked.length === 0 && (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No unavailable days set. You're available for all tasks!</p>
          )}
          {blocked.map((slot) => (
            <div key={slot.availability_id} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-800">{fmtDate(slot.start_datetime)}</p>
              </div>
              <button
                onClick={() => remove(slot)}
                className="text-xs text-red-500 hover:underline font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400">
          Only future dates are accepted. Contact your organisation admin for past date adjustments.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
