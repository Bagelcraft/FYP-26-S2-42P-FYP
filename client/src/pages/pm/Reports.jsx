import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import { PM_NAV, PM_SECONDARY } from './nav';

const staffHours = [
  { name: 'Weishi Tan', dept: 'Engineering', hoursThisWeek: 38, tasksCompleted: 2, type: 'Permanent' },
  { name: 'Rachel Ng', dept: 'Operations', hoursThisWeek: 22, tasksCompleted: 1, type: 'Temporary' },
  { name: 'Alson Lim', dept: 'Operations', hoursThisWeek: 40, tasksCompleted: 0, type: 'Permanent' },
];

export default function Reports() {
  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">Overview of task completion and working hours.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tasks This Week" value="5" icon="📋" color="blue" />
          <StatCard label="Completed" value="1" sub="20% completion rate" icon="✅" color="green" />
          <StatCard label="Total Hours Logged" value="100h" icon="🕐" color="purple" />
          <StatCard label="Avg Hours / Staff" value="33h" icon="📊" color="yellow" />
        </div>

        {/* Working hours table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Working Hours — This Week</h3>
            <button className="text-sm text-primary-600 hover:underline">Export CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Staff</th>
                <th className="px-5 py-3 text-left font-medium">Department</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Hours This Week</th>
                <th className="px-5 py-3 text-left font-medium">Tasks Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffHours.map((s) => (
                <tr key={s.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-600">{s.dept}</td>
                  <td className="px-5 py-3 text-gray-500">{s.type}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((s.hoursThisWeek / 40) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-medium">{s.hoursThisWeek}h</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.tasksCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Task status breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Task Status Breakdown</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Pending', count: 2, color: 'bg-yellow-400' },
              { label: 'Assigned', count: 1, color: 'bg-blue-400' },
              { label: 'In Progress', count: 1, color: 'bg-purple-400' },
              { label: 'Completed', count: 1, color: 'bg-green-400' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`${s.color} rounded-lg py-4 mb-2`}>
                  <span className="text-white text-2xl font-bold">{s.count}</span>
                </div>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}