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

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const todayISO = () => new Date().toISOString().slice(0, 10);
const getEmptyForm = () => ({ userId: null, full_name: '', email: '', user_type: 'PERMANENT_WORKER', role_id: '', password: generatePassword(), skill_ids: [], annual_entitled: '', medical_entitled: '', prorate_leave: false, join_date: todayISO() });

export default function Staff() {
  const [staff, setStaff]       = useState([]);
  const [roles, setRoles]       = useState([]);
  const [skills, setSkills]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modalMode, setModalMode]   = useState(null); // null | 'add' | 'edit'
  const [form, setForm]         = useState(getEmptyForm);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [skillsForId, setSkillsForId] = useState(null); // userId whose skills modal is open
  const [skillAddId, setSkillAddId]   = useState('');
  const [newSkillName, setNewSkillName] = useState('');   // inline skill creation in the register form
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [fiscalMonth, setFiscalMonth] = useState(1); // org financial-year start (1-12), for the proration preview

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/org-admin/staff'),
      api.get('/org-admin/roles'),
      api.get('/org-admin/skills'),
      api.get('/org-admin/profile'),
    ])
      .then(([sRes, rRes, skRes, pRes]) => {
        setStaff(sRes.data.data);
        setRoles(rRes.data.data);
        setSkills(skRes.data.data);
        setFiscalMonth(pRes.data.data?.fiscal_year_start_month ?? 1);
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

  const skillsMember = staff.find((s) => s.userId === skillsForId) || null;

  function openAdd() {
    setModalMode('add'); setFormError(''); setForm(getEmptyForm()); setShowPass(false); setNewSkillName('');
  }
  function openEdit(member) {
    setModalMode('edit'); setFormError('');
    setForm({
      userId: member.userId,
      full_name: member.full_name,
      email: member.email,
      user_type: member.user_type,
      role_id: member.staffRole?.role_id ?? '',
      password: '',
      skill_ids: [], annual_entitled: '', medical_entitled: '', prorate_leave: false,
    });
  }

  function toggleFormSkill(id) {
    setForm((f) => ({ ...f, skill_ids: f.skill_ids.includes(id) ? f.skill_ids.filter((x) => x !== id) : [...f.skill_ids, id] }));
  }

  // Selecting a role highlights (auto-selects) that role's required skills.
  function onRoleChange(e) {
    const role_id = e.target.value;
    const role = roles.find((r) => String(r.role_id) === role_id);
    const roleSkillIds = role ? (role.requiredSkills ?? []).map((rs) => rs.skill.skill_id) : [];
    setForm((f) => ({ ...f, role_id, skill_ids: [...new Set([...f.skill_ids, ...roleSkillIds])] }));
  }

  // Create a skill from inside the register form and auto-select it.
  async function createSkillInline() {
    const name = newSkillName.trim();
    if (!name) return;
    setCreatingSkill(true); setFormError('');
    try {
      const r = await api.post('/org-admin/skills', { skill_name: name });
      const sk = r.data.data;
      setSkills((prev) => [...prev, sk].sort((a, b) => a.skill_name.localeCompare(b.skill_name)));
      setForm((f) => ({ ...f, skill_ids: [...f.skill_ids, sk.skill_id] }));
      setNewSkillName('');
    } catch (e) {
      setFormError(e.response?.data?.message || e.message);
    } finally {
      setCreatingSkill(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      const role_id = form.role_id !== '' ? Number(form.role_id) : null;
      if (modalMode === 'add') {
        const body = { full_name: form.full_name.trim(), email: form.email.trim(), user_type: form.user_type, password: form.password, role_id, skill_ids: form.skill_ids, join_date: form.join_date || undefined };
        if (form.user_type === 'PERMANENT_WORKER') {
          body.annual_entitled = form.annual_entitled !== '' ? Number(form.annual_entitled) : 0;
          body.medical_entitled = form.medical_entitled !== '' ? Number(form.medical_entitled) : 0;
          body.prorate_leave = form.prorate_leave;
        }
        const r = await api.post('/org-admin/staff', body);
        setStaff((prev) => [...prev, r.data.data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } else {
        const body = { full_name: form.full_name.trim(), email: form.email.trim(), user_type: form.user_type, role_id };
        const r = await api.patch(`/org-admin/staff/${form.userId}`, body);
        // preserve skills (edit endpoint doesn't return them)
        setStaff((prev) => prev.map((s) => (s.userId === form.userId ? { ...s, ...r.data.data } : s)));
      }
      setModalMode(null);
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

  async function addSkill() {
    if (!skillAddId || !skillsMember) return;
    try {
      await api.post(`/org-admin/staff/${skillsMember.userId}/skills`, { skill_id: Number(skillAddId) });
      const sk = skills.find((s) => s.skill_id === Number(skillAddId));
      setStaff((prev) => prev.map((s) => s.userId === skillsMember.userId
        ? { ...s, skills: [...(s.skills || []), { skill: { skill_id: sk.skill_id, skill_name: sk.skill_name } }] }
        : s));
      setSkillAddId('');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  async function removeSkill(skillId) {
    if (!skillsMember) return;
    try {
      await api.delete(`/org-admin/staff/${skillsMember.userId}/skills/${skillId}`);
      setStaff((prev) => prev.map((s) => s.userId === skillsMember.userId
        ? { ...s, skills: (s.skills || []).filter((us) => us.skill.skill_id !== skillId) }
        : s));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  const assignedSkillIds = new Set((skillsMember?.skills || []).map((us) => us.skill.skill_id));
  const availableSkills = skills.filter((s) => !assignedSkillIds.has(s.skill_id));

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Employee Management</h2>
            <p className="text-gray-500 text-sm mt-0.5">Manage all employees in your organisation.</p>
          </div>
          <button onClick={openAdd}
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
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(s)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => { setSkillsForId(s.userId); setSkillAddId(''); }} className="text-xs text-gray-600 hover:underline">Skills</button>
                        <button onClick={() => handleDeactivate(s)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                      </div>
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

      {/* Add / Edit Employee Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{modalMode === 'add' ? 'Register Employee' : 'Edit Employee'}</h2>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
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
                  <select value={form.role_id} onChange={onRoleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— None —</option>
                    {roles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {modalMode === 'add' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Skills</label>
                  <p className="text-xs text-gray-400 mb-2">Pick what this employee can do. A role's required skills are added automatically.</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((s) => {
                      const on = form.skill_ids.includes(s.skill_id);
                      return (
                        <button type="button" key={s.skill_id} onClick={() => toggleFormSkill(s.skill_id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${on ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {on ? '✓ ' : ''}{s.skill_name}
                        </button>
                      );
                    })}
                    {skills.length === 0 && <span className="text-xs text-gray-400">No skills yet — create one below.</span>}
                  </div>
                  <div className="flex gap-2">
                    <input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createSkillInline(); } }}
                      placeholder="Create a new skill…"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <button type="button" onClick={createSkillInline} disabled={creatingSkill || !newSkillName.trim()}
                      className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg transition-colors whitespace-nowrap">
                      {creatingSkill ? 'Adding…' : '＋ Create'}
                    </button>
                  </div>
                </div>
              )}
              {modalMode === 'add' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date joined</label>
                  <input type="date" value={form.join_date}
                    onChange={(e) => setForm({ ...form, join_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              )}
              {modalMode === 'add' && form.user_type === 'PERMANENT_WORKER' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Annual leave (days)</label>
                    <input type="number" min="0" value={form.annual_entitled}
                      onChange={(e) => setForm({ ...form, annual_entitled: e.target.value })}
                      placeholder="e.g. 14"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medical leave (days)</label>
                    <input type="number" min="0" value={form.medical_entitled}
                      onChange={(e) => setForm({ ...form, medical_entitled: e.target.value })}
                      placeholder="e.g. 14"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
              )}
              {modalMode === 'add' && form.user_type === 'PERMANENT_WORKER' && (
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.prorate_leave}
                    onChange={(e) => setForm({ ...form, prorate_leave: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span>
                    Prorate leave for mid-cycle join
                    <span className="block text-xs text-gray-400">
                      Scales the entitlement by the months left in the financial year (starting {MONTHS_SHORT[fiscalMonth - 1]}) from the join date.
                      {form.prorate_leave && (() => {
                        const joinMonth = form.join_date ? new Date(form.join_date).getMonth() : new Date().getMonth();
                        const monthsElapsed = ((joinMonth - (fiscalMonth - 1)) + 12) % 12;
                        const monthsRemaining = 12 - monthsElapsed;
                        const pro = (v) => Math.round(((Number(v) || 0) * monthsRemaining) / 12);
                        return <span className="text-gray-600"> {monthsRemaining}/12 of the year → Annual {pro(form.annual_entitled)} · Medical {pro(form.medical_entitled)} day(s).</span>;
                      })()}
                    </span>
                  </span>
                </label>
              )}
              {modalMode === 'add' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Initial Password *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input required type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <button type="button" onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })}
                      className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap">
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Employee should change this on first login.</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Saving…' : modalMode === 'add' ? 'Register Employee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Skills Modal */}
      {skillsMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSkillsForId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Skills — {skillsMember.full_name}</h2>
              <button onClick={() => setSkillsForId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Assigned skills</label>
                <div className="flex flex-wrap gap-2">
                  {(skillsMember.skills || []).map((us) => (
                    <span key={us.skill.skill_id} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      {us.skill.skill_name}
                      <button onClick={() => removeSkill(us.skill.skill_id)} className="text-gray-400 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                  {(!skillsMember.skills || skillsMember.skills.length === 0) && <span className="text-gray-300 text-xs">No skills yet.</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Add a skill</label>
                <div className="flex gap-2">
                  <select value={skillAddId} onChange={(e) => setSkillAddId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Select a skill —</option>
                    {availableSkills.map((s) => <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>)}
                  </select>
                  <button onClick={addSkill} disabled={!skillAddId}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    Add
                  </button>
                </div>
                {availableSkills.length === 0 && <p className="text-xs text-gray-400 mt-1">All org skills already assigned.</p>}
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button onClick={() => setSkillsForId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
