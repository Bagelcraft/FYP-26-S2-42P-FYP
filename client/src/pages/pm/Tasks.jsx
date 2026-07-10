import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

const fmtTs = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Allocation History modal ───────────────────────────────────────────────
function AllocationHistoryModal({ task, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/pm/tasks/${task.task_id}/allocation-history`)
      .then((r) => setHistory(r.data.data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [task.task_id]);

  const actionColor = (action) => {
    if (action === 'ALLOCATED') return 'bg-green-50 text-green-700';
    if (action === 'REALLOCATED') return 'bg-blue-50 text-blue-700';
    if (action === 'UNASSIGNED') return 'bg-red-50 text-red-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Allocation History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {!loading && history.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No allocation history for this task.</p>
          )}
          {!loading && history.length > 0 && (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4 pl-8">
                {history.map((h) => (
                  <div key={h.history_id} className="relative">
                    <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionColor(h.action)}`}>{h.action}</span>
                        <p className="text-sm text-gray-800 mt-1 font-medium">{h.user?.full_name}</p>
                        <p className="text-xs text-gray-400">By {h.changedBy?.full_name} · {fmtTs(h.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Request Update modal ───────────────────────────────────────────────────
function RequestUpdateModal({ task, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post(`/pm/tasks/${task.task_id}/update-requests`, { message: message.trim() || null });
      onSent();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Request Update</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <p className="text-sm text-gray-600">Requesting update for: <span className="font-medium text-gray-800">{task.title}</span></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message (optional)</label>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please provide a status update on the current progress…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <p className="text-xs text-gray-400">The assigned worker will see this request in their task view and can respond directly.</p>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{submitting ? 'Sending…' : 'Send Request'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Update Requests view modal (PM reads worker responses) ─────────────────
function UpdateRequestsViewModal({ task, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/pm/tasks/${task.task_id}/update-requests`)
      .then((r) => setRequests(r.data.data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [task.task_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Update Request Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {!loading && requests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No update requests sent yet.</p>
          )}
          {requests.map((r) => (
            <div key={r.request_id} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Sent by <span className="font-medium text-gray-600">{r.requester?.full_name}</span> · {fmtTs(r.created_at)}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'RESPONDED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  {r.status}
                </span>
              </div>
              {r.message && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">"{r.message}"</p>}
              {r.status === 'RESPONDED' && (
                <div className="bg-blue-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-400 mb-0.5">Worker response · {fmtTs(r.responded_at)}</p>
                  <p className="text-sm text-blue-800">{r.response}</p>
                </div>
              )}
              {r.status === 'PENDING' && (
                <p className="text-xs text-amber-500 italic">Awaiting worker response…</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
const fmtDue = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
};
const assigneeOf = (t) => t.assignments?.[0]?.assignedTo?.full_name ?? null;

// Normalise whatever skill shape the API returns into [{ skill_id, skill_name }].
const skillsOf = (t) => {
  if (Array.isArray(t.requiredSkills) && t.requiredSkills.length) {
    return t.requiredSkills.map((s) => s.skill ?? s); // tolerate raw join rows
  }
  if (t.requiredSkill) return [t.requiredSkill];
  return [];
};

const STATUS_OPTIONS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

// ── Multi-select dropdown for skills ────────────────────────────────────────
function SkillMultiSelect({ skills, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const chosen = skills.filter((s) => selected.includes(String(s.skill_id)));
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
        <span className="flex flex-wrap gap-1 flex-1 min-w-0">
          {chosen.length === 0 && <span className="text-gray-400">Select skills…</span>}
          {chosen.map((s) => (
            <span key={s.skill_id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">
              {s.skill_name}
              <span onClick={(e) => { e.stopPropagation(); onToggle(s.skill_id); }} className="hover:text-primary-900 cursor-pointer leading-none">×</span>
            </span>
          ))}
        </span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto py-1">
            {skills.map((s) => {
              const on = selected.includes(String(s.skill_id));
              return (
                <button type="button" key={s.skill_id} onClick={() => onToggle(s.skill_id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ${on ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'}`}>{on ? '✓' : ''}</span>
                  {s.skill_name}
                </button>
              );
            })}
            {skills.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No skills defined.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function fmtShiftTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function TaskModal({ task, depts, skills, shifts, onClose, onSaved }) {
  const editing = !!task;
  const initialSkillIds = editing
    ? skillsOf(task).map((s) => String(s.skill_id))
    : [];
  const [form, setForm] = useState(editing
    ? {
        title: task.title,
        department_id: task.department_id ? String(task.department_id) : '',
        required_skill_ids: initialSkillIds,
        status: task.status,
        due: toDateInput(task.end_datetime),
        shift_id: '',
        description: task.description ?? '',
      }
    : { title: '', department_id: '', required_skill_ids: [], status: 'PENDING', due: '', shift_id: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleSkill = (id) => setForm((f) => {
    const s = String(id);
    const has = f.required_skill_ids.includes(s);
    return { ...f, required_skill_ids: has ? f.required_skill_ids.filter((x) => x !== s) : [...f.required_skill_ids, s] };
  });

  const selectedShift = shifts.find((s) => String(s.shift_id) === form.shift_id);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const day = form.due || new Date().toISOString().slice(0, 10);
      const startTime = selectedShift ? selectedShift.start_time : '09:00';
      const endTime   = selectedShift ? selectedShift.end_time   : '18:00';
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_datetime: `${day}T${startTime}:00`,
        end_datetime:   `${day}T${endTime}:00`,
        department_id: form.department_id ? Number(form.department_id) : null,
        required_skill_ids: form.required_skill_ids.map(Number),
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={form.department_id} onChange={set('department_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— None —</option>
              {depts.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Required Skills</label>
            <SkillMultiSelect skills={skills} selected={form.required_skill_ids} onToggle={toggleSkill} />
            <p className="text-xs text-gray-400 mt-1.5">Select one or more skills a worker must have. The allocation engine requires <span className="font-medium text-gray-500">all</span> selected skills.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Task Date *</label>
              <input type="date" required value={form.due} onChange={set('due')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shift Template</label>
              <select value={form.shift_id} onChange={set('shift_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— Custom (9 AM–6 PM) —</option>
                {shifts.map((s) => (
                  <option key={s.shift_id} value={s.shift_id}>
                    {s.name} ({fmtShiftTime(s.start_time)} – {fmtShiftTime(s.end_time)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedShift && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              Task hours: <span className="font-medium">{fmtShiftTime(selectedShift.start_time)} – {fmtShiftTime(selectedShift.end_time)}</span>
            </div>
          )}
          {editing && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          )}
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
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [requestUpdateTask, setRequestUpdateTask] = useState(null);
  const [viewRequestsTask, setViewRequestsTask] = useState(null);
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
    api.get('/pm/shift-templates')
      .then((r) => setShifts(r.data.data ?? []))
      .catch(() => setShifts([]));
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
                  <th className="px-5 py-3 text-left font-medium">Skills</th>
                  <th className="px-5 py-3 text-left font-medium">Due</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const tSkills = skillsOf(t);
                  return (
                    <tr key={t.task_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{t.title}</td>
                      <td className="px-5 py-3 text-gray-500">{t.department?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{assigneeOf(t) ?? <span className="text-gray-400">Unassigned</span>}</td>
                      <td className="px-5 py-3">
                        {tSkills.length ? (
                          <div className="flex flex-wrap gap-1">
                            {tSkills.map((s) => <span key={s.skill_id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s.skill_name}</span>)}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{fmtDue(t.end_datetime)}</td>
                      <td className="px-5 py-3"><Badge status={t.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setEditingTask(t)} className="text-xs text-primary-600 hover:underline">Edit</button>
                          <button onClick={() => delTask(t)} className="text-xs text-red-500 hover:underline">Delete</button>
                          <button onClick={() => setHistoryTask(t)} className="text-xs text-gray-500 hover:underline">History</button>
                          {['ASSIGNED', 'IN_PROGRESS'].includes(t.status) && (
                            <button onClick={() => setRequestUpdateTask(t)} className="text-xs text-amber-600 hover:underline">Request Update</button>
                          )}
                          {['ASSIGNED', 'IN_PROGRESS'].includes(t.status) && (
                            <button onClick={() => setViewRequestsTask(t)} className="text-xs text-blue-500 hover:underline">View Requests</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No tasks found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {creating && (
        <TaskModal
          depts={depts} skills={skills} shifts={shifts}
          onClose={() => setCreating(false)}
          onSaved={(t) => { load(); showToast(`Task “${t.title}” created`); }}
        />
      )}
      {editingTask && (
        <TaskModal
          task={editingTask} depts={depts} skills={skills} shifts={shifts}
          onClose={() => setEditingTask(null)}
          onSaved={(t) => { load(); showToast(`Task “${t.title}” updated`); }}
        />
      )}
      {historyTask && <AllocationHistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />}
      {requestUpdateTask && (
        <RequestUpdateModal
          task={requestUpdateTask}
          onClose={() => setRequestUpdateTask(null)}
          onSent={() => showToast('Update request sent to worker')}
        />
      )}
      {viewRequestsTask && <UpdateRequestsViewModal task={viewRequestsTask} onClose={() => setViewRequestsTask(null)} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
