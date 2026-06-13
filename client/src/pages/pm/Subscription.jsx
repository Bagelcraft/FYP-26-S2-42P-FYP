import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';

// Replace with GET /pm/subscription, /pm/billing, GET /admin/plans when wired.
const ORG = 'TechCorp Pte Ltd';
const SUBSCRIPTION = {
  plan: 'Core', amount: 108, status: 'ACTIVE',
  start: '01 Jan 2026', renews: '01 Jul 2026', seatsUsed: 12, seatsTotal: 25,
};
const CORE_PLAN = {
  name: 'Core', monthly: 108, maxUsers: 25,
  features: ['Up to 25 staff', 'Task creation & management', 'Automated allocation engine', 'Leave management', 'Working-hour tracking', 'Real-time notifications', 'Reports & analytics', 'Priority support'],
  current: true,
};
const BILLING = [
  { id: 'INV-2026-006', date: '01 Jun 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
  { id: 'INV-2026-005', date: '01 May 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
  { id: 'INV-2026-004', date: '01 Apr 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
  { id: 'INV-2026-003', date: '01 Mar 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
  { id: 'INV-2026-002', date: '01 Feb 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
  { id: 'INV-2026-001', date: '01 Jan 2026', amount: 108, status: 'PAID', method: 'Visa •••• 4242' },
];

export default function Subscription() {
  const [sub, setSub] = useState(SUBSCRIPTION);
  const [billing, setBilling] = useState(BILLING);
  const [demo, setDemo] = useState(false);
  const [status, setStatus] = useState(SUBSCRIPTION.status);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [toast, setToast] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  // TODO(backend): add GET /pm/subscription, GET /pm/billing, GET /pm/plans
  // (or reuse the admin SubscriptionPlan table). Falls back to sample data.
  useEffect(() => {
    api.get('/pm/subscription')
      .then((r) => { setSub(r.data.data); setStatus(r.data.data.status); })
      .catch(() => setDemo(true));
    api.get('/pm/billing').then((r) => setBilling(r.data.data)).catch(() => {});
  }, []);

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Subscription</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage your organisation's plan, renewals and billing.</p>
        </div>

        {demo && <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-xs text-yellow-700">Showing sample data — <span className="font-medium">GET /pm/subscription</span> is not implemented yet.</div>}

        {/* Current plan */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">{sub.plan} Plan</h3>
                <Badge status={status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">S${sub.amount.toFixed(2)} / month · {ORG}</p>
            </div>
            <div className="flex gap-2">
              {status === 'ACTIVE' ? (
                <>
                  <button onClick={() => setRenewOpen(true)} className="text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Renew / Change plan</button>
                  <button onClick={() => setCancelOpen(true)} className="text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">Cancel plan</button>
                </>
              ) : (
                <button onClick={() => { setStatus('ACTIVE'); note('Subscription reactivated'); }} className="text-sm font-medium bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">Reactivate</button>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="px-6 py-4"><p className="text-xs text-gray-400 uppercase tracking-wide">Started</p><p className="text-sm font-medium text-gray-800 mt-1">{sub.start}</p></div>
            <div className="px-6 py-4"><p className="text-xs text-gray-400 uppercase tracking-wide">{status === 'CANCELLED' ? 'Active until' : 'Renews on'}</p><p className="text-sm font-medium text-gray-800 mt-1">{sub.renews}</p></div>
            <div className="px-6 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Seats used</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="bg-gray-100 rounded-full h-1.5 flex-1"><div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(sub.seatsUsed / sub.seatsTotal) * 100}%` }} /></div>
                <span className="text-sm font-medium text-gray-800">{sub.seatsUsed}/{sub.seatsTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Plan Details</h3>
          <div className="bg-white rounded-xl border border-primary-300 ring-1 ring-primary-200 shadow-sm flex flex-col sm:flex-row">
            <div className="px-6 py-5 border-b sm:border-b-0 sm:border-r border-gray-100 sm:w-56 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{CORE_PLAN.name} Plan</h4>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Current</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">S${CORE_PLAN.monthly.toFixed(2)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">Up to {CORE_PLAN.maxUsers} staff</p>
            </div>
            <ul className="px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 flex-1">
              {CORE_PLAN.features.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex items-start gap-1.5">
                  <span className="text-green-500 mt-px">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Billing history */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Billing History</h3>
            <button onClick={() => note('Statement exported')} className="text-sm text-primary-600 hover:underline">Export CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Invoice</th>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Method</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {billing.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{b.id}</td>
                  <td className="px-5 py-3 text-gray-500">{b.date}</td>
                  <td className="px-5 py-3 text-gray-700">S${b.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-500">{b.method}</td>
                  <td className="px-5 py-3"><Badge status={b.status} /></td>
                  <td className="px-5 py-3"><button onClick={() => note(`Downloading ${b.id}`)} className="text-xs text-primary-600 hover:underline">Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRenewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="font-semibold text-gray-800">Renew Subscription</h2><button onClick={() => setRenewOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button></div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-800">{sub.plan} Plan · monthly</p><p className="text-xs text-gray-400">Renews {sub.renews}</p></div><p className="text-lg font-bold text-gray-800">S${sub.amount.toFixed(2)}</p></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Billing cycle</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"><option>Monthly — S$108.00 / month</option><option>Annual — S$1,080.00 / year (save ~17%)</option></select>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment method</label><div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center justify-between">Visa •••• 4242<button className="text-xs text-primary-600 hover:underline">Change</button></div></div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100"><button onClick={() => setRenewOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button><button onClick={() => { setRenewOpen(false); note('Subscription renewed — valid until 01 Jul 2026'); }} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">Confirm &amp; Pay</button></div>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setCancelOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Cancel subscription?</h2></div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">Your team will lose access to automated allocation and reporting when the current period ends on <span className="font-medium">{sub.renews}</span>.</div>
              <p className="text-sm text-gray-600">You can reactivate any time before then with no loss of data.</p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100"><button onClick={() => setCancelOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Keep plan</button><button onClick={() => { setStatus('CANCELLED'); setCancelOpen(false); note('Subscription cancelled — active until 01 Jul 2026'); }} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Confirm cancellation</button></div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
