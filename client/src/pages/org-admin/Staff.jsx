import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';

const mockStaff = [
  { id: 1, name: 'Weishi Tan', role: 'Software Developer', type: 'PERMANENT_WORKER', dept: 'Engineering', email: 'weishi@techcorp.com', skills: ['JavaScript', 'React'] },
  { id: 2, name: 'Rachel Ng', role: 'Contractor', type: 'TEMPORARY_WORKER', dept: 'Operations', email: 'rachel@techcorp.com', skills: ['SQL'] },
  { id: 3, name: 'Basil Hia', role: 'Project Manager', type: 'PROJECT_MANAGER', dept: 'Engineering', email: 'basil@techcorp.com', skills: ['Python', 'UI/UX Design'] },
  { id: 4, name: 'Alson Lim', role: 'Operations Lead', type: 'PERMANENT_WORKER', dept: 'Operations', email: 'alson@techcorp.com', skills: ['SQL', 'Python'] },
];

const TYPE_BADGE = {
  PERMANENT_WORKER: { label: 'Permanent', color: 'bg-blue-100 text-blue-700' },
  TEMPORARY_WORKER: { label: 'Temporary', color: 'bg-orange-100 text-orange-700' },
  PROJECT_MANAGER:  { label: 'PM', color: 'bg-purple-100 text-purple-700' },
};

export default function Staff() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = mockStaff.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || s.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Staff</h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage all staff members in your organisation.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Register Staff
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Types</option>
            <option value="PERMANENT_WORKER">Permanent</option>
            <option value="TEMPORARY_WORKER">Temporary</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
          </select>
        </div>

        {/* Staff table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Role</th>
                <th className="px-5 py-3 text-left font-medium">Department</th>
                <th className="px-5 py-3 text-left font-medium">Skills</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.role}</td>
                  <td className="px-5 py-3 text-gray-600">{s.dept}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.skills.map((sk) => (
                        <span key={sk} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{sk}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_BADGE[s.type]?.color}`}>
                      {TYPE_BADGE[s.type]?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No staff found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}