import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { PM_NAV, PM_SECONDARY } from './nav';

const mockTasks = [
  { id: 1, title: 'Build Login API', assignee: 'Weishi Tan', skill: 'JavaScript', status: 'ASSIGNED', due: '26 May', overdue: false },
  { id: 2, title: 'Build Dashboard UI', assignee: 'Unassigned', skill: 'React', status: 'PENDING', due: '27 May', overdue: false },
  { id: 3, title: 'Database Performance Review', assignee: 'Rachel Ng', skill: 'SQL', status: 'IN_PROGRESS', due: '22 May', overdue: true },
  { id: 4, title: 'API Rate Limiting', assignee: 'Unassigned', skill: 'JavaScript', status: 'PENDING', due: '28 May', overdue: false },
  { id: 5, title: 'Mobile Responsive Audit', assignee: 'Zara Osman', skill: 'UI/UX Design', status: 'IN_PROGRESS', due: '24 May', overdue: false },
];

const needsAttention = mockTasks.filter((t) => t.overdue || t.status === 'PENDING');

export default function PMDashboard() {
  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Task Overview</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create tasks and manage staff allocation.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Create Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL TASKS', value: '5', color: 'text-blue-600' },
            { label: 'PENDING', value: '2', color: 'text-yellow-600' },
            { label: 'IN PROGRESS', value: '2', color: 'text-purple-600' },
            { label: 'COMPLETED', value: '0', color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Task table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">All Tasks</h3>
              <div className="flex gap-2">
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Assigned</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
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
                    <th className="px-5 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{t.title}</td>
                      <td className="px-5 py-3 text-gray-600">{t.assignee}</td>
                      <td className="px-5 py-3">
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t.skill}</span>
                      </td>
                      <td className={`px-5 py-3 text-sm ${t.overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {t.due}{t.overdue && ' ⚠'}
                      </td>
                      <td className="px-5 py-3"><Badge status={t.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button className="text-xs text-primary-600 hover:underline">Edit</button>
                          {t.status === 'PENDING' && (
                            <button className="text-xs text-green-600 hover:underline">Allocate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  <div key={t.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{t.title}</p>
                      <Badge status={t.status} />
                    </div>
                    <p className={`text-xs mt-1 ${t.overdue ? 'text-red-500' : 'text-gray-400'}`}>
                      Due {t.due}{t.overdue ? ' · Overdue' : ''}
                    </p>
                    {t.status === 'PENDING' && (
                      <button className="mt-2 text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors">
                        Allocate now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h3>
              {[
                { label: 'Auto-Allocate Pending', icon: '🤖', color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
                { label: 'View Team Availability', icon: '📅', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: 'Working Hours Report', icon: '📊', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              ].map((a) => (
                <button key={a.label} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.color}`}>
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}