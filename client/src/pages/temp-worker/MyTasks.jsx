import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { TEMP_NAV } from './nav';

const fmtDt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtTs = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Update Requests panel ──────────────────────────────────────────────────
function UpdateRequestsPanel({ taskId, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/temp-worker/tasks/${taskId}/update-requests`)
      .then((r) => setRequests(r.data.data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  async function submitResponse(requestId) {
    if (!responseText.trim()) return;
    setSubmitting(true); setError('');
    try {
      await api.patch(`/temp-worker/tasks/${taskId}/update-requests/${requestId}/respond`, { response: responseText.trim() });
      setRespondingId(null);
      setResponseText('');
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Update Requests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {!loading && requests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No update requests for this task.</p>
          )}
          {requests.map((r) => (
            <div key={r.request_id} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">From <span className="font-medium text-gray-600">{r.requester?.full_name}</span> · {fmtTs(r.created_at)}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'RESPONDED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  {r.status}
                </span>
              </div>
              {r.message && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">"{r.message}"</p>}
              {r.status === 'RESPONDED' && (
                <div className="bg-blue-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-400 mb-0.5">Your response · {fmtTs(r.responded_at)}</p>
                  <p className="text-sm text-blue-800">{r.response}</p>
                </div>
              )}
              {r.status === 'PENDING' && respondingId !== r.request_id && (
                <button onClick={() => { setRespondingId(r.request_id); setResponseText(''); }} className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Respond
                </button>
              )}
              {r.status === 'PENDING' && respondingId === r.request_id && (
                <div className="space-y-2">
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <textarea rows={3} value={responseText} onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setRespondingId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                    <button onClick={() => submitResponse(r.request_id)} disabled={submitting || !responseText.trim()} className="text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
                      {submitting ? 'Sending…' : 'Submit Response'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Progress modal ─────────────────────────────────────────────────────────
function ProgressModal({ task, onClose, onUpdated }) {
  const [status, setStatus] = useState('IN_PROGRESS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.patch(`/temp-worker/tasks/${task.task_id}/progress`, { status });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Update Progress</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-sm text-gray-600">Task: <span className="font-medium text-gray-800">{task.title}</span></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{submitting ? 'Saving…' : 'Update'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function MyTasks() {
  const [assigned, setAssigned] = useState([]);
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressTask, setProgressTask] = useState(null);
  const [requestsTaskId, setRequestsTaskId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignedRes, poolRes] = await Promise.all([
        api.get('/temp-worker/tasks'),
        api.get('/temp-worker/tasks/available'),
      ]);
      setAssigned(assignedRes.data.data);
      setPool(poolRes.data.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function acknowledge(task) {
    try {
      await api.patch(`/temp-worker/tasks/${task.task_id}/acknowledge`);
      load();
      showToast('Task acknowledged — now In Progress');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <DashboardLayout navItems={TEMP_NAV} roleLabel="Temporary Employee">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Tasks</h2>
          <p className="text-gray-500 text-sm mt-0.5">Your assigned tasks and the available task pool.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-10">Loading…</p>
        ) : (
          <>
            {/* Assigned tasks */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Assigned Tasks</h3>
              </div>
              {assigned.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">No tasks assigned.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {assigned.map((t) => (
                    <div key={t.task_id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t.department?.name ?? '—'} · {t.requiredSkill?.skill_name ?? 'No skill required'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDt(t.start_datetime)} → {fmtDt(t.end_datetime)}</p>
                        </div>
                        <Badge status={t.status} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {t.status === 'ASSIGNED' && (
                          <button onClick={() => acknowledge(t)} className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            Acknowledge
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && (
                          <button onClick={() => setProgressTask(t)} className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                            Update Progress
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && (
                          <button onClick={() => setProgressTask({ ...t, _markComplete: true })} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            Mark Complete
                          </button>
                        )}
                        {(t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS') && (
                          <button onClick={() => setRequestsTaskId(t.task_id)} className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
                            Update Requests
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available task pool */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Available Task Pool</h3>
                <p className="text-gray-400 text-xs mt-0.5">Tasks you may be allocated to based on your skills and availability.</p>
              </div>
              {pool.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">No available tasks at this time.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pool.map((t) => (
                    <div key={t.task_id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-400">{t.department?.name ?? '—'} · Requires: {t.requiredSkill?.skill_name ?? 'None'} · Due {fmtDt(t.end_datetime)}</p>
                      </div>
                      <Badge status="PENDING" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {progressTask && (
        <ProgressModal task={progressTask} onClose={() => setProgressTask(null)} onUpdated={() => { load(); showToast('Task status updated'); }} />
      )}
      {requestsTaskId && (
        <UpdateRequestsPanel taskId={requestsTaskId} onClose={() => setRequestsTaskId(null)} />
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}