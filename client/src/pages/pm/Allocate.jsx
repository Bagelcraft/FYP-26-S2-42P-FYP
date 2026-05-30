import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { PM_NAV } from './nav';

const pendingTasks = [
  { id: 2, title: 'Build Dashboard UI', skill: 'React', due: '27 May', dept: 'Engineering' },
  { id: 5, title: 'Write API Documentation', skill: 'Python', due: '30 May', dept: 'Engineering' },
];

const eligibleStaff = {
  React: [{ id: 1, name: 'Weishi Tan', type: 'Permanent', available: true }],
  Python: [
    { id: 3, name: 'Basil Hia', type: 'PM', available: false },
    { id: 4, name: 'Alson Lim', type: 'Permanent', available: true },
  ],
};

export default function Allocate() {
  const [allocating, setAllocating] = useState(null);

  return (
    <DashboardLayout navItems={PM_NAV} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Allocate</h2>
            <p className="text-gray-500 text-sm mt-0.5">Assign pending tasks to eligible staff automatically or manually.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            🤖 Auto-Allocate All
          </button>
        </div>

        {/* Pending tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Pending Tasks</h3>
            <p className="text-xs text-gray-400 mt-0.5">{pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} awaiting allocation</p>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.map((t) => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.dept} · Requires: <span className="font-medium text-gray-600">{t.skill}</span> · Due {t.due}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge status="PENDING" />
                    <button
                      onClick={() => setAllocating(allocating === t.id ? null : t.id)}
                      className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {allocating === t.id ? 'Cancel' : 'Manually Assign'}
                    </button>
                  </div>
                </div>

                {/* Eligible staff panel */}
                {allocating === t.id && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Eligible Staff ({t.skill})</p>
                    <div className="space-y-2">
                      {(eligibleStaff[t.skill] || []).map((s) => (
                        <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                              {s.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.type}</p>
                            </div>
                          </div>
                          <button
                            disabled={!s.available}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              s.available
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {s.available ? 'Assign' : 'Unavailable'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No pending tasks to allocate.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}