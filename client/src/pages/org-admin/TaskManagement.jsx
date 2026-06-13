import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

const STATUS_OPTIONS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const fmtDt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const toInputDt = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

const assigneeOf = (t) => t.assignments?.[0]?.assignedTo?.full_name ?? null;

// ── Task modal (create & edit) ──────────────────────────────────────────────
function TaskModal({ task, depts, skills, onClose, onSaved }) {
  const editing = !!task;

  const [form, setForm] = useState(
    editing
      ? {
          title:             task.title,
          description:       task.description ?? '',
          department_id:     task.department_id ? String(task.department_id) : '',
          required_skill_id: task.required_skill_id ? String(task.required_skill_id) : '',
          start_datetime:    toInputDt(task.start_datetime),
          end_datetime:      toInputDt(task.end_datetime),
          status:            task.status,
        }
      : {
          title:             '',
          description:       '',
          department_id:     '',
          required_skill_id: '',
          start_datetime:    '',
          end_datetime:      '',
          status:            'PENDING',
        },
  );

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        title:             form.title.trim(),
        description:       form.description.trim() || null,
        department_id:     form.department_id     ? Number(form.department_id)     : null,
        required_skill_id: form.required_skill_id ? Number(form.required_skill_id) : null,
        start_datetime:    form.start_datetime || new Date().toISOString(),
        end_datetime:      form.end_datetime   || new Date().toISOString(),
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
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message,
      );
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Task' : 'Create Task'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className={labelCls}>Task Title *</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Install HVAC Unit – Bay 3"
              className={inputCls} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Department</label>
              <select value={form.department_id} onChange={set('department_id')} className={inputCls}>
                <option value="">— None —</option>
                {depts.map((d) => (
                  <option key={d.department_id} value={d.department_id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Required Skill</label>
              <select value={form.required_skill_id} onChange={set('required_skill_id')} className={inputCls}>
                <option value="">— None —</option>
                {skills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date & Time *</label>
              <input required type="datetime-local" value={form.start_datetime} onChange={set('start_datetime')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date & Time *</label>
              <input required type="datetime-local" value={form.end_datetime} onChange={set('end_datetime')} className={inputCls} />
            </div>
          </div>

          {editing && (
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea rows={3} value={form.description} onChange={set('description')}
              placeholder="Additional details about this task…"
              className={`${inputCls} resize-none`} />
          </div>

          {!editing && (
            <p className="text-xs text-gray-400">
              New tasks start as <span className="font-medium text-gray-600">Pending</span>. You can assign them to employees after creation.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function TaskManagement() {
  const [tasks,        setTasks]        = useState([]);
  const [depts,        setDepts]        = useState([]);
  const [skills,       setSkills]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter,   setDeptFilter]   = useState('ALL');
  const [search,       setSearch]       = useState('');
  const [creating,     setCreating]     = useState(false);
  const [editingTask,  setEditingTask]  = useState(null);
  const [toast,        setToast]        = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/pm/tasks')
      .then((r) => setTasks(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/org-admin/departments')
      .then((r) => setDepts(r.data.data))
      .catch(() => setDepts([]));
    api.get('/org-admin/skills')
      .then((r) => setSkills(r.data.data))
      .catch(() => setSkills([]));
  }, []);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchDept   = deptFilter   === 'ALL' || String(t.department_id) === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  async function handleDelete(t) {
    if (!confirm(`Delete task "${t.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/pm/tasks/${t.task_id}`);
      setTasks((prev) => prev.filter((x) => x.task_id !== t.task_id));
      showToast(`Task "${t.title}" deleted`);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  // Summary counts
  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Task Management</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create, update, and delete tasks for your organisation.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Create Task
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending',     key: 'PENDING',     color: 'text-yellow-600' },
            { label: 'Assigned',    key: 'ASSIGNED',    color: 'text-blue-600'   },
            { label: 'In Progress', key: 'IN_PROGRESS', color: 'text-purple-600' },
            { label: 'Completed',   key: 'COMPLETED',   color: 'text-green-600'  },
          ].map(({ label, key, color }) => (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
              <p className={`text-3xl font-bold text-gray-800 mt-1`}>{counts[key] ?? 0}</p>
              <p className={`text-xs mt-0.5 ${color}`}>&nbsp;</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Departments</option>
            {depts.map((d) => (
              <option key={d.department_id} value={String(d.department_id)}>{d.name}</option>
            ))}
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
                  <th className="px-5 py-3 text-left font-medium">Task</th>
                  <th className="px-5 py-3 text-left font-medium">Department</th>
                  <th className="px-5 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-5 py-3 text-left font-medium">Skill</th>
                  <th className="px-5 py-3 text-left font-medium">Start</th>
                  <th className="px-5 py-3 text-left font-medium">End</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.task_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{t.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{t.department?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {assigneeOf(t) ?? <span className="text-gray-300">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      {t.requiredSkill
                        ? <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t.requiredSkill.skill_name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDt(t.start_datetime)}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDt(t.end_datetime)}</td>
                    <td className="px-5 py-3"><Badge status={t.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingTask(t)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                      {tasks.length === 0 ? 'No tasks yet. Create one to get started.' : 'No tasks match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {creating && (
        <TaskModal
          depts={depts}
          skills={skills}
          onClose={() => setCreating(false)}
          onSaved={(t) => { load(); showToast(`Task "${t.title}" created`); }}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          depts={depts}
          skills={skills}
          onClose={() => setEditingTask(null)}
          onSaved={(t) => { load(); showToast(`Task "${t.title}" updated`); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
