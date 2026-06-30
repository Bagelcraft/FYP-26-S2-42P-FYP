import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';
import api from '../../utils/api';

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const mockShifts = [
  { id: 1, date: 'Mon 26 May', time: '09:00 – 18:00', dept: 'Engineering', task: 'Build Dashboard UI' },
  { id: 2, date: 'Wed 28 May', time: '09:00 – 13:00', dept: 'Operations', task: 'Inventory Audit' },
  { id: 3, date: 'Fri 30 May', time: '14:00 – 18:00', dept: 'Engineering', task: 'Code Review Session' },
];

const mockTasks = [
  { id: 3, title: 'Database Performance Review', dept: 'Operations', status: 'IN_PROGRESS', due: '22 May' },
];

const mockAvailable = [
  { id: 1, title: 'Build Dashboard UI', dept: 'Engineering', skill: 'React', due: '27 May' },
];

export default function TempWorkerDashboard() {
  const [openSession, setOpenSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [swapModal, setSwapModal] = useState(null);
  const [swapForm, setSwapForm] = useState({ reason: '', alternative: '' });

  useEffect(() => {
    api.get('/temp-worker/attendance').then((r) => {
      const open = r.data.data.find((rec) => rec.clock_out === null);
      setOpenSession(open || null);
    }).catch(() => {});
  }, []);

  const isClockedIn = Boolean(openSession);

  const handleClockIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post('/temp-worker/attendance/clock-in');
      setOpenSession(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.put('/temp-worker/attendance/clock-out');
      setOpenSession(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock out.');
    } finally {
      setActionLoading(false);
    }
  };

  const clockInButton = (
    <div className="flex items-center gap-2">
      {isClockedIn && (
        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full tracking-wide">
          CLOCKED IN
        </span>
      )}
      <button
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        disabled={actionLoading}
        className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
          isClockedIn
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {actionLoading ? 'Processing…' : isClockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  );

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee" topbarRight={clockInButton}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Day</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track your assigned tasks and manage your schedule.</p>
        </div>

        {isClockedIn && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3 text-sm text-green-700">
            Clocked in at <span className="font-semibold">{formatTime(openSession.clock_in)}</span>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ASSIGNED TASKS', value: '1', color: 'text-blue-600' },
            { label: 'UPCOMING SHIFTS', value: '3', color: 'text-yellow-600' },
            { label: 'HOURS THIS WEEK', value: isClockedIn ? 'Active' : '0h', color: isClockedIn ? 'text-green-600' : 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming shifts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Upcoming Shifts</h3>
              </div>
              {mockShifts.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No upcoming shifts.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {mockShifts.map((s) => (
                    <div key={s.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.date}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.time} · {s.dept} · {s.task}</p>
                      </div>
                      <button
                        onClick={() => { setSwapModal(s); setSwapForm({ reason: '', alternative: '' }); }}
                        className="text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Request Swap
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned tasks */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Assigned Tasks</h3>
              </div>
              {mockTasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No tasks assigned.</div>
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
                        <button className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors">
                          Update
                        </button>
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
                <p className="text-gray-400 text-xs mt-0.5">Tasks you may be allocated to based on your skills.</p>
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
          </div>

          {/* Skills */}
          <div className="space-y-4">
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

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Update Availability', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                  { label: 'View Attendance', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                ].map((a) => (
                  <button key={a.label} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.color}`}>
                    <span>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Swap Modal */}
      {swapModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Request Shift Swap</h3>
              <p className="text-xs text-gray-400 mt-0.5">{swapModal.date} · {swapModal.time}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <input
                  type="text"
                  readOnly
                  value={`${swapModal.date} · ${swapModal.time}`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Briefly explain why you need to swap this shift..."
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Alternative (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 29 May morning shift"
                  value={swapForm.alternative}
                  onChange={(e) => setSwapForm((f) => ({ ...f, alternative: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setSwapModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setSwapModal(null)}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}