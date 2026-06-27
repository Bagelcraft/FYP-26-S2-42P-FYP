import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLOR = {
  PENDING:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200',
};

function ReviewModal({ request, onClose, onDone }) {
  const [action, setAction] = useState('APPROVED');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.patch(`/org-admin/profile-change-requests/${request.request_id}`, {
        action,
        review_note: note.trim() || null,
      });
      onDone(action);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Review Request</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Employee</span><span className="font-medium text-gray-800">{request.user?.full_name}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Field</span><span className="font-medium text-gray-800">{request.field}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Requested value</span><span className="text-gray-700">{request.requested_value}</span></div>
            {request.reason && <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Reason</span><span className="text-gray-600 italic">{request.reason}</span></div>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Decision</label>
            <div className="flex gap-3">
              {['APPROVED', 'REJECTED'].map((a) => (
                <button key={a} type="button" onClick={() => setAction(a)}
                  className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-colors ${action === a
                    ? a === 'APPROVED' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {a === 'APPROVED' ? 'Approve' : 'Reject'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note to employee (optional)</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Updated in the system, or reason for rejection…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={submitting}
              className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${action === 'APPROVED' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {submitting ? 'Saving…' : action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ProfileChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const [reviewing, setReviewing] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/org-admin/profile-change-requests')
      .then((r) => setRequests(r.data.data))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Profile Change Requests</h2>
            <p className="text-gray-500 text-sm mt-0.5">Review and action employee profile update requests.</p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-5 py-12 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Employee</th>
                  <th className="px-5 py-3 text-left font-medium">Field</th>
                  <th className="px-5 py-3 text-left font-medium">Requested Value</th>
                  <th className="px-5 py-3 text-left font-medium">Submitted</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.request_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.user?.full_name}</p>
                      <p className="text-xs text-gray-400">{r.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.field}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{r.requested_value}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.status === 'PENDING' ? (
                        <button onClick={() => setReviewing(r)} className="text-xs text-primary-600 font-medium hover:underline">Review</button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {r.reviewer?.full_name ? `by ${r.reviewer.full_name}` : '—'}
                          {r.review_note && <span className="block italic text-gray-400 mt-0.5">"{r.review_note}"</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No requests found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={(action) => { load(); showToast(`Request ${action.toLowerCase()}.`); }}
        />
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
