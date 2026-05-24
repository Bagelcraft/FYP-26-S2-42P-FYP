import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ADMIN_NAV } from './nav';

const mockOrgs = [
  { id: 1, name: 'TechCorp Pte Ltd', status: 'ACTIVE', staff: 12, created: '15 Jan 2026' },
  { id: 2, name: 'BuildTech Solutions', status: 'ACTIVE', staff: 8, created: '20 Feb 2026' },
  { id: 3, name: 'LogiCore Asia', status: 'SUSPENDED', staff: 5, created: '10 Mar 2026' },
];

const mockEnquiries = [
  { id: 1, name: 'Sarah Wong', email: 'sarah@nexustech.sg', subject: 'Enterprise plan pricing', time: '2 hr ago' },
  { id: 2, name: 'David Lim', email: 'david@buildco.com', subject: 'Custom onboarding request', time: '1 day ago' },
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
          {[
            { label: 'ACTIVE ORGS', value: '3', delta: '+1 this month', color: 'text-blue-600' },
            { label: 'OPEN ENQUIRIES', value: '1', delta: 'Awaiting reply', color: 'text-yellow-600' },
            { label: 'ACTIVE SUBSCRIPTIONS', value: '2', delta: '1 suspended', color: 'text-green-600' },
            { label: 'TOTAL USERS', value: '25', delta: 'Across all orgs', color: 'text-purple-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Organisations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Organisations</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Organisation</th>
                    <th className="px-5 py-3 text-left font-medium">Staff</th>
                    <th className="px-5 py-3 text-left font-medium">Registered</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{org.name}</td>
                      <td className="px-5 py-3 text-gray-500">{org.staff}</td>
                      <td className="px-5 py-3 text-gray-500">{org.created}</td>
                      <td className="px-5 py-3"><Badge status={org.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enquiries */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Enquiries</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {mockEnquiries.map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.subject} · {e.time}</p>
                  </div>
                  <button className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors">
                    Reply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* System Logs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">System Logs</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {mockLogs.map((log, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-400">{log.user}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">System Health</h3>
            <div className="space-y-3">
              {[
                { service: 'API Server', status: 'Operational', ok: true },
                { service: 'Database', status: 'Operational', ok: true },
                { service: 'Email Service', status: 'Not configured', ok: false },
                { service: 'Task Scheduler', status: 'Operational', ok: true },
              ].map((s) => (
                <div key={s.service} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${s.ok ? 'bg-green-500' : 'bg-yellow-400'}`} />
                    <p className="text-sm text-gray-700">{s.service}</p>
                  </div>
                  <p className={`text-xs font-medium ${s.ok ? 'text-green-600' : 'text-yellow-600'}`}>{s.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}