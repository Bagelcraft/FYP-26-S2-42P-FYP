import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

// The project portal for project-based organisations. A project is defined by
// the three things the manager works with, in priority order:
//   1. Task     — what work the project needs
//   2. Resource — who is able to work on it
//   3. Duration — when it runs, which bounds every task inside it

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const statusStyle = {
  PLANNING:  'bg-gray-100 text-gray-600',
  ACTIVE:    'bg-green-100 text-green-700',
  ON_HOLD:   'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtShort = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }) : '—');
const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const typeLabel = (t) => (t === 'PERMANENT_WORKER' ? 'Permanent' : 'Temporary');

// Whole days from today until the project ends — the headline "how long" figure.
function daysRemaining(endIso) {
  if (!endIso) return null;
  const end = new Date(endIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / 86400000);
}

function ProjectStatusChip({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Avatar({ name, temporary }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${temporary ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-600'}`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

// ── Create / edit project ──────────────────────────────────────────────────
function ProjectModal({ project, onClose, onSaved }) {
  const editing = !!project;
  const [form, setForm] = useState(editing
    ? {
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        start_date: toDateInput(project.start_date),
        end_date: toDateInput(project.end_date),
      }
    : { name: '', description: '', status: 'PLANNING', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // A new project is set up in one pass: who works on it, and the work itself.
  // When editing, both are managed from the project detail tabs instead, so these
  // sections only appear on create.
  const [team, setTeam] = useState([]);
  const [picked, setPicked] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (editing) return;
    api.get('/pm/team')
      .then((r) => setTeam(r.data.data ?? []))
      .catch(() => setTeam([]));
  }, [editing]);

  const togglePerson = (userId) =>
    setPicked((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));

  const addTaskRow = () =>
    setTasks((prev) => [...prev, { title: '', start_date: form.start_date, end_date: '' }]);
  const setTaskField = (i, k) => (e) =>
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [k]: e.target.value } : t)));
  const removeTaskRow = (i) => setTasks((prev) => prev.filter((_, idx) => idx !== i));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date,
      };
      if (!editing) {
        if (picked.length) body.resource_ids = picked;
        // Blank rows are dropped rather than rejected — an empty extra row is a
        // mis-click, not a reason to fail the whole submission.
        const filled = tasks.filter((t) => t.title.trim());
        if (filled.length) {
          body.tasks = filled.map((t) => ({
            title: t.title.trim(),
            start_date: t.start_date || form.start_date,
            end_date: t.end_date || t.start_date || form.start_date,
          }));
        }
      }
      const res = editing
        ? await api.patch(`/pm/projects/${project.project_id}`, body)
        : await api.post('/pm/projects', body);
      onSaved(res.data.data, editing);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Project' : 'New Project'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Marina Bay Fit-Out" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input type="date" required value={form.start_date} onChange={set('start_date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input type="date" required min={form.start_date || undefined} value={form.end_date} onChange={set('end_date')} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Every task on this project must be scheduled inside these dates. Shortening the window is refused while tasks fall outside it.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={`${inputCls} resize-none`} />
          </div>

          {!editing && (
            <>
              {/* Who is onboarded */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Who is on this project?</label>
                  {picked.length > 0 && <span className="text-xs text-primary-600 font-medium">{picked.length} selected</span>}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Only these people can be allocated to its tasks. You can change this later.
                </p>
                {team.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No workers available yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
                    {team.map((m) => (
                      <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={picked.includes(m.id)}
                          onChange={() => togglePerson(m.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{m.name}</span>
                        {m.type === 'TEMPORARY_WORKER' && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Temp</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* First tasks */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">What needs to be done?</label>
                  <button type="button" onClick={addTaskRow} className="text-xs font-medium text-primary-600 hover:underline">
                    + Add task
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Optional — these are created as Pending and land in the Allocate queue.
                </p>
                {tasks.length === 0 ? (
                  <button
                    type="button"
                    onClick={addTaskRow}
                    className="w-full border border-dashed border-gray-300 rounded-lg py-3 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    + Add the first task
                  </button>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={t.title}
                            onChange={setTaskField(i, 'title')}
                            placeholder={`Task ${i + 1} name`}
                            className={`${inputCls} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => removeTaskRow(i)}
                            title="Remove this task"
                            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                          >
                            &times;
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Start</label>
                            <input
                              type="date" value={t.start_date} onChange={setTaskField(i, 'start_date')}
                              min={form.start_date || undefined} max={form.end_date || undefined}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Deadline</label>
                            <input
                              type="date" value={t.end_date} onChange={setTaskField(i, 'end_date')}
                              min={t.start_date || form.start_date || undefined} max={form.end_date || undefined}
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Add resources to the pool ──────────────────────────────────────────────
function AddResourceModal({ projectId, onClose, onAdded }) {
  const [pool, setPool] = useState([]);
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/pm/projects/${projectId}/available-resources`)
      .then((r) => setPool(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submit(e) {
    e.preventDefault();
    if (!picked.length) return;
    setSaving(true); setError('');
    try {
      const r = await api.post(`/pm/projects/${projectId}/resources`, { user_ids: picked });
      onAdded(r.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Add Resources</h2>
            <p className="text-xs text-gray-400 mt-0.5">Who is able to work on this project</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-2">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {!loading && pool.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Every worker is already on this project.</p>}
          {pool.map((u) => {
            const on = picked.includes(u.userId);
            return (
              <button type="button" key={u.userId} onClick={() => toggle(u.userId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${on ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ${on ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'}`}>{on ? '✓' : ''}</span>
                <Avatar name={u.full_name} temporary={u.user_type === 'TEMPORARY_WORKER'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-800 truncate">{u.full_name}</span>
                  <span className="block text-xs text-gray-400 truncate">
                    {typeLabel(u.user_type)}{u.role ? ` · ${u.role}` : ''}{u.skills.length ? ` · ${u.skills.join(', ')}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" disabled={saving || !picked.length}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Adding…' : `Add ${picked.length || ''}`.trim()}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Add a task straight onto this project ──────────────────────────────────
function AddTaskModal({ project, onClose, onAdded }) {
  const [form, setForm] = useState({
    title: '',
    start_date: toDateInput(project.start_date),
    end_date: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const projStart = toDateInput(project.start_date);
  const projEnd = toDateInput(project.end_date);
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      // Same working-day window the Tasks page uses. A bare date on both ends
      // would make start === end, which the API rejects (end must be after start).
      const startDay = form.start_date;
      const endDay = form.end_date || startDay;
      await api.post('/pm/tasks', {
        title: form.title.trim(),
        project_id: project.project_id,
        description: form.description.trim() || null,
        start_datetime: `${startDay}T09:00:00`,
        end_datetime: `${endDay}T18:00:00`,
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">Add Task</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">on {project.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Task Name *</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Site survey" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input type="date" required value={form.start_date} onChange={set('start_date')}
                min={projStart} max={projEnd} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
              <input type="date" value={form.end_date} onChange={set('end_date')}
                min={form.start_date || projStart} max={projEnd} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Must fall between {fmtShort(project.start_date)} and {fmtShort(project.end_date)} — the project duration.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={`${inputCls} resize-none`} />
          </div>
          <p className="text-xs text-gray-400">
            Starts as <span className="font-medium text-gray-600">Pending</span>. Add skills and a department
            from the Tasks page if the allocation engine needs them.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────
function ProjectDetail({ project, onEdit, onDelete, onChanged, showToast }) {
  const [tab, setTab] = useState('tasks');
  const [adding, setAdding] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  const remaining = daysRemaining(project.end_date);
  const tasks = project.tasks ?? [];
  const resources = project.resources ?? [];
  const done = tasks.filter((t) => t.status === 'COMPLETED').length;
  const permanent = resources.filter((r) => r.user_type === 'PERMANENT_WORKER').length;

  async function dropResource(r) {
    if (!confirm(`Remove ${r.full_name} from this project's resource pool?`)) return;
    try {
      await api.delete(`/pm/projects/${project.project_id}/resources/${r.userId}`);
      showToast(`${r.full_name} removed from the pool`);
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold text-gray-800 truncate">{project.name}</h3>
              <ProjectStatusChip status={project.status} />
            </div>
            {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-xs text-primary-600 hover:underline">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
          </div>
        </div>

        {/* Duration — the window every task on this project has to fit inside. */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Duration</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{fmtShort(project.start_date)} – {fmtShort(project.end_date)}</p>
            <p className="text-xs text-gray-400">
              {remaining === null ? '' : remaining < 0 ? `Ended ${-remaining}d ago` : `${remaining}d remaining`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Tasks</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{done}/{tasks.length} complete</p>
            <p className="text-xs text-gray-400">{tasks.filter((t) => t.status === 'PENDING').length} awaiting allocation</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Resources</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{resources.length} in pool</p>
            <p className="text-xs text-gray-400">{permanent} permanent · {resources.length - permanent} temporary</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-1">
            {[['tasks', `Tasks (${tasks.length})`], ['resources', `Resources (${resources.length})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'tasks' && (
            <button onClick={() => setAddingTask(true)} className="text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition-colors">
              + Add Task
            </button>
          )}
          {tab === 'resources' && (
            <button onClick={() => setAdding(true)} className="text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition-colors">
              + Add Resource
            </button>
          )}
        </div>

        {tab === 'tasks' && (
          <div className="divide-y divide-gray-50">
            {tasks.map((t) => (
              <div key={t.task_id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">
                    {fmtShort(t.start_datetime)} – {fmtShort(t.end_datetime)}
                    {t.requiredSkills?.length ? ` · ${t.requiredSkills.map((s) => s.skill_name).join(', ')}` : ''}
                    {t.assignments?.[0]?.assignedTo ? ` · ${t.assignments[0].assignedTo.full_name}` : ' · Unassigned'}
                  </p>
                </div>
                <Badge status={t.status} />
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-gray-400 text-sm">No tasks on this project yet.</p>
                <button onClick={() => setAddingTask(true)} className="mt-3 text-sm font-medium text-primary-600 hover:underline">
                  + Add the first task
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'resources' && (
          <div className="divide-y divide-gray-50">
            {resources.length === 0 && (
              <p className="px-5 py-10 text-center text-gray-400 text-sm">
                No resource pool set — every worker in the organisation is eligible for this project&apos;s tasks.
                Add resources to narrow it down.
              </p>
            )}
            {resources.map((r) => (
              <div key={r.userId} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={r.full_name} temporary={r.user_type === 'TEMPORARY_WORKER'} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {typeLabel(r.user_type)}{r.role ? ` · ${r.role}` : ''}{r.maxHours ? ` · max ${r.maxHours}h/wk` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {r.skills.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-[200px]">
                      {r.skills.map((s) => <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  )}
                  <button onClick={() => dropResource(r)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addingTask && (
        <AddTaskModal
          project={project}
          onClose={() => setAddingTask(false)}
          onAdded={() => { showToast('Task added'); onChanged(); }}
        />
      )}
      {adding && (
        <AddResourceModal
          projectId={project.project_id}
          onClose={() => setAdding(false)}
          onAdded={() => { showToast('Resources added to the pool'); onChanged(); }}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/pm/projects')
      .then((r) => {
        setProjects(r.data.data);
        setSel((s) => (s && r.data.data.some((p) => p.project_id === s) ? s : r.data.data[0]?.project_id ?? null));
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(() => {
    if (!sel) { setDetail(null); return; }
    setDetailLoading(true);
    api.get(`/pm/projects/${sel}`)
      .then((r) => setDetail(r.data.data))
      .catch((e) => { setDetail(null); setError(e.response?.data?.message || e.message); })
      .finally(() => setDetailLoading(false));
  }, [sel]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function delProject(p) {
    if (!confirm(`Delete project “${p.name}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/pm/projects/${p.project_id}`);
      showToast(`Project “${p.name}” deleted`);
      setSel(null);
      load();
    } catch (e) {
      // 409 when the project still owns tasks.
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Projects</h2>
            <p className="text-gray-500 text-sm mt-0.5">Each project defines its tasks, the resources able to work on them, and the duration they run for.</p>
          </div>
          <button onClick={() => setCreating(true)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ New Project</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">All Projects</h3>
              <p className="text-xs text-gray-400 mt-0.5">{projects.length} total</p>
            </div>
            <div className="divide-y divide-gray-50">
              {loading && <div className="px-5 py-12 text-center text-gray-400 text-sm">Loading…</div>}
              {!loading && projects.map((p) => (
                <button key={p.project_id} onClick={() => setSel(p.project_id)}
                  className={`w-full text-left px-5 py-3.5 transition-colors ${sel === p.project_id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${sel === p.project_id ? 'text-primary-700' : 'text-gray-800'}`}>{p.name}</p>
                    <ProjectStatusChip status={p.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(p.start_date)} – {fmtDate(p.end_date)} · {p.taskCount ?? 0} task{p.taskCount === 1 ? '' : 's'} · {p.resourceCount} resource{p.resourceCount === 1 ? '' : 's'}
                  </p>
                </button>
              ))}
              {!loading && projects.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">No projects yet. Create one to start planning work.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            {detailLoading && <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center text-gray-400 text-sm">Loading project…</div>}
            {!detailLoading && detail && (
              <ProjectDetail
                project={detail}
                onEdit={() => setEditing(detail)}
                onDelete={() => delProject(detail)}
                onChanged={() => { loadDetail(); load(); }}
                showToast={showToast}
              />
            )}
            {!detailLoading && !detail && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center text-gray-400 text-sm">
                {loading ? 'Loading…' : 'Select a project to see its tasks, resources and duration.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {creating && (
        <ProjectModal onClose={() => setCreating(false)} onSaved={(p) => { showToast(`Project “${p.name}” created`); setSel(p.project_id); load(); }} />
      )}
      {editing && (
        <ProjectModal project={editing} onClose={() => setEditing(null)} onSaved={(p) => { showToast(`Project “${p.name}” updated`); loadDetail(); load(); }} />
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
