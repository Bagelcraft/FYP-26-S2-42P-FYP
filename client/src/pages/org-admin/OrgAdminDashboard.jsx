import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ORG_ADMIN_NAV } from './nav';

const mockDepts = [
  { id: 1, name: 'Engineering', head: 'Basil Hia', staff: 8 },
  { id: 2, name: 'Operations', head: 'Alson Lim', staff: 4 },
];

const mockActivity = [
  { name: 'Weishi Tan', action: 'Completed task "Build Login API"', time: '10 min ago', initials: 'WT' },
  { name: 'Rachel Ng', action: 'Requested leave for 30 May', time: '1 hr ago', initials: 'RN' },
  { name: 'Marcus Teo', action: 'Created task "API Rate Limiting"', time: '2 hr ago', initials: 'MT' },
  { name: 'Basil Hia', action: 'Allocated task to Weishi Tan', time: '3 hr ago', initials: 'BH' },
];

const mockSkills = ['JavaScript', 'React', 'SQL', 'Python', 'UI/UX Design'];

const setupSteps = [
  { label: 'Organisation profile', done: true },
  { label: 'Add departments', done: true },
  { label: 'Register employees', done: true },
  { label: 'Assign roles & skills', done: true },
  { label: 'Create first task', done: false },
];

export default function OrgAdminDashboard() {
  const doneCount = setupSteps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / setupSteps.length) * 100);

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Organisation Overview</h2>
            <p className="text-gray-500 text-sm mt-0.5">TechCorp Pte Ltd · Manage staff, departments, and skills.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Register Employee
          </button>
        </div>

        {/* Setup progress */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 text-sm">Setup Progress</h3>
            <span className="text-xs text-gray-500">{doneCount}/{setupSteps.length} steps · {pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {setupSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <span className={s.done ? 'text-green-500' : 'text-gray-300'}>
                  {s.done ? '✓' : '○'}
                </span>
                <span className={s.done ? 'text-gray-600' : 'text-gray-400'}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'DEPARTMENTS', value: '2', delta: 'Active', color: 'text-purple-600' },
            { label: 'EMPLOYEES', value: '12', delta: '3 temporary', color: 'text-blue-600' },
            { label: 'ROLES', value: '4', delta: 'Defined', color: 'text-orange-600' },
            { label: 'SKILLS TRACKED', value: '5', delta: 'Organisation-wide', color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Departments table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Departments</h3>
              <button className="text-primary-600 text-sm hover:underline">Manage</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Department</th>
                    <th className="px-5 py-3 text-left font-medium">Head</th>
                    <th className="px-5 py-3 text-left font-medium">Staff</th>
                    <th className="px-5 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockDepts.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{d.name}</td>
                      <td className="px-5 py-3 text-gray-600">{d.head}</td>
                      <td className="px-5 py-3 text-gray-500">{d.staff} members</td>
                      <td className="px-5 py-3">
                        <button className="text-xs text-primary-600 hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Skills */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Skills Registered</h3>
                <button className="text-primary-600 text-sm hover:underline">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {mockSkills.map((skill) => (
                  <span key={skill} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {mockActivity.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0 mt-0.5">
                    {a.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.action}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}