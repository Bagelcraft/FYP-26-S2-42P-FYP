import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

const EMPTY_FORM = { role_name: '', max_working_hours: '', department_id: '', skill_ids: [] };

export default function StaffRoles() {
  const [roles, setRoles]     = useState([]);
  const [depts, setDepts]     = useState([]);
  const [skills, setSkills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editRole, setEditRole] = useState(null); // null=create, obj=edit
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/org-admin/roles'),
      api.get('/org-admin/departments'),
      api.get('/org-admin/skills'),
    ]).then(([r, d, s]) => { setRoles(r.data.data); setDepts(d.data.data ?? []); setSkills(s.data.data ?? []); })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditRole(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(r) {
    setEditRole(r);
    setForm({
      role_name: r.role_name,
      max_working_hours: r.max_working_hours ?? '',
      department_id: r.department?.department_id ?? '',
      skill_ids: (r.requiredSkills ?? []).map((rs) => rs.skill.skill_id),
    });
    setFormError('');
    setShowForm(true);
  }

  function toggleSkill(id) {
    setForm((f) => ({ ...f, skill_ids: f.skill_ids.includes(id) ? f.skill_ids.filter((x) => x !== id) : [...f.skill_ids, id] }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const body = {
      role_name:         form.role_name.trim(),
      max_working_hours: form.max_working_hours !== '' ? Number(form.max_working_hours) : null,
      department_id:     form.department_id !== '' ? Number(form.department_id) : null,
      skill_ids:         form.skill_ids,
    };
    try {
      if (editRole) {
        const r = await api.patch(`/org-admin/roles/${editRole.role_id}`, body);
        setRoles((prev) => prev.map((ro) => ro.role_id === editRole.role_id ? r.data.data : ro));
      } else {
        const r = await api.post('/org-admin/roles', body);
        setRoles((prev) => [...prev, r.data.data].sort((a, b) => a.role_name.localeCompare(b.role_name)));
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (!confirm(`Delete role "${role.role_name}"? Staff assigned to it will lose their role.`)) return;
    try {
      await api.delete(`/org-admin/roles/${role.role_id}`);
      setRoles((prev) => prev.filter((r) => r.role_id !== role.role_id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Role Management</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Define roles and their weekly hour limits — used by the allocation engine.
            </p>
          </div>
          <button onClick={openCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Role
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">{editRole ? 'Edit Role' : 'New Role'}</h3>
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role Name *</label>
                <input required value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  placeholder="e.g. Software Developer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Weekly Hours (leave blank for unlimited)</label>
                <input type="number" min="1" value={form.max_working_hours}
                  onChange={(e) => setForm({ ...form, max_working_hours: e.target.value })}
                  placeholder="e.g. 40"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Department</label>
                <select value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">— None —</option>
                  {depts.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Required Skills</label>
                {skills.length === 0 ? (
                  <p className="text-xs text-gray-400">No skills yet — add some in Skills Management first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => {
                      const on = form.skill_ids.includes(s.skill_id);
                      return (
                        <button type="button" key={s.skill_id} onClick={() => toggleSkill(s.skill_id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${on ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {on ? '✓ ' : ''}{s.skill_name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 hover:underline px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roles table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Role Name</th>
                  <th className="px-5 py-3 text-left font-medium">Department</th>
                  <th className="px-5 py-3 text-left font-medium">Required Skills</th>
                  <th className="px-5 py-3 text-left font-medium">Max Hours</th>
                  <th className="px-5 py-3 text-left font-medium">Staff</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((r) => (
                  <tr key={r.role_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.role_name}</td>
                    <td className="px-5 py-3 text-gray-600">{r.department?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.requiredSkills ?? []).map((rs) => (
                          <span key={rs.skill.skill_id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{rs.skill.skill_name}</span>
                        ))}
                        {(r.requiredSkills?.length ?? 0) === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {r.max_working_hours != null ? `${r.max_working_hours}h` : 'Unlimited'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r._count?.users ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(r)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(r)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No roles defined yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}