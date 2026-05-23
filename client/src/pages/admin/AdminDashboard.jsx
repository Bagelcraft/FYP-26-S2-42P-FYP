import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { ADMIN_NAV } from './nav';

const mockOrgs = [
  { id: 1, name: 'TechCorp Pte Ltd', status: 'ACTIVE', staff: 12, created: '2026-01-15' },
  { id: 2, name: 'BuildTech Solutions', status: 'ACTIVE', staff: 8, created: '2026-02-20' },
  { id: 3, name: 'LogiCore Asia', status: 'SUSPENDED', staff: 5, created: '2026-03-10' },
];

const mockLogs = [
  { action: 'User login', user: 'orgadmin@techcorp.com', time: '2 min ago' },
  { action: 'Task auto-allocated', user: 'pm@techcorp.com', time: '15 min ago' },
  { action: 'Subscription renewed', user: 'system', time: '1 hr ago' },
  { action: 'New organisation registered', user: 'system', time: '3 hr ago' },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">System Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Platform-wide health and organisation status.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Organisations" value="3" sub="+1 this month" icon="🏢" color="blue" />
          <StatCard label="Active Subscriptions" value="2" sub="1 suspended" icon="✅" color="green" />
          <StatCard label="Total Users" value="25" sub="Across all orgs" icon="👥" color="purple" />
          <StatCard label="System Status" value="Online" sub="All services running" icon="💚" color="green" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Organisations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Organisations</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {mockOrgs.map((org) => (
                <div key={org.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{org.name}</p>
                    <p className="text-xs text-gray-400">{org.staff} staff · Registered {org.created}</p>
                  </div>
                  <Badge status={org.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Audit Logs</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {mockLogs.map((log, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-400">{log.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">System Health</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { service: 'API Server', status: 'Operational', color: 'text-green-600' },
              { service: 'Database', status: 'Operational', color: 'text-green-600' },
              { service: 'Email Service', status: 'Not configured', color: 'text-yellow-600' },
            ].map((s) => (
              <div key={s.service} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${s.color === 'text-green-600' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.service}</p>
                  <p className={`text-xs ${s.color}`}>{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}