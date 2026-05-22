import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

const NAV = [
  { path: '/org-admin', icon: '🏠', label: 'Dashboard' },
  { path: '/org-admin/staff', icon: '👥', label: 'Staff' },
  { path: '/org-admin/departments', icon: '🏢', label: 'Departments' },
  { path: '/org-admin/skills', icon: '🎯', label: 'Skills' },
  { path: '/org-admin/notifications', icon: '🔔', label: 'Notifications' },
];

const mockStaff = [
  { id: 1, name: 'Weishi Tan', role: 'Software Developer', type: 'PERMANENT_WORKER', dept: 'Engineering' },
  { id: 2, name: 'Rachel Ng', role: 'Contractor', type: 'TEMPORARY_WORKER', dept: 'Operations' },
  { id: 3, name: 'Basil Hia', role: 'Project Manager', type: 'PROJECT_MANAGER', dept: 'Engineering' },
];

const mockDepts = [
  { id: 1, name: 'Engineering', head: 'Basil Hia', staff: 8 },
  { id: 2, name: 'Operations', head: 'Alson Lim', staff: 4 },
];

const mockSkills = ['JavaScript', 'React', 'SQL', 'Python', 'UI/UX Design'];

const typeLabel = {
  PERMANENT_WORKER: { label: 'Permanent', color: 'bg-blue-100 text-blue-700' },
  TEMPORARY_WORKER: { label: 'Temporary', color: 'bg-orange-100 text-orange-700' },
  PROJECT_MANAGER:  { label: 'PM', color: 'bg-purple-100 text-purple-700' },
};

export default function OrgAdminDashboard() {
  return (
    <DashboardLayout navItems={NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Organisation Overview</h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage your staff, departments, and skills.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Register Staff
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Staff" value="12" sub="3 temporary" icon="👥" color="blue" />
          <StatCard label="Departments" value="2" icon="🏢" color="purple" />
          <StatCard label="Active Tasks" value="5" sub="Across all staff" icon="✅" color="green" />
          <StatCard label="Skills Registered" value="5" icon="🎯" color="yellow" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Staff list */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Staff</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {mockStaff.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold">
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.role} · {s.dept}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeLabel[s.type]?.color}`}>
                    {typeLabel[s.type]?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Departments */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Departments</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {mockDepts.map((d) => (
                  <div key={d.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400">Head: {d.head} · {d.staff} staff</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Skills</h3>
                <button className="text-primary-600 text-sm hover:underline">+ Add</button>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {mockSkills.map((skill) => (
                  <span key={skill} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}