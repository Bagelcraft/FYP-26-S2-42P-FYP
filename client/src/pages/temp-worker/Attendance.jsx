import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { TEMP_NAV } from './nav';

const mockAttendance = [
  { date: '22 May 2026', clockIn: '09:00', clockOut: '17:01', hours: '8h 01m', status: 'Present' },
  { date: '21 May 2026', clockIn: '09:05', clockOut: '17:00', hours: '7h 55m', status: 'Present' },
  { date: '20 May 2026', clockIn: '—', clockOut: '—', hours: '—', status: 'Absent' },
];

const STATUS_COLOR = {
  Present: 'text-green-600',
  Absent: 'text-red-500',
};

export default function Attendance() {
  const [month, setMonth] = useState('2026-05');

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Worker">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Attendance</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your shift clock-in and clock-out records.</p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Shifts Worked', value: '2', color: 'text-green-600' },
            { label: 'Absences', value: '1', color: 'text-red-500' },
            { label: 'Hours This Month', value: '15h 56m', color: 'text-primary-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Clock In</th>
                <th className="px-5 py-3 text-left font-medium">Clock Out</th>
                <th className="px-5 py-3 text-left font-medium">Hours</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockAttendance.map((a) => (
                <tr key={a.date} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{a.date}</td>
                  <td className="px-5 py-3 text-gray-600">{a.clockIn}</td>
                  <td className="px-5 py-3 text-gray-600">{a.clockOut}</td>
                  <td className="px-5 py-3 text-gray-600">{a.hours}</td>
                  <td className={`px-5 py-3 font-medium ${STATUS_COLOR[a.status]}`}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}