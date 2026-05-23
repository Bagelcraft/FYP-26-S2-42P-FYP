import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { WORKER_NAV } from './nav';

const mockLeave = [
  { id: 1, type: 'Annual Leave', from: '2026-06-10', to: '2026-06-12', days: 3, status: 'PENDING', note: 'Family trip' },
  { id: 2, type: 'Medical Leave', from: '2026-05-05', to: '2026-05-05', days: 1, status: 'APPROVED', note: 'Doctor appointment' },
];

export default function Leave() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Annual Leave', from: '', to: '', note: '' });

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Leave</h2>
            <p className="text-gray-500 text-sm mt-0.5">Apply for leave and view your leave history.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Apply for Leave
          </button>
        </div>

        {/* Leave balance */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Annual Leave', used: 0, total: 14, color: 'bg-green-500' },
            { label: 'Medical Leave', used: 1, total: 14, color: 'bg-blue-500' },
            { label: 'Hospitalisation', used: 0, total: 60, color: 'bg-purple-500' },
          ].map((b) => (
            <div key={b.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium">{b.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{b.total - b.used} days</p>
              <p className="text-xs text-gray-400 mt-0.5">{b.used} used of {b.total}</p>
              <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                <div
                  className={`${b.color} h-1.5 rounded-full`}
                  style={{ width: `${Math.max(((b.total - b.used) / b.total) * 100, 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Application form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">New Leave Application</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option>Annual Leave</option>
                  <option>Medical Leave</option>
                  <option>Hospitalisation Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Reason for leave"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
              <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Submit</button>
            </div>
          </div>
        )}

        {/* Leave history */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Leave History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {mockLeave.map((l) => (
              <div key={l.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{l.type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.from} → {l.to} · {l.days} day{l.days !== 1 ? 's' : ''}</p>
                  {l.note && <p className="text-xs text-gray-400 mt-0.5">{l.note}</p>}
                </div>
                <Badge status={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}