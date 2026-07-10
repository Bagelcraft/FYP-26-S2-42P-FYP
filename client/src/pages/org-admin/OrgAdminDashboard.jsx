import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { ORG_ADMIN_NAV } from './nav';
import api from '../../utils/api';

export default function OrgAdminDashboard() {
  const [depts, setDepts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/org-admin/departments'),
      api.get('/org-admin/staff'),
      api.get('/org-admin/roles'),
      api.get('/org-admin/skills'),
    ]).then(([d, st, r, sk]) => {
      setDepts(d.data.data ?? []);
      setStaff(st.data.data ?? []);
      setRoles(r.data.data ?? []);
      setSkills(sk.data.data ?? []);
    }).catch((e) => setError(e.response?.data?.message || 'Failed to load overview.'));
  }, []);

  const steps = [
    { label: 'Add departments', done: depts.length > 0 },
    { label: 'Register employees', done: staff.length > 0 },
    { label: 'Define roles', done: roles.length > 0 },
    { label: 'Register skills', done: skills.length > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Organisation Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage staff, departments, and skills.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Setup progress */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 text-sm">Setup Progress</h3>
            <span className="text-xs text-gray-500">{doneCount}/{steps.length} steps · {pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <span className={s.done ? 'text-green-500' : 'text-gray-300'}>{s.done ? '✓' : '○'}</span>
                <span className={s.done ? 'text-gray-600' : 'text-gray-400'}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'DEPARTMENTS', value: depts.length },
            { label: 'EMPLOYEES', value: staff.length },
            { label: 'ROLES', value: roles.length },
            { label: 'SKILLS TRACKED', value: skills.length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Departments + skills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Departments</h3>
            <Link to="/org-admin/departments" className="text-primary-600 text-sm hover:underline">Manage</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Department</th>
                  <th className="px-5 py-3 text-left font-medium">Head</th>
                  <th className="px-5 py-3 text-left font-medium">Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {depts.map((d) => (
                  <tr key={d.department_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-5 py-3 text-gray-600">{d.head?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{d._count?.tasks ?? 0}</td>
                  </tr>
                ))}
                {depts.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No departments yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Skills Registered</h3>
              <Link to="/org-admin/skills" className="text-primary-600 text-sm hover:underline">Manage</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s.skill_id} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{s.skill_name}</span>
              ))}
              {skills.length === 0 && <span className="text-gray-300 text-xs">No skills registered.</span>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
