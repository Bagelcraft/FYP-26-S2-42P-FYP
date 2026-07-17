import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';

const STATUS_META = [
  { key: 'PENDING', label: 'Pending', color: 'bg-yellow-400' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-400' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-purple-400' },
  { key: 'COMPLETED', label: 'Completed', color: 'bg-green-400' },
  { key: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-400' },
];

function downloadCsv(rows) {
  const header = ['Staff', 'Role', 'Type', 'Hours This Week', 'Tasks Completed'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header, ...rows.map((r) => [r.name, r.role, r.type, r.hoursThisWeek, r.tasksCompleted])]
    .map((cols) => cols.map(escape).join(','));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `working-hours-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pm/reports')
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load reports.'))
      .finally(() => setLoading(false));
  }, []);

  const perStaff = data?.perStaff ?? [];
  const s = data?.summary;
  const status = data?.statusCounts ?? {};

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">Overview of task completion and working hours (this week).</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        {loading ? (
          <div className="text-gray-400 text-sm py-10 text-center">Loading…</div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Tasks" value={String(s?.totalTasks ?? 0)} icon="📋" color="blue" />
              <StatCard label="Completed" value={String(s?.completed ?? 0)} sub={`${s?.completionRate ?? 0}% completion rate`} icon="✅" color="green" />
              <StatCard label="Total Hours Logged" value={`${s?.totalHours ?? 0}h`} icon="🕐" color="purple" />
              <StatCard label="Avg Hours / Staff" value={`${s?.avgHours ?? 0}h`} icon="📊" color="yellow" />
            </div>

            {/* Working hours table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Working Hours — This Week</h3>
                <button onClick={() => downloadCsv(perStaff)} disabled={perStaff.length === 0}
                  className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                  ⬇ Export CSV
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Staff</th>
                    <th className="px-5 py-3 text-left font-medium">Role</th>
                    <th className="px-5 py-3 text-left font-medium">Type</th>
                    <th className="px-5 py-3 text-left font-medium">Hours This Week</th>
                    <th className="px-5 py-3 text-left font-medium">Tasks Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {perStaff.map((st) => (
                    <tr key={st.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{st.name}</td>
                      <td className="px-5 py-3 text-gray-600">{st.role}</td>
                      <td className="px-5 py-3 text-gray-500">{st.type}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min((st.hoursThisWeek / 40) * 100, 100)}%` }} />
                          </div>
                          <span className="text-gray-700 font-medium">{st.hoursThisWeek}h</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{st.tasksCompleted}</td>
                    </tr>
                  ))}
                  {perStaff.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No staff data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Task status breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Task Status Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {STATUS_META.map((m) => (
                  <div key={m.key} className="text-center">
                    <div className={`${m.color} rounded-lg py-4 mb-2`}>
                      <span className="text-white text-2xl font-bold">{status[m.key] ?? 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
