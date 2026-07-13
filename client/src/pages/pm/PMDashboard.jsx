import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import CalendarMonth from '../../components/CalendarMonth';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
const isOverdue = (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.end_datetime) < new Date();
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

export default function PMDashboard() {
  const [tasks, setTasks] = useState([]);
  const [leave, setLeave] = useState([]);
  const [cal, setCal] = useState(null);
  const [view, setView] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get('/pm/tasks').then((r) => setTasks(r.data.data ?? [])).catch((e) => setError(e.response?.data?.message || 'Failed to load tasks.'));
    api.get('/pm/leave').then((r) => setLeave(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const from = ymd(new Date(view.year, view.month, 1));
    const to = ymd(new Date(view.year, view.month + 1, 0));
    api.get(`/pm/calendar?from=${from}&to=${to}`).then((r) => setCal(r.data.data)).catch(() => {});
  }, [view]);

  const count = (st) => tasks.filter((t) => t.status === st).length;
  const today = ymd(new Date());
  const onShiftToday = (cal?.shifts ?? []).filter((s) => s.date === today);
  const activeToday = (cal?.tasks ?? []).filter((t) => t.start <= today && t.end >= today && !['COMPLETED', 'CANCELLED'].includes(t.status));
  const pendingLeave = leave.filter((l) => l.status === 'PENDING');

  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const toToday = () => { const n = new Date(); setView({ year: n.getFullYear(), month: n.getMonth() }); };

  async function decideLeave(id, status) {
    setBusy(id);
    try {
      await api.patch(`/pm/leave/${id}`, { status });
      setLeave((p) => p.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (e) { alert(e.response?.data?.message || 'Failed to update leave.'); }
    finally { setBusy(null); }
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-gray-500 text-sm mt-0.5">Today's team, tasks, leave approvals and your calendar.</p>
          </div>
          <Link to="/pm/tasks" className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ Create Task</Link>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Task summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL TASKS', value: tasks.length, color: 'text-gray-800' },
            { label: 'PENDING', value: count('PENDING'), color: 'text-yellow-600' },
            { label: 'IN PROGRESS', value: count('IN_PROGRESS'), color: 'text-purple-600' },
            { label: 'COMPLETED', value: count('COMPLETED'), color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today: on shift + active tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Today</h3>
              <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-SG', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">On shift today</p>
                {onShiftToday.length === 0 ? (
                  <p className="text-sm text-gray-400">No one is rostered today.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {onShiftToday.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
                        🕘 {s.userName} <span className="text-blue-400">· {s.startTime}–{s.endTime}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Active tasks today</p>
                {activeToday.length === 0 ? (
                  <p className="text-sm text-gray-400">No tasks scheduled for today.</p>
                ) : (
                  <div className="divide-y divide-gray-50 -mx-1">
                    {activeToday.map((t) => (
                      <div key={t.task_id} className="px-1 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                          <p className="text-xs text-gray-400">{t.assignees.length ? t.assignees.join(', ') : 'Unassigned'} · due {t.end}</p>
                        </div>
                        <Badge status={t.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending leave approvals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Leave Approvals</h3>
              <Link to="/pm/leave" className="text-primary-600 text-xs hover:underline">All</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingLeave.map((l) => (
                <div key={l.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-800">{l.userName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cap(l.type)} · {l.from}{l.from !== l.to ? ` → ${l.to}` : ''} · {l.days}d</p>
                  <div className="flex gap-2 mt-2">
                    <button disabled={busy === l.id} onClick={() => decideLeave(l.id, 'REJECTED')} className="text-xs font-medium px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Reject</button>
                    <button disabled={busy === l.id} onClick={() => decideLeave(l.id, 'APPROVED')} className="text-xs font-medium px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50">Approve</button>
                  </div>
                </div>
              ))}
              {pendingLeave.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No pending requests. 🎉</div>}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <CalendarMonth year={view.year} month={view.month} data={cal} onPrev={prev} onNext={next} onToday={toToday} scope="manager" />
      </div>
    </DashboardLayout>
  );
}
