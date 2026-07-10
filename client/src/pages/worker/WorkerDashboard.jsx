import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { WORKER_NAV } from './nav';
import api from '../../utils/api';

const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtShiftTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${period}`;
};
function formatHours(decimal) {
  if (decimal == null) return '—';
  const totalMinutes = Math.round(parseFloat(decimal) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function WorkerDashboard() {
  const [openSession, setOpenSession] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/worker/attendance').then((r) => {
      const records = r.data.data;
      const today = new Date().toDateString();
      setOpenSession(records.find((rec) => rec.clock_out === null) || null);
      setTodayRecord(records.find((rec) => rec.clock_out !== null && new Date(rec.clock_in).toDateString() === today) || null);
    }).catch(() => {});
    api.get('/worker/tasks').then((r) => setTasks(r.data.data ?? [])).catch(() => {});
    api.get('/worker/schedule').then((r) => setSchedule(r.data.data ?? [])).catch(() => {});
  }, []);

  const isClockedIn = Boolean(openSession);

  const handleClockIn = async () => {
    setActionLoading(true); setError('');
    try { const res = await api.post('/worker/attendance/clock-in'); setOpenSession(res.data.data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to clock in.'); }
    finally { setActionLoading(false); }
  };
  const handleClockOut = async () => {
    setActionLoading(true); setError('');
    try { const res = await api.put('/worker/attendance/clock-out'); setOpenSession(null); setTodayRecord(res.data.data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to clock out.'); }
    finally { setActionLoading(false); }
  };

  const hoursToday = isClockedIn ? 'Active' : (todayRecord ? formatHours(todayRecord.working_hours) : '0h');
  const assignedCount = tasks.filter((t) => ['ASSIGNED', 'PENDING'].includes(t.status)).length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;

  const clockInButton = (
    <div className="flex items-center gap-2">
      {isClockedIn && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full tracking-wide">CLOCKED IN</span>}
      <button onClick={isClockedIn ? handleClockOut : handleClockIn} disabled={actionLoading}
        className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${isClockedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
        {actionLoading ? 'Processing…' : isClockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  );

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Employee" topbarRight={clockInButton}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Day</h2>
          <p className="text-gray-500 text-sm mt-0.5">View your tasks, schedule, and track attendance.</p>
        </div>

        {isClockedIn && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3 text-sm text-green-700">
            Clocked in at <span className="font-semibold">{formatTime(openSession.clock_in)}</span>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ASSIGNED TASKS', value: String(assignedCount), color: 'text-blue-600' },
            { label: 'IN PROGRESS', value: String(inProgressCount), color: 'text-purple-600' },
            { label: 'UPCOMING SHIFTS', value: String(schedule.length), color: 'text-green-600' },
            { label: 'HOURS TODAY', value: hoursToday, color: isClockedIn ? 'text-green-600' : 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">My Tasks</h3>
              <Link to="/worker/tasks" className="text-primary-600 text-sm hover:underline">View all</Link>
            </div>
            {tasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.task_id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.department?.name ? `${t.department.name} · ` : ''}Due {fmtDate(t.end_datetime)}</p>
                    </div>
                    <Badge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Today</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Clock In</span><span className="text-gray-800 font-medium">{openSession ? formatTime(openSession.clock_in) : todayRecord ? formatTime(todayRecord.clock_in) : '—'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Clock Out</span><span className="text-gray-800 font-medium">{todayRecord ? formatTime(todayRecord.clock_out) : '—'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><span className={`font-medium ${isClockedIn ? 'text-green-600' : todayRecord ? 'text-gray-600' : 'text-gray-400'}`}>{isClockedIn ? 'Clocked in' : todayRecord ? 'Completed' : 'Not started'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Hours</span><span className="text-gray-800 font-medium">{hoursToday}</span></div>
              </div>
            </div>

            {/* Upcoming shifts */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Upcoming Shifts</h3>
                <Link to="/worker/schedule" className="text-primary-600 text-xs hover:underline">View</Link>
              </div>
              <div className="space-y-2">
                {schedule.slice(0, 4).map((a) => (
                  <div key={a.assignment_id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-700 font-medium">{fmtDate(a.date)}</p>
                      <p className="text-gray-400 text-xs">{a.shift?.name}</p>
                    </div>
                    <span className="text-gray-500 text-xs">{fmtShiftTime(a.shift?.start_time)}–{fmtShiftTime(a.shift?.end_time)}</span>
                  </div>
                ))}
                {schedule.length === 0 && <p className="text-gray-400 text-sm">No upcoming shifts.</p>}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">Quick Actions</h3>
              {[
                { label: 'Request Leave', to: '/worker/leave' },
                { label: 'View Schedule', to: '/worker/schedule' },
                { label: 'View Time Sheet', to: '/worker/attendance' },
              ].map((a) => (
                <Link key={a.label} to={a.to} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100">
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
