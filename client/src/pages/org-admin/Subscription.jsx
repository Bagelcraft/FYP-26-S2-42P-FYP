import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { ORG_ADMIN_NAV } from './nav';
import api from '../../utils/api';

export default function Subscription() {
  const [sub, setSub] = useState(undefined); // undefined=loading, null=none, obj=active
  const [billing, setBilling] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const load = async () => {
    setError('');
    try {
      const [sRes, bRes] = await Promise.all([
        api.get('/org-admin/subscription'),
        api.get('/org-admin/billing'),
      ]);
      setSub(sRes.data.data);      // null if no active subscription
      setBilling(bRes.data.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load subscription.');
      setSub(null);
    }
  };
  useEffect(() => { load(); }, []);

  const renew = async () => {
    setBusy('renew'); setError('');
    try { await api.post('/org-admin/subscription/renew'); await load(); note('Subscription renewed.'); }
    catch (err) { setError(err.response?.data?.message ?? 'Renew failed.'); }
    finally { setBusy(''); }
  };
  const cancel = async () => {
    if (!window.confirm('Cancel this subscription? Your organisation will lose access at the end of the current period.')) return;
    setBusy('cancel'); setError('');
    try { await api.post('/org-admin/subscription/cancel'); await load(); note('Subscription cancelled.'); }
    catch (err) { setError(err.response?.data?.message ?? 'Cancel failed.'); }
    finally { setBusy(''); }
  };

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Subscription &amp; Billing</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage your organisation's plan and view billing history.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

        {sub === undefined ? (
          <div className="text-gray-400 text-sm py-10 text-center">Loading…</div>
        ) : sub === null ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500 text-sm">
            No active subscription for your organisation.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-800">{sub.plan} Plan</span>
                  <Badge status={sub.status} />
                </div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold text-gray-900">${sub.amount}</span>
                  <span className="text-gray-400 mb-1 text-sm">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Renews / expires on <span className="font-medium text-gray-700">{sub.renews}</span></p>
                <p className="text-sm text-gray-500">Seats used: <span className="font-medium text-gray-700">{sub.seatsUsed}{sub.seatsTotal ? ` / ${sub.seatsTotal}` : ''}</span></p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={renew} disabled={busy === 'renew'}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {busy === 'renew' ? 'Renewing…' : 'Renew (+1 month)'}
                </button>
                {sub.status !== 'CANCELLED' && (
                  <button onClick={cancel} disabled={busy === 'cancel'}
                    className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                    {busy === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing history */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Billing History</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Invoice</th>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {billing.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700">{b.id}</td>
                  <td className="px-5 py-3 text-gray-500">{b.date}</td>
                  <td className="px-5 py-3 text-gray-600">${b.amount}</td>
                  <td className="px-5 py-3"><Badge status={b.status} /></td>
                </tr>
              ))}
              {billing.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No billing records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
