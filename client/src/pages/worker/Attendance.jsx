import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { WORKER_NAV } from './nav';
import api from '../../utils/api';

const STATUS_COLOR = {
  Present: 'text-green-600',
  'In Progress': 'text-blue-600',
};

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatHours(decimal) {
  if (decimal == null) return '—';
  const totalMinutes = Math.round(parseFloat(decimal) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isSameMonth(dt, monthStr) {
  const d = new Date(dt);
  const [year, month] = monthStr.split('-').map(Number);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

export default function Attendance() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(defaultMonth);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecords = () => {
    setLoading(true);
    api.get('/worker/attendance')
      .then((r) => setRecords(r.data.data))
      .catch(() => setError('Failed to load attendance.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRecords(); }, []);

  const openSession = records.find((r) => r.clock_out === null);
  const isClockedIn = Boolean(openSession);

  const handleClockIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post('/worker/attendance/clock-in');
      setRecords((prev) => [res.data.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.put('/worker/attendance/clock-out');
      setRecords((prev) => prev.map((r) => r.attendance_id === res.data.data.attendance_id ? res.data.data : r));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock out.');
    } finally {
      setActionLoading(false);
    }
  };

  const monthRecords = records.filter((r) => isSameMonth(r.clock_in, month));
  const completedRecords = monthRecords.filter((r) => r.clock_out !== null);
  const totalMinutes = completedRecords.reduce((sum, r) => sum + Math.round(parseFloat(r.working_hours || 0) * 60), 0);
  const totalHoursDisplay = totalMinutes > 0
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : '0h';
  const avgHours = completedRecords.length > 0
    ? formatHours(totalMinutes / 60 / completedRecords.length)
    : '—';

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Attendance</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your clock-in/out history and daily hours.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isClockedIn ? (
              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Processing…' : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Processing…' : 'Clock In'}
              </button>
            )}
          </div>
        </div>

        {isClockedIn && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700">
            Clocked in at <span className="font-semibold">{formatTime(openSession.clock_in)}</span>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Days Present', value: completedRecords.length.toString(), sub: 'This month', color: 'text-green-600' },
            { label: 'Total Hours', value: totalHoursDisplay, sub: 'This month', color: 'text-primary-600' },
            { label: 'Avg Hours / Day', value: avgHours, sub: 'This month', color: 'text-gray-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Attendance table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Clock In</th>
                <th className="px-5 py-3 text-left font-medium">Clock Out</th>
                <th className="px-5 py-3 text-left font-medium">Hours</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={5} className="px-5 py-4 text-gray-400">Loading…</td></tr>
              )}
              {!loading && monthRecords.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-4 text-gray-400">No records for this month.</td></tr>
              )}
              {monthRecords.map((r) => {
                const status = r.clock_out === null ? 'In Progress' : 'Present';
                return (
                  <tr key={r.attendance_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{formatDate(r.clock_in)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.clock_in)}</td>
                    <td className="px-5 py-3 text-gray-600">{r.clock_out ? formatTime(r.clock_out) : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{formatHours(r.working_hours)}</td>
                    <td className={`px-5 py-3 font-medium ${STATUS_COLOR[status] || 'text-gray-600'}`}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
