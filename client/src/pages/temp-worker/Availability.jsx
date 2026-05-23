import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { TEMP_NAV } from './nav';

const mockSlots = [
  { id: 1, date: 'Mon 26 May', time: '09:00 – 17:00', status: 'AVAILABLE' },
  { id: 2, date: 'Wed 28 May', time: '13:00 – 18:00', status: 'AVAILABLE' },
  { id: 3, date: 'Fri 30 May', time: '—', status: 'UNAVAILABLE' },
];

export default function Availability() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', start: '', end: '' });

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Availability</h2>
            <p className="text-gray-500 text-sm mt-0.5">Tell us when you are available so tasks can be allocated to you.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Slot
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">New Availability Slot</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                <input
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
              <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {mockSlots.map((slot) => (
            <div key={slot.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{slot.date}</p>
                <p className="text-xs text-gray-400 mt-0.5">{slot.time}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={slot.status} />
                <button className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}