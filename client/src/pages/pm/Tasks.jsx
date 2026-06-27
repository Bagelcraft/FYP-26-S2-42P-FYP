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
      await api.post(`/pm/tasks/${task.task_id}/request-update`, { message: message.trim() || null });
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

// ── Allocate modal ────────────────────────────────────────────────────────
const typeLabel = (t) => (t === 'PERMANENT_WORKER' ? 'Permanent' : t === 'TEMPORARY_WORKER' ? 'Temporary' : t);

function HoursBar({ c }) {
  const pct = c.maxHours ? Math.min((c.weeklyHours / c.maxHours) * 100, 100) : 0;
  const near = c.eligible && c.remainingHours != null && c.remainingHours <= 4;
  const color = !c.withinHours ? 'bg-red-500' : near ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="bg-gray-100 rounded-full h-1.5 w-16"><div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} /></div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{c.weeklyHours}/{c.maxHours ?? '∞'}h</span>
    </div>
  );
}
function CheckChip({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      <span>{ok ? '✓' : '✕'}</span>{children}
    </span>
  );
}
function CandidateAvatar({ name, ring }) {
  return <div className={`w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0 ${ring ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}>{name?.[0] ?? '?'}</div>;
}

function AllocateModal({ task, onClose, onAllocated }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/pm/tasks/${task.task_id}/eligible-staff`)
      .then((r) => setCandidates(r.data.data?.candidates ?? []))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [task.task_id]);

  const suggestion = candidates.find((c) => c.eligible);

  async function assign(userId, auto) {
    setBusy(true); setError('');
    try {
      const url = auto ? `/pm/tasks/${task.task_id}/auto-allocate` : `/pm/tasks/${task.task_id}/assign`;
      await api.post(url, auto ? {} : { assigned_to: userId });
      const name = auto ? (suggestion?.full_name ?? 'staff') : (candidates.find((c) => c.userId === userId)?.full_name ?? 'staff');
      onAllocated(`${auto ? 'Auto-allocated' : 'Assigned'} "${task.title}" → ${name}`);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setBusy(false);
    }
  }

  const fmtDueLocal = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }) : '—');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">Allocate Task</h2>
            <p className="text-xs text-gray-400 mt-0.5">{task.title} · {task.requiredSkill?.skill_name ?? 'Any skill'} · Due {fmtDueLocal(task.end_datetime)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}

          {loading && <p className="text-sm text-gray-400 text-center py-10">Evaluating eligibility…</p>}

          {!loading && suggestion && (
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <CandidateAvatar name={suggestion.full_name} ring />
                <div>
                  <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide">🤖 Engine recommendation</p>
                  <p className="text-sm font-medium text-gray-800">{suggestion.full_name}{suggestion.remainingHours != null ? ` · ${suggestion.remainingHours}h spare` : ''}</p>
                </div>
              </div>
              <button disabled={busy} onClick={() => assign(suggestion.userId, true)}
                className="text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
                Auto-assign
              </button>
            </div>
          )}

          {!loading && candidates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No staff with the required skill found.</p>
          )}

          {!loading && candidates.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ranked Candidates</p>
                <span className="text-xs text-gray-400">{candidates.filter((c) => c.eligible).length} of {candidates.length} eligible</span>
              </div>
              <div className="divide-y divide-gray-50">
                {candidates.map((c, i) => (
                  <div key={c.userId} className={`px-4 py-3.5 ${!c.eligible ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 font-mono w-4">{i + 1}</span>
                        <CandidateAvatar name={c.full_name} ring={c === suggestion} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.full_name}</p>
                          <p className="text-xs text-gray-400">{typeLabel(c.user_type)}{c.staffRole ? ` · ${c.staffRole}` : ''}</p>
                        </div>
                      </div>
                      <button disabled={!c.eligible || busy} onClick={() => assign(c.userId, false)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${c.eligible ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                        {c.eligible ? 'Assign' : 'Skip'}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 pl-11">
                      {task.requiredSkill && <CheckChip ok>{task.requiredSkill.skill_name}</CheckChip>}
                      <CheckChip ok={c.isAvailable}>{c.isAvailable ? 'Available' : 'No availability'}</CheckChip>
                      <CheckChip ok={c.withinHours}>{c.withinHours ? `${c.remainingHours}h spare` : 'Hours maxed'}</CheckChip>
                      <HoursBar c={c} />
                    </div>
                    {!c.eligible && c.ineligibleReason && <p className="text-xs text-red-500 mt-1 pl-11">{c.ineligibleReason}</p>}
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
        start_datetime: `${day}T09:00:00`,
        end_datetime: `${day}T18:00:00`,
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
  const [editingTask, setEditingTask] = useState(null);
  const [allocatingTask, setAllocatingTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [requestUpdateTask, setRequestUpdateTask] = useState(null);
  const [viewRequestsTask, setViewRequestsTask] = useState(null);
  const [autoAllocating, setAutoAllocating] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  async function autoAllocate(t) {
    setAutoAllocating(t.task_id);
    try {
      await api.post(`/pm/tasks/${t.task_id}/auto-allocate`, {});
      load();
      showToast(`Auto-allocated "${t.title}" · working hours updated`);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setAutoAllocating(null);
    }
  }

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
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tasks</h2>
          <p className="text-gray-500 text-sm mt-0.5">View, assign, track and manage tasks.</p>
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
                      <div className="flex flex-wrap gap-2">
                        {t.status === 'PENDING' && (
                          <>
                            <button onClick={() => setAllocatingTask(t)} className="text-xs text-green-600 font-medium hover:underline">Allocate</button>
                            <button disabled={autoAllocating === t.task_id} onClick={() => autoAllocate(t)} className="text-xs text-purple-600 font-medium hover:underline disabled:opacity-50">
                              {autoAllocating === t.task_id ? 'Allocating…' : '🤖 Auto'}
                            </button>
                          </>
                        )}
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
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No tasks found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingTask && (
        <TaskModal
          task={editingTask} depts={depts} skills={skills}
          onClose={() => setEditingTask(null)}
          onSaved={(t) => { load(); showToast(`Task “${t.title}” updated`); }}
        />
      )}
      {allocatingTask && (
        <AllocateModal
          task={allocatingTask}
          onClose={() => setAllocatingTask(null)}
          onAllocated={(msg) => { load(); showToast(msg); }}
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
