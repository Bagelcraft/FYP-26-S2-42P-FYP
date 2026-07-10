import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ORG_ADMIN_NAV } from './nav';
import api from '../../utils/api';

const fmt = (d) => new Date(d).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ShiftChangeRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/org-admin/shift-change-requests')
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const review = async (id, action) => {
    setActingId(id); setError('');
    try {
      const r = await api.patch(`/org-admin/shift-change-requests/${id}`, { action });
      setItems((p) => p.map((x) => (x.request_id === id ? { ...x, ...r.data.data } : x)));
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed.');
    } finally { setActingId(null); }
  };

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Shift-Change Requests</h2>
          <p className="text-gray-500 text-sm mt-0.5">Review shift-change requests from your staff.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Employee</th>
                <th className="px-5 py-3 text-left font-medium">Current</th>
                <th className="px-5 py-3 text-left font-medium">Requested</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((r) => (
                <tr key={r.request_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.user?.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{fmt(r.original_shift)}</td>
                  <td className="px-5 py-3 text-gray-700">{fmt(r.requested_shift)}</td>
                  <td className="px-5 py-3"><Badge status={r.status} /></td>
                  <td className="px-5 py-3">
                    {r.status === 'PENDING' ? (
                      <div className="flex gap-3">
                        <button onClick={() => review(r.request_id, 'APPROVED')} disabled={actingId === r.request_id}
                          className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50">Approve</button>
                        <button onClick={() => review(r.request_id, 'REJECTED')} disabled={actingId === r.request_id}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Reviewed{r.reviewer ? ` by ${r.reviewer.full_name}` : ''}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No shift-change requests.</td></tr>
              )}
              {loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
