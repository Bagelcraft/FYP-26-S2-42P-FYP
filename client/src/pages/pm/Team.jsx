import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

// Mock roster — replace with GET /pm/team (TechCorp staff) when the API lands.
const mockStaff = [
  { id: 5,  name: 'Weishi Tan',      type: 'PERMANENT_WORKER', role: 'Software Developer', dept: 'Engineering', skills: ['JavaScript', 'React'],  weeklyHours: 38, maxHours: 40, status: 'AVAILABLE' },
  { id: 6,  name: 'Rachel Ng',       type: 'TEMPORARY_WORKER', role: 'Contractor',         dept: 'Operations',  skills: ['JavaScript', 'SQL'],    weeklyHours: 18, maxHours: 20, status: 'AVAILABLE' },
  { id: 7,  name: 'Chen Jie',        type: 'PERMANENT_WORKER', role: 'Software Developer', dept: 'Engineering', skills: ['JavaScript', 'Python'], weeklyHours: 24, maxHours: 40, status: 'AVAILABLE' },
  { id: 8,  name: 'Priya Sharma',    type: 'PERMANENT_WORKER', role: 'Software Developer', dept: 'Engineering', skills: ['React', 'Python'],      weeklyHours: 32, maxHours: 40, status: 'AVAILABLE' },
  { id: 9,  name: 'Faisal Ahmad',    type: 'PERMANENT_WORKER', role: 'Software Developer', dept: 'Operations',  skills: ['SQL'],                  weeklyHours: 40, maxHours: 40, status: 'AVAILABLE' },
  { id: 10, name: 'Nadia Binte Ali', type: 'PERMANENT_WORKER', role: 'UI/UX Designer',     dept: 'Engineering', skills: ['UI/UX Design'],         weeklyHours: 20, maxHours: 40, status: 'AVAILABLE' },
  { id: 11, name: 'Ryan Lim',        type: 'TEMPORARY_WORKER', role: 'Contractor',         dept: 'Engineering', skills: ['React'],                weeklyHours: 8,  maxHours: 20, status: 'ON_LEAVE' },
  { id: 12, name: 'May Tan',         type: 'TEMPORARY_WORKER', role: 'Contractor',         dept: 'Engineering', skills: ['UI/UX Design'],         weeklyHours: 6,  maxHours: 20, status: 'AVAILABLE' },
];

const TYPE_BADGE = {
  PERMANENT_WORKER: { label: 'Permanent Employee', color: 'bg-blue-100 text-blue-700' },
  TEMPORARY_WORKER: { label: 'Temporary Employee', color: 'bg-orange-100 text-orange-700' },
};

export default function Team() {
  const [staff, setStaff] = useState(mockStaff);
  const [demo, setDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // TODO(backend): add GET /pm/team (manager-scoped roster with weekly hours +
  // availability). Until then we fall back to the sample roster below.
  useEffect(() => {
    api.get('/pm/team')
      .then((r) => setStaff(r.data.data))
      .catch(() => setDemo(true));
  }, []);

  const filtered = staff.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || s.type === typeFilter;
    return matchSearch && matchType;
  });

  const perm = staff.filter((s) => s.type === 'PERMANENT_WORKER').length;
  const temp = staff.filter((s) => s.type === 'TEMPORARY_WORKER').length;
  const onLeave = staff.filter((s) => s.status === 'ON_LEAVE').length;

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Team</h2>
          <p className="text-gray-500 text-sm mt-0.5">View all team members, their skills, capacity and availability.</p>
        </div>

        {demo && <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-xs text-yellow-700">Showing sample roster — <span className="font-medium">GET /pm/team</span> is not implemented yet.</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={mockStaff.length} icon="👥" color="blue" />
          <StatCard label="Permanent Employees" value={perm} icon="🧑‍💼" color="purple" />
          <StatCard label="Temporary Employees" value={temp} icon="🕓" color="yellow" />
          <StatCard label="On Leave" value={onLeave} icon="🌴" color="green" />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Types</option>
            <option value="PERMANENT_WORKER">Permanent Employee</option>
            <option value="TEMPORARY_WORKER">Temporary Employee</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Member</th>
                <th className="px-5 py-3 text-left font-medium">Role · Dept</th>
                <th className="px-5 py-3 text-left font-medium">Skills</th>
                <th className="px-5 py-3 text-left font-medium">Weekly Capacity</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => {
                const pct = Math.min((s.weeklyHours / s.maxHours) * 100, 100);
                const barColor = pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-yellow-500' : 'bg-primary-500';
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0">{s.name[0]}</div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.role}<span className="block text-xs text-gray-400">{s.dept}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.skills.map((sk) => (
                          <span key={sk} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{sk}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-100 rounded-full h-1.5 w-20">
                          <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{s.weeklyHours}/{s.maxHours}h</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_BADGE[s.type].color}`}>{TYPE_BADGE[s.type].label}</span>
                    </td>
                    <td className="px-5 py-3"><Badge status={s.status} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
