import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { WORKER_NAV } from './nav';

const mockTasks = [
  { id: 1, title: 'Build Login API', dept: 'Engineering', status: 'ASSIGNED', due: '26 May', progress: 0 },
  { id: 2, title: 'Code Review — Auth Module', dept: 'Engineering', status: 'IN_PROGRESS', due: '25 May', progress: 60 },
];

const mockAvailability = [
  { date: 'Mon 26 May', time: '09:00 – 18:00', status: 'AVAILABLE' },
  { date: 'Tue 27 May', time: '09:00 – 18:00', status: 'AVAILABLE' },
  { date: 'Wed 28 May', time: 'Annual Leave', status: 'ON_LEAVE' },
];

export default function WorkerDashboard() {
  const [clockedIn, setClockedIn] = useState(false);

  const clockInButton = (
    <div className="flex items-center gap-2">
      {clockedIn && (
        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full tracking-wide">
          CLOCKED IN
        </span>
      )}
      <button
        onClick={() => setClockedIn(!clockedIn)}
        className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
          clockedIn
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {clockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  );

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker" topbarRight={clockInButton}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Day</h2>
          <p className="text-gray-500 text-sm mt-0.5">View your tasks, manage availability, and track attendance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ASSIGNED TASKS', value: '2', delta: 'Active', color: 'text-blue-600' },
            { label: 'IN PROGRESS', value: '1', delta: 'Currently working', color: 'text-purple-600' },
            { label: 'ANNUAL LEAVE LEFT', value: '12 days', delta: 'Available', color: 'text-green-600' },
            { label: 'HOURS TODAY', value: clockedIn ? 'Active' : '0h', delta: clockedIn ? 'Currently clocked in' : 'Not clocked in', color: clockedIn ? 'text-green-600' : 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Today's Tasks</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            {mockTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mockTasks.map((t) => (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.dept} · Due {t.due}</p>
                      </div>
                      <Badge status={t.status} />
                    </div>
                    {t.status === 'IN_PROGRESS' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{t.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors">
                        Acknowledge
                      </button>
                      <button className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                        Update Progress
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Today summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Today</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shift</span>
                  <span className="text-gray-800 font-medium">09:00 – 18:00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${clockedIn ? 'text-green-600' : 'text-gray-400'}`}>
                    {clockedIn ? 'Clocked in' : 'Not started'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tasks due</span>
                  <span className="text-gray-800 font-medium">1</span>
                </div>
              </div>
            </div>

            {/* This week */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">This Week</h3>
              <div className="space-y-2">
                {mockAvailability.map((a) => (
                  <div key={a.date} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-700 font-medium">{a.date}</p>
                      <p className="text-gray-400 text-xs">{a.time}</p>
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">Quick Actions</h3>
              {[
                { label: 'Request Leave', icon: '🌴', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: 'Update Availability', icon: '📅', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label: 'View Time Sheet', icon: '🕐', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              ].map((a) => (
                <button key={a.label} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.color}`}>
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">My Skills</h3>
            <button className="text-primary-600 text-sm hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['JavaScript', 'React'].map((s) => (
              <span key={s} className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}