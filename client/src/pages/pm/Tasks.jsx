import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

// ── helpers ────────────────────────────────────────────────────────────────
const fmtDue = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
};
const assigneeOf = (t) => t.assignments?.[0]?.assignedTo?.full_name ?? null;

const STATUS_OPTIONS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

function TaskModal({ task, depts, skills, onClose, onSaved }) {
  const editing = !!task;
  const [form, setForm] = useState(editing
    ? {
        title: task.title,
        department_id: task.department_id ? String(task.department_id) : '',
        required_skill_id: task.required_skill_id ? String(task.required_skill_id) : '',
        status: task.status,
        due: toDateInput(task.end_datetime),
        description: task.description ?? '',
      }
    : { title: '', department_id: '', required_skill_id: '', status: 'PENDING', due: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      // Schema requires start/end datetimes — default to a 09:00–18:00 working day.
      const day = form.due || new Date().toISOString().slice(0, 10);
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_datetime: `${day}T09:00:00.000Z`,
        end_datetime: `${day}T18:00:00.000Z`,
        department_id: form.department_id ? Number(form.department_id) : null,
        required_skill_id: form.required_skill_id ? Number(form.required_skill_id) : null,
      };
      let res;
      if (editing) {
        body.status = form.status;
        res = await api.patch(`/pm/tasks/${task.task_id}`, body);
      } else {
        res = await api.post('/pm/tasks', body);
      }
      onSaved(res.data.data, editing);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Task' : 'Create Task'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Task Name *</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Build Reports Export"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select value={form.department_id} onChange={set('department_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— None —</option>
                {depts.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required Skill</label>
              <select value={form.required_skill_id} onChange={set('required_skill_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— None —</option>
                {skills.map((s) => <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.due} onChange={set('due')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={set('status')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          {!editing && <p className="text-xs text-gray-400">New tasks start as <span className="font-medium text-gray-600">Pending</span> and appear in the Allocate queue.</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [depts, setDepts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/pm/tasks')
      .then((r) => setTasks(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Department/skill options for the Create/Edit Task dropdowns.
  useEffect(() => {
    api.get('/pm/departments')
      .then((r) => setDepts(r.data.data))
      .catch(() => api.get('/org-admin/departments').then((r) => setDepts(r.data.data)).catch(() => setDepts([])));
    api.get('/pm/skills')
      .then((r) => setSkills(r.data.data))
      .catch(() => api.get('/org-admin/skills').then((r) => setSkills(r.data.data)).catch(() => setSkills([])));
  }, []);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function delTask(t) {
    if (!confirm(`Delete task “${t.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/pm/tasks/${t.task_id}`);
      setTasks((prev) => prev.filter((x) => x.task_id !== t.task_id));
      showToast(`Task “${t.title}” deleted`);
    } catch (e) {
      // Service returns 409 if the task already has assignments.
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tasks</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create, assign, track and delete tasks.</p>
          </div>
          <button onClick={() => setCreating(true)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ Create Task</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="flex gap-3">
          <input type="text" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Task</th>
                  <th className="px-5 py-3 text-left font-medium">Department</th>
                  <th className="px-5 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-5 py-3 text-left font-medium">Skill</th>
                  <th className="px-5 py-3 text-left font-medium">Due</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.task_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{t.title}</td>
                    <td className="px-5 py-3 text-gray-500">{t.department?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{assigneeOf(t) ?? <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-5 py-3">
                      {t.requiredSkill ? <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t.requiredSkill.skill_name}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtDue(t.end_datetime)}</td>
                    <td className="px-5 py-3"><Badge status={t.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTask(t)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => delTask(t)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No tasks found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {creating && (
        <TaskModal
          depts={depts} skills={skills}
          onClose={() => setCreating(false)}
          onSaved={(t) => { load(); showToast(`Task “${t.title}” created`); }}
        />
      )}
      {editingTask && (
        <TaskModal
          task={editingTask} depts={depts} skills={skills}
          onClose={() => setEditingTask(null)}
          onSaved={(t) => { load(); showToast(`Task “${t.title}” updated`); }}
        />
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
