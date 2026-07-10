import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
const assignee = (t) => t.assignments?.[0]?.assignedTo?.full_name ?? 'Unassigned';
const skillOf = (t) => t.requiredSkills?.[0]?.skill_name ?? (t.requiredSkill?.skill_name ?? '—');
const isOverdue = (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.end_datetime) < new Date();

export default function PMDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pm/tasks')
      .then((r) => setTasks(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, []);

  const count = (st) => tasks.filter((t) => t.status === st).length;
  const needsAttention = tasks.filter((t) => t.status === 'PENDING' || isOverdue(t));

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Task Overview</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create tasks and manage staff allocation.</p>
          </div>
          <Link to="/pm/tasks" className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ Create Task</Link>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL TASKS', value: tasks.length },
            { label: 'PENDING', value: count('PENDING') },
            { label: 'IN PROGRESS', value: count('IN_PROGRESS') },
            { label: 'COMPLETED', value: count('COMPLETED') },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Task table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">All Tasks</h3>
              <Link to="/pm/tasks" className="text-primary-600 text-sm hover:underline">Manage</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Task</th>
                    <th className="px-5 py-3 text-left font-medium">Assigned To</th>
                    <th className="px-5 py-3 text-left font-medium">Skill</th>
                    <th className="px-5 py-3 text-left font-medium">Due</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tasks.map((t) => (
                    <tr key={t.task_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{t.title}</td>
                      <td className="px-5 py-3 text-gray-600">{assignee(t)}</td>
                      <td className="px-5 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{skillOf(t)}</span></td>
                      <td className={`px-5 py-3 text-sm ${isOverdue(t) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{fmtDate(t.end_datetime)}{isOverdue(t) && ' ⚠'}</td>
                      <td className="px-5 py-3"><Badge status={t.status} /></td>
                    </tr>
                  ))}
                  {!loading && tasks.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No tasks yet.</td></tr>
                  )}
                  {loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Needs Attention</h3>
                <p className="text-xs text-gray-400 mt-0.5">Overdue or unallocated tasks</p>
              </div>
              <div className="divide-y divide-gray-50">
                {needsAttention.map((t) => (
                  <div key={t.task_id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{t.title}</p>
                      <Badge status={t.status} />
                    </div>
                    <p className={`text-xs mt-1 ${isOverdue(t) ? 'text-red-500' : 'text-gray-400'}`}>Due {fmtDate(t.end_datetime)}{isOverdue(t) ? ' · Overdue' : ''}</p>
                  </div>
                ))}
                {needsAttention.length === 0 && <div className="px-5 py-6 text-center text-gray-400 text-sm">Nothing needs attention.</div>}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h3>
              {[
                { label: 'Allocate Tasks', to: '/pm/allocate' },
                { label: 'View Team', to: '/pm/team' },
                { label: 'Working Hours Report', to: '/pm/reports' },
              ].map((a) => (
                <Link key={a.label} to={a.to} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-primary-50 text-primary-700 hover:bg-primary-100">
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
