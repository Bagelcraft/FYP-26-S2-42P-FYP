import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

export default function Skills() {
  const [skills, setSkills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [certRequired, setCertRequired] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [addError, setAddError] = useState('');

  function load() {
    setLoading(true);
    api.get('/org-admin/skills')
      .then((r) => setSkills(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addSkill() {
    const name = newSkill.trim();
    if (!name) return;
    setAdding(true);
    setAddError('');
    try {
      const r = await api.post('/org-admin/skills', { skill_name: name, cert_required: certRequired });
      setSkills((prev) => [...prev, r.data.data].sort((a, b) => a.skill_name.localeCompare(b.skill_name)));
      setNewSkill('');
      setCertRequired(false);
    } catch (e) {
      setAddError(e.response?.data?.message || e.message);
    } finally {
      setAdding(false);
    }
  }

  async function removeSkill(skill) {
    // Deleting a skill in use detaches it from whoever holds it, so say so up
    // front rather than letting the admin discover it afterwards.
    const inUse = (skill._count?.userSkills ?? 0) + (skill._count?.tasks ?? 0);
    const warning = inUse
      ? `

It is currently assigned to ${skill._count?.userSkills ?? 0} employee(s) and required by ${skill._count?.tasks ?? 0} task(s). Deleting removes it from all of them.`
      : '';
    if (!confirm(`Remove skill "${skill.skill_name}"?${warning}`)) return;
    try {
      const r = await api.delete(`/org-admin/skills/${skill.skill_id}`);
      setSkills((prev) => prev.filter((s) => s.skill_id !== skill.skill_id));
      const d = r.data.data?.detached;
      if (d && (d.workers || d.roles || d.tasks)) {
        // Roles are worth calling out: the skill silently stops being required.
        alert(`"${skill.skill_name}" deleted. Removed from ${d.workers} employee(s), ${d.roles} role(s) and ${d.tasks} task(s).`);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Skills Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage skills available for task allocation and staff profiles.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Add skill */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Add New Skill</h3>
          {addError && <p className="text-red-500 text-sm mb-2">{addError}</p>}
          <div className="flex gap-3 items-center">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              placeholder="e.g. Docker"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap select-none">
              <input type="checkbox" checked={certRequired}
                onChange={(e) => setCertRequired(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              Cert required
            </label>

            <button onClick={addSkill} disabled={adding}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {adding ? 'Adding…' : 'Add Skill'}
            </button>
          </div>
        </div>

        {/* Skills list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">All Skills</h3>
            <span className="text-xs text-gray-400">{skills.length} skills registered</span>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div key={skill.skill_id}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full">
                  <span>{skill.skill_name}</span>
                  {skill.cert_required && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">cert</span>
                  )}
                  <button onClick={() => removeSkill(skill)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none ml-1">
                    ✕
                  </button>
                </div>
              ))}
              {skills.length === 0 && <p className="text-gray-400 text-sm">No skills registered yet.</p>}
            </div>
          )}
        </div>

        {/* Usage summary */}
        {skills.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Skill Usage</h3>
            <div className="space-y-3">
              {skills.map((s) => (
                <div key={s.skill_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{s.skill_name}</span>
                  <div className="flex gap-4 text-gray-400 text-xs">
                    <span>{s._count?.userSkills ?? 0} staff</span>
                    <span>{s._count?.tasks ?? 0} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}