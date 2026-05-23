import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';

const mockTasks = [
  { id: 3, title: 'Database Performance Review', dept: 'Operations', status: 'IN_PROGRESS', due: '22 May' },
];

const mockAvailable = [
  { id: 1, title: 'Build Dashboard UI', dept: 'Engineering', skill: 'React', due: '27 May' },
];

export default function TempWorkerDashboard() {
  const [clockedIn, setClockedIn] = useState(false);

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Worker">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track your assigned tasks and manage your schedule.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Assigned Tasks" value="1" icon="📋" color="blue" />
          <StatCard label="Available Tasks" value="1" sub="You may be allocated" icon="📬" color="yellow" />
          <StatCard label="Hours This Week" value={clockedIn ? 'Active' : '0h'} icon="🕐" color="green" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Clock in/out */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${clockedIn ? 'bg-green-100' : 'bg-gray-100'}`}>
              🕐
            </div>
            <div>
              <p className="font-semibold text-gray-800">{clockedIn ? 'Clocked In' : 'Not Clocked In'}</p>
              <p className="text-gray-400 text-sm mt-0.5">
                {clockedIn ? 'Remember to clock out at end of shift.' : 'Clock in to begin your shift.'}
              </p>
            </div>
            <button
              onClick={() => setClockedIn(!clockedIn)}
              className={`w-full font-medium py-2.5 rounded-lg text-sm transition-colors ${
                clockedIn
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {clockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </div>

          {/* Assigned tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Assigned Tasks</h3>
            </div>
            {mockTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mockTasks.map((t) => (
                  <div key={t.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.dept} · Due {t.due}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={t.status} />
                      <button className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg">
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available tasks pool */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Available Task Pool</h3>
            <p className="text-gray-400 text-xs mt-0.5">Tasks you may be allocated to based on your skills and availability.</p>
          </div>
          {mockAvailable.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No available tasks at this time.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mockAvailable.map((t) => (
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

        {/* Skills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">My Skills</h3>
            <button className="text-primary-600 text-sm hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['JavaScript', 'SQL'].map((s) => (
              <span key={s} className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}