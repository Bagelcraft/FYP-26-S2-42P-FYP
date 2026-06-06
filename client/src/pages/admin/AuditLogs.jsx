import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const mockLogs = [
  { id: 1, action: 'User login', user: 'orgadmin@techcorp.com', org: 'TechCorp Pte Ltd', time: '2 min ago', category: 'AUTH' },
  { id: 2, action: 'Task auto-allocated', user: 'pm@techcorp.com', org: 'TechCorp Pte Ltd', time: '15 min ago', category: 'TASK' },
  { id: 3, action: 'Subscription renewed', user: 'system', org: 'BuildTech Solutions', time: '1 hr ago', category: 'BILLING' },
  { id: 4, action: 'New organisation registered', user: 'system', org: '—', time: '3 hr ago', category: 'SYSTEM' },
  { id: 5, action: 'Staff account created', user: 'orgadmin@buildtech.com', org: 'BuildTech Solutions', time: '5 hr ago', category: 'STAFF' },
  { id: 6, action: 'Organisation suspended', user: 'sysadmin', org: 'LogiCore Asia', time: '1 day ago', category: 'SYSTEM' },
  { id: 7, action: 'Password reset requested', user: 'worker@logicore.com', org: 'LogiCore Asia', time: '1 day ago', category: 'AUTH' },
];

const CATEGORY_COLORS = {
  AUTH: 'bg-blue-100 text-blue-700',
  TASK: 'bg-purple-100 text-purple-700',
  BILLING: 'bg-green-100 text-green-700',
  SYSTEM: 'bg-gray-100 text-gray-600',
  STAFF: 'bg-orange-100 text-orange-700',
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  const filtered = mockLogs.filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'ALL' || l.category === category;
    return matchSearch && matchCat;
  });

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">SUGGESTION TO REMOVE AS NOT PART OF STORYBOARD - Audit Logs </h2>
          <p className="text-gray-500 text-sm mt-0.5">Full audit trail of all platform activity.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Categories</option>
            <option value="AUTH">Auth</option>
            <option value="TASK">Task</option>
            <option value="BILLING">Billing</option>
            <option value="SYSTEM">System</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>

        {/* Log table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Action</th>
                <th className="px-5 py-3 text-left font-medium">User</th>
                <th className="px-5 py-3 text-left font-medium">Organisation</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{log.action}</td>
                  <td className="px-5 py-3 text-gray-600">{log.user}</td>
                  <td className="px-5 py-3 text-gray-500">{log.org}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[log.category]}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{log.time}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">No logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}