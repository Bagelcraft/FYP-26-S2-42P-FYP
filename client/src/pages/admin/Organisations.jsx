import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ADMIN_NAV } from './nav';

const mockOrgs = [
  { id: 1, name: 'TechCorp Pte Ltd', status: 'ACTIVE', staff: 12, plan: 'Pro', created: '2026-01-15' },
  { id: 2, name: 'BuildTech Solutions', status: 'ACTIVE', staff: 8, plan: 'Basic', created: '2026-02-20' },
  { id: 3, name: 'LogiCore Asia', status: 'SUSPENDED', staff: 5, plan: 'Pro', created: '2026-03-10' },
];

export default function Organisations() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filtered = mockOrgs.filter((o) => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Organisations</h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage all registered organisations on the platform.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Organisation
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search organisations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Organisation</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-left font-medium">Staff</th>
                <th className="px-5 py-3 text-left font-medium">Registered</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{org.name}</td>
                  <td className="px-5 py-3 text-gray-600">{org.plan}</td>
                  <td className="px-5 py-3 text-gray-600">{org.staff}</td>
                  <td className="px-5 py-3 text-gray-500">{org.created}</td>
                  <td className="px-5 py-3"><Badge status={org.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button className="text-xs text-primary-600 hover:underline">View</button>
                      <button className="text-xs text-yellow-600 hover:underline">
                        {org.status === 'ACTIVE' ? 'Suspend' : 'Reinstate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No organisations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}