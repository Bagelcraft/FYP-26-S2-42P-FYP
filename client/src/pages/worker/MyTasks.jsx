import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { WORKER_NAV } from './nav';

const mockTasks = [
  { id: 1, title: 'Build Login API', dept: 'Engineering', status: 'ASSIGNED', start: '26 May 09:00', end: '26 May 18:00', skill: 'JavaScript' },
  { id: 2, title: 'Code Review — Auth Module', dept: 'Engineering', status: 'IN_PROGRESS', start: '24 May 10:00', end: '24 May 14:00', skill: 'JavaScript' },
];

export default function MyTasks() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = mockTasks.filter(
    (t) => statusFilter === 'ALL' || t.status === statusFilter,
  );

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Tasks</h2>
            <p className="text-gray-500 text-sm mt-0.5">All tasks currently assigned to you.</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.dept} · {t.skill}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.start} → {t.end}</p>
                </div>
                <Badge status={t.status} />
              </div>
              <div className="flex gap-2 mt-4">
                {t.status === 'ASSIGNED' && (
                  <button className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    Acknowledge
                  </button>
                )}
                {(t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS') && (
                  <button className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                    Update Progress
                  </button>
                )}
                {t.status === 'IN_PROGRESS' && (
                  <button className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-gray-400 text-sm">
              No tasks found.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}