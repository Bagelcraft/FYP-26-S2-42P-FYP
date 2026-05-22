import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

const NAV = [
  { path: '/pm', icon: '🏠', label: 'Dashboard' },
  { path: '/pm/tasks', icon: '📋', label: 'Tasks' },
  { path: '/pm/allocate', icon: '🤖', label: 'Allocate' },
  { path: '/pm/reports', icon: '📊', label: 'Reports' },
  { path: '/pm/notifications', icon: '🔔', label: 'Notifications' },
];

const mockTasks = [
  { id: 1, title: 'Build Login API', assignee: 'Weishi Tan', skill: 'JavaScript', status: 'ASSIGNED', due: '26 May' },
  { id: 2, title: 'Build Dashboard UI', assignee: 'Unassigned', skill: 'React', status: 'PENDING', due: '27 May' },
  { id: 3, title: 'Database Performance Review', assignee: 'Rachel Ng', skill: 'SQL', status: 'IN_PROGRESS', due: '22 May' },
];

export default function PMDashboard() {
  return (
    <DashboardLayout navItems={NAV} roleLabel="Project Manager">
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
          <StatCard label="Total Tasks" value="3" icon="📋" color="blue" />
          <StatCard label="Pending" value="1" sub="Awaiting allocation" icon="⏳" color="yellow" />
          <StatCard label="In Progress" value="1" icon="🔄" color="purple" />
          <StatCard label="Completed" value="0" sub="This week" icon="✅" color="green" />
        </div>

        {/* Task table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
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
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
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
                    <td className="px-5 py-3 text-gray-500">{t.due}</td>
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

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Auto-Allocate Pending Tasks', icon: '🤖', color: 'bg-primary-50 border-primary-200 text-primary-700' },
            { label: 'View Working Hours Report', icon: '📊', color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'View Eligible Staff', icon: '👥', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          ].map((a) => (
            <button key={a.label} className={`border rounded-xl p-4 text-left hover:opacity-80 transition-opacity ${a.color}`}>
              <span className="text-2xl">{a.icon}</span>
              <p className="text-sm font-medium mt-2">{a.label}</p>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}