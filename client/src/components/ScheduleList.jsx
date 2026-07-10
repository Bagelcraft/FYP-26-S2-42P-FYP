import { useEffect, useState } from 'react';
import api from '../utils/api';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

// Agenda of the worker's upcoming rostered shifts. `endpoint` is /worker/schedule or /temp-worker/schedule.
export default function ScheduleList({ endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(endpoint)
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load schedule.'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">My Schedule</h2>
        <p className="text-gray-500 text-sm mt-0.5">Your upcoming rostered shifts.</p>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {items.map((a) => (
          <div key={a.assignment_id} className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium">{new Date(a.date).toLocaleDateString('en-SG', { month: 'short' })}</span>
              <span className="text-base font-bold leading-none">{new Date(a.date).getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{a.shift?.name}</p>
              <p className="text-xs text-gray-400">{fmtDate(a.date)}</p>
            </div>
            <span className="text-sm text-gray-600 whitespace-nowrap">{fmtTime(a.shift?.start_time)} – {fmtTime(a.shift?.end_time)}</span>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">No upcoming shifts rostered.</div>
        )}
        {loading && <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>}
      </div>
    </div>
  );
}
