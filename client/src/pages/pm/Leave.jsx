import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

function AdjustBalanceModal({ balance, onClose, onSave }) {
  const [form, setForm] = useState({ annualEnt: balance.annual.entitled, annualUsed: balance.annual.used, medEnt: balance.medical.entitled, medUsed: balance.medical.used });
  const field = (label, key) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" min="0" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Adjust Leave Balance — {balance.userName ?? 'Staff'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Annual Leave</p>
          <div className="grid grid-cols-2 gap-3">{field('Entitled days', 'annualEnt')}{field('Used days', 'annualUsed')}</div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2">Medical Leave</p>
          <div className="grid grid-cols-2 gap-3">{field('Entitled days', 'medEnt')}{field('Used days', 'medUsed')}</div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={() => onSave({ user: balance.user, userName: balance.userName, annual: { entitled: form.annualEnt, used: form.annualUsed }, medical: { entitled: form.medEnt, used: form.medUsed } })}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Leave() {
  const [tab, setTab] = useState('approvals');
  const [leave, setLeave] = useState([]);
  const [balances, setBalances] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  // GET /pm/leave, PATCH /pm/leave/:id, GET /pm/leave-balance, PATCH /pm/leave-balance/:userId.
  useEffect(() => {
    api.get('/pm/leave')
      .then((r) => setLeave(r.data.data ?? []))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load leave.'));
    api.get('/pm/leave-balance')
      .then((r) => setBalances(r.data.data ?? []))
      .catch(() => {});
  }, []);

  const nameOf = (uid, fallbackName) => fallbackName ?? 'Staff';
  const typeOf = (userType) => (userType === 'PERMANENT_WORKER' ? 'Permanent Employee' : userType === 'TEMPORARY_WORKER' ? 'Temporary Employee' : '');

  const pending = leave.filter((l) => l.status === 'PENDING');
  // Approving also strips any shifts the person was rostered onto during the
  // leave. That is a change to the roster the manager did not explicitly make, so
  // the toast says how many went rather than letting them discover it later.
  async function decide(id, status) {
    const row = leave.find((x) => x.id === id);
    setLeave((p) => p.map((l) => (l.id === id ? { ...l, status } : l)));
    const who = nameOf(row.user, row.userName);

    try {
      const res = await api.patch(`/pm/leave/${id}`, { status });
      const released = res.data.data?.releasedShifts ?? [];
      note(released.length
        ? `Leave approved for ${who} — ${released.length} rostered shift${released.length === 1 ? '' : 's'} released`
        : `Leave ${status.toLowerCase()} for ${who}`);
    } catch (e) {
      // Put the row back: the decision did not stick.
      setLeave((p) => p.map((l) => (l.id === id ? { ...l, status: row.status } : l)));
      note(e.response?.data?.message || 'Failed to update the leave request.');
    }
  }
  function saveBalance(updated) {
    api.patch(`/pm/leave-balance/${updated.user}`, updated).catch(() => {});
    setBalances((p) => p.map((b) => (b.user === updated.user ? { ...b, ...updated } : b)));
    setEditing(null);
    note(`Leave balance updated for ${nameOf(updated.user, updated.userName)}`);
  }

  const TABS = [['approvals', `Approvals (${pending.length})`], ['balances', 'Leave Balances'], ['history', 'All Requests']];

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Leave</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track leave, approve requests and adjust leave balances.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-600">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Approvals" value={pending.length} icon="⏳" color="yellow" />
          <StatCard label="Approved" value={leave.filter((l) => l.status === 'APPROVED').length} icon="✅" color="green" />
          <StatCard label="Rejected" value={leave.filter((l) => l.status === 'REJECTED').length} icon="🚫" color="blue" />
          <StatCard label="Total Requests" value={leave.length} icon="📋" color="purple" />
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === k ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
          ))}
        </div>

        {tab === 'approvals' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="divide-y divide-gray-50">
              {pending.map((l) => {
                const name = nameOf(l.user, l.userName);
                return (
                  <div key={l.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold">{name[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{name} <span className="text-xs font-normal text-gray-400">· {typeOf(l.userType)}</span></p>
                        <p className="text-xs text-gray-400 mt-0.5">{cap(l.type)} Leave · {l.from}{l.from !== l.to ? ` → ${l.to}` : ''} · {l.days} day{l.days !== 1 ? 's' : ''}{l.note ? ` · ${l.note}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => decide(l.id, 'REJECTED')} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Reject</button>
                      <button onClick={() => decide(l.id, 'APPROVED')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors">Approve</button>
                    </div>
                  </div>
                );
              })}
              {pending.length === 0 && <div className="px-5 py-12 text-center text-gray-400 text-sm">🎉 No pending leave requests.</div>}
            </div>
          </div>
        )}

        {tab === 'balances' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Annual (used / entitled)</th>
                  <th className="px-5 py-3 text-left font-medium">Medical (used / entitled)</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {balances.map((b) => {
                  const name = nameOf(b.user, b.userName);
                  const cell = (x) => (
                    <div className="flex items-center gap-2"><span className="text-gray-700">{x.used} / {x.entitled}</span><span className="text-xs text-gray-400">({x.entitled - x.used} left)</span></div>
                  );
                  return (
                    <tr key={b.user} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold">{name[0]}</div><span className="font-medium text-gray-800">{name}</span></div></td>
                      <td className="px-5 py-3">{cell(b.annual)}</td>
                      <td className="px-5 py-3">{cell(b.medical)}</td>
                      <td className="px-5 py-3"><button onClick={() => setEditing(b)} className="text-xs text-primary-600 hover:underline">Adjust</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Dates</th>
                  <th className="px-5 py-3 text-left font-medium">Days</th>
                  <th className="px-5 py-3 text-left font-medium">Applied</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leave.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{nameOf(l.user, l.userName)}</td>
                    <td className="px-5 py-3 text-gray-600">{cap(l.type)}</td>
                    <td className="px-5 py-3 text-gray-500">{l.from}{l.from !== l.to ? ` → ${l.to}` : ''}</td>
                    <td className="px-5 py-3 text-gray-500">{l.days}</td>
                    <td className="px-5 py-3 text-gray-400">{l.applied}</td>
                    <td className="px-5 py-3"><Badge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <AdjustBalanceModal balance={editing} onClose={() => setEditing(null)} onSave={saveBalance} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
