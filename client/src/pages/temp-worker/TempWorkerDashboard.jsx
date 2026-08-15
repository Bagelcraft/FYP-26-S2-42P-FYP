import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { TEMP_NAV } from './nav';
import api from '../../utils/api';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtShiftTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function TempWorkerDashboard() {
  const { user } = useAuth();
  // In a project-based organisation a temporary worker carries no shifts at all —
  // they stay dormant until a task activates them. There is no roster to show and
  // no schedule page to link to, so both come off the dashboard entirely.
  const isProjectOrg = user?.org_type === 'PROJECT';

  const [tasks, setTasks] = useState([]);
  const [available, setAvailable] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [approved, setApproved] = useState({ count: 0, tasks: [] });

  useEffect(() => {
    api.get('/temp-worker/tasks').then((r) => setTasks(r.data.data ?? [])).catch(() => {});
    api.get('/temp-worker/tasks/available').then((r) => setAvailable(r.data.data ?? [])).catch(() => {});
    api.get('/temp-worker/hours').then((r) => setApproved(r.data.data ?? { count: 0, tasks: [] })).catch(() => {});
    if (!isProjectOrg) {
      api.get('/temp-worker/schedule').then((r) => setSchedule(r.data.data ?? [])).catch(() => {});
    }
  }, [isProjectOrg]);

  const activeCount = tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length;
  const awaitingCount = tasks.filter((t) => t.status === 'SUBMITTED').length;

  // Calendar covers both models, so it is offered either way — it just carries the
  // roster as well when there is one.
  const quickActions = [
    { label: 'My Tasks', to: '/temp-worker/tasks' },
    { label: isProjectOrg ? 'My Calendar' : 'My Schedule', to: '/temp-worker/calendar' },
    { label: 'My Time Sheet', to: '/temp-worker/timesheet' },
  ];

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Day</h2>
          <p className="text-gray-500 text-sm mt-0.5">Accept work, submit it for approval, and track your approved hours.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ACTIVE TASKS', value: String(activeCount), color: 'text-blue-600' },
            { label: 'AWAITING APPROVAL', value: String(awaitingCount), color: 'text-indigo-600' },
            { label: 'APPROVED TASKS', value: String(approved.count), color: 'text-green-600' },
            { label: 'AVAILABLE TASKS', value: String(available.length), color: 'text-yellow-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Assigned tasks */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">My Tasks</h3>
                <Link to="/temp-worker/tasks" className="text-primary-600 text-sm hover:underline">Manage</Link>
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

            {/* Approved work + hours */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Approved Work</h3>
                <span className="text-sm font-semibold text-green-600">
                  {approved.count} task{approved.count === 1 ? '' : 's'} total
                </span>
              </div>
              {approved.tasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No approved work yet. Submit a task and your manager will approve it.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {approved.tasks.slice(0, 8).map((t) => (
                    <div key={t.task_id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Completed · {fmtDate(t.end)}</p>
                      </div>
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

          {/* Right column */}
          <div className="space-y-4">
            {/* No roster in a project-based organisation, so no shifts to list. */}
            {!isProjectOrg && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm">Upcoming Shifts</h3>
                </div>
                {schedule.length === 0 ? (
                  <div className="px-5 py-6 text-center text-gray-400 text-sm">No upcoming shifts.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {schedule.slice(0, 4).map((a) => (
                      <div key={a.assignment_id} className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{fmtDate(a.date)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.shift?.name} · {fmtShiftTime(a.shift?.start_time)}–{fmtShiftTime(a.shift?.end_time)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((a) => (
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
