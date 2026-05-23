import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { WORKER_NAV } from './nav';

const mockTasks = [
  { id: 1, title: 'Build Login API', dept: 'Engineering', status: 'ASSIGNED', start: '26 May 09:00', end: '26 May 18:00' },
];

export default function WorkerDashboard() {
  const [clockedIn, setClockedIn] = useState(false);

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">View your tasks, manage availability, and track attendance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Assigned Tasks" value="1" icon="📋" color="blue" />
          <StatCard label="In Progress" value="0" icon="🔄" color="purple" />
          <StatCard label="Annual Leave Left" value="12 days" icon="🌴" color="green" />
          <StatCard label="Hours Today" value={clockedIn ? '—' : '0h'} sub={clockedIn ? 'Currently clocked in' : 'Not clocked in'} icon="🕐" color="yellow" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Clock in/out */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${clockedIn ? 'bg-green-100' : 'bg-gray-100'}`}>
              🕐
            </div>
            <div>
              <p className="font-semibold text-gray-800">{clockedIn ? 'Clocked In' : 'Not Clocked In'}</p>
              <p className="text-gray-400 text-sm mt-0.5">
                {clockedIn ? 'Clock out when you are done for the day.' : 'Clock in to start tracking your hours.'}
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

          {/* Upcoming tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">My Tasks</h3>
              <button className="text-primary-600 text-sm hover:underline">View all</button>
            </div>
            {mockTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mockTasks.map((t) => (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.dept} · {t.start} → {t.end}</p>
                      </div>
                      <Badge status={t.status} />
                    </div>
                    <div className="flex gap-2 mt-3">
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
        </div>

        {/* Skills & Availability */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">My Skills</h3>
            <div className="flex flex-wrap gap-2">
              {['JavaScript', 'React'].map((s) => (
                <span key={s} className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Upcoming Availability</h3>
              <button className="text-primary-600 text-sm hover:underline">+ Add</button>
            </div>
            <div className="space-y-2">
              {[
                { date: 'Mon 26 May', time: '09:00 – 18:00', status: 'AVAILABLE' },
                { date: 'Tue 27 May', time: '09:00 – 18:00', status: 'AVAILABLE' },
              ].map((a) => (
                <div key={a.date} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{a.date} <span className="text-gray-400">{a.time}</span></span>
                  <Badge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}