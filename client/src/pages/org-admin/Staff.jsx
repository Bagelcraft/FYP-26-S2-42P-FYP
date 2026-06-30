import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

const TYPE_BADGE = {
  PERMANENT_WORKER: { label: 'Permanent',       color: 'bg-blue-100 text-blue-700' },
  TEMPORARY_WORKER: { label: 'Temporary',       color: 'bg-orange-100 text-orange-700' },
  PROJECT_MANAGER:  { label: 'Manager', color: 'bg-purple-100 text-purple-700' },
  ORG_ADMIN:        { label: 'Org Admin',       color: 'bg-green-100 text-green-700' },
};

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const getEmptyForm = () => ({ full_name: '', email: '', user_type: 'PERMANENT_WORKER', role_id: '', password: generatePassword() });

export default function Staff() {
  const [staff, setStaff]       = useState([]);
  const [roles, setRoles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]         = useState(getEmptyForm);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError]   = useState('');
  const [showPass, setShowPass] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/org-admin/staff'),
      api.get('/org-admin/roles'),
    ])
      .then(([sRes, rRes]) => {
        setStaff(sRes.data.data);
        setRoles(rRes.data.data);
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = staff.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.staffRole?.role_name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || s.user_type === typeFilter;
    return matchSearch && matchType;
  });

  async function handleRegister(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const body = {
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        user_type: form.user_type,
        password:  form.password,
        role_id:   form.role_id !== '' ? Number(form.role_id) : null,
      };
      const r = await api.post('/org-admin/staff', body);
      setStaff((prev) => [...prev, r.data.data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setShowModal(false);
      setForm(getEmptyForm());
    } catch (e) {
      setFormError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(member) {
    if (!confirm(`Deactivate ${member.full_name}? They will no longer be able to log in.`)) return;
    try {
      await api.patch(`/org-admin/staff/${member.userId}/deactivate`);
      setStaff((prev) => prev.filter((s) => s.userId !== member.userId));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Employee Management</h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage all employees in your organisation.</p>
          </div>
          <button onClick={() => { setShowModal(true); setFormError(''); setForm(getEmptyForm()); setShowPass(false); }}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Employee
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Filters */}
        <div className="flex gap-3">
          <input type="text" placeholder="Search by name, email or role…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ALL">All Types</option>
            <option value="PERMANENT_WORKER">Permanent</option>
            <option value="TEMPORARY_WORKER">Temporary</option>
            <option value="PROJECT_MANAGER">Manager</option>
            <option value="ORG_ADMIN">Org Admin</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium">Skills</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0">
                          {s.full_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.staffRole?.role_name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.skills?.map((us) => (
                          <span key={us.skill.skill_id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {us.skill.skill_name}
                          </span>
                        ))}
                        {(!s.skills || s.skills.length === 0) && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_BADGE[s.user_type]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_BADGE[s.user_type]?.label ?? s.user_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDeactivate(s)} className="text-xs text-red-500 hover:underline">
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Register Employee</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleRegister} className="px-6 py-5 space-y-4">
              {formError && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                  <select value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="PERMANENT_WORKER">Permanent Employee</option>
                    <option value="TEMPORARY_WORKER">Temporary Employee</option>
                    <option value="PROJECT_MANAGER">Manager</option>
                    <option value="ORG_ADMIN">Org Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Staff Role</label>
                  <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— None —</option>
                    {roles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Initial Password *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      required
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, password: generatePassword() })}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Employee should change this on first login.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Registering…' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}