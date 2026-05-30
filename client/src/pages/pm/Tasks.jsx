import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { PM_NAV } from './nav';

const mockTasks = [
  { id: 1, title: 'Build Login API', assignee: 'Weishi Tan', skill: 'JavaScript', status: 'ASSIGNED', due: '26 May', dept: 'Engineering' },
  { id: 2, title: 'Build Dashboard UI', assignee: 'Unassigned', skill: 'React', status: 'PENDING', due: '27 May', dept: 'Engineering' },
  { id: 3, title: 'Database Performance Review', assignee: 'Rachel Ng', skill: 'SQL', status: 'IN_PROGRESS', due: '22 May', dept: 'Operations' },
  { id: 4, title: 'Deploy Staging Environment', assignee: 'Weishi Tan', skill: 'JavaScript', status: 'COMPLETED', due: '20 May', dept: 'Engineering' },
  { id: 5, title: 'Write API Documentation', assignee: 'Unassigned', skill: 'Python', status: 'PENDING', due: '30 May', dept: 'Engineering' },
];

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = mockTasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout navItems={PM_NAV} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tasks</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create, assign, and track all tasks.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Create Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Task table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Task</th>
                <th className="px-5 py-3 text-left font-medium">Department</th>
                <th className="px-5 py-3 text-left font-medium">Assigned To</th>
                <th className="px-5 py-3 text-left font-medium">Skill</th>
                <th className="px-5 py-3 text-left font-medium">Due</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{t.title}</td>
                  <td className="px-5 py-3 text-gray-500">{t.dept}</td>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}