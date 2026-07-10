import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';
import api from '../../utils/api';

const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtShiftTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function TempWorkerDashboard() {
  const [openSession, setOpenSession] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [available, setAvailable] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/temp-worker/attendance').then((r) => setOpenSession(r.data.data.find((rec) => rec.clock_out === null) || null)).catch(() => {});
    api.get('/temp-worker/tasks').then((r) => setTasks(r.data.data ?? [])).catch(() => {});
    api.get('/temp-worker/tasks/available').then((r) => setAvailable(r.data.data ?? [])).catch(() => {});
    api.get('/temp-worker/schedule').then((r) => setSchedule(r.data.data ?? [])).catch(() => {});
  }, []);

  const isClockedIn = Boolean(openSession);

  const handleClockIn = async () => {
    setActionLoading(true); setError('');
    try { const res = await api.post('/temp-worker/attendance/clock-in'); setOpenSession(res.data.data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to clock in.'); }
    finally { setActionLoading(false); }
  };
  const handleClockOut = async () => {
    setActionLoading(true); setError('');
    try { await api.put('/temp-worker/attendance/clock-out'); setOpenSession(null); }
    catch (err) { setError(err.response?.data?.message || 'Failed to clock out.'); }
    finally { setActionLoading(false); }
  };

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
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee" topbarRight={clockInButton}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Day</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track your assigned tasks and manage your schedule.</p>
        </div>

        {isClockedIn && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3 text-sm text-green-700">
            Clocked in at <span className="font-semibold">{formatTime(openSession.clock_in)}</span>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ASSIGNED TASKS', value: String(tasks.length), color: 'text-blue-600' },
            { label: 'UPCOMING SHIFTS', value: String(schedule.length), color: 'text-yellow-600' },
            { label: 'AVAILABLE TASKS', value: String(available.length), color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Upcoming shifts */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Upcoming Shifts</h3>
                <Link to="/temp-worker/schedule" className="text-primary-600 text-sm hover:underline">Schedule &amp; swaps</Link>
              </div>
              {schedule.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No upcoming shifts.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {schedule.slice(0, 5).map((a) => (
                    <div key={a.assignment_id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{fmtDate(a.date)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.shift?.name} · {fmtShiftTime(a.shift?.start_time)}–{fmtShiftTime(a.shift?.end_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned tasks */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Assigned Tasks</h3>
                <Link to="/temp-worker/tasks" className="text-primary-600 text-sm hover:underline">View all</Link>
              </div>
              {tasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No tasks assigned.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {tasks.slice(0, 5).map((t) => (
                    <div key={t.task_id} className="px-5 py-4 flex items-center justify-between">
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

            {/* Available task pool */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Available Task Pool</h3>
                <p className="text-gray-400 text-xs mt-0.5">Pending tasks matching your skills.</p>
              </div>
              {available.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No available tasks at this time.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {available.slice(0, 5).map((t) => (
                    <div key={t.task_id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-400">{(t.requiredSkills || []).map((s) => s.skill_name).join(', ') || 'No specific skill'} · Due {fmtDate(t.end_datetime)}</p>
                      </div>
                      <Badge status="PENDING" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'My Schedule', to: '/temp-worker/schedule' },
                  { label: 'Request Leave', to: '/temp-worker/leave' },
                  { label: 'View Attendance', to: '/temp-worker/attendance' },
                ].map((a) => (
                  <Link key={a.label} to={a.to} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
