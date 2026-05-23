import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';

const mockAssigned = [
  { id: 3, title: 'Database Performance Review', dept: 'Operations', skill: 'SQL', status: 'IN_PROGRESS', due: '22 May' },
];

const mockPool = [
  { id: 1, title: 'Build Dashboard UI', dept: 'Engineering', skill: 'React', due: '27 May' },
  { id: 2, title: 'Write API Documentation', dept: 'Engineering', skill: 'Python', due: '30 May' },
];

export default function MyTasks() {
  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Worker">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Tasks</h2>
          <p className="text-gray-500 text-sm mt-0.5">Your assigned tasks and the available task pool.</p>
        </div>

        {/* Assigned tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Assigned Tasks</h3>
          </div>
          {mockAssigned.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mockAssigned.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.dept} · {t.skill} · Due {t.due}</p>
                    </div>
                    <Badge status={t.status} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                      Update Progress
                    </button>
                    {t.status === 'IN_PROGRESS' && (
                      <button className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available task pool */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Available Task Pool</h3>
            <p className="text-gray-400 text-xs mt-0.5">Tasks you may be allocated to based on your skills and availability.</p>
          </div>
          {mockPool.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No available tasks at this time.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mockPool.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.dept} · Requires: {t.skill} · Due {t.due}</p>
                  </div>
                  <Badge status="PENDING" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}