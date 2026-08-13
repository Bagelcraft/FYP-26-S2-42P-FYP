import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';

// Sunday-first to match JS getDay(), which is what the API expects for weekdays.
const WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' }) : '—';

export default function Roster() {
  const [shifts, setShifts] = useState([]);
  const [team, setTeam] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const today = useMemo(() => new Date(), []);
  const inTwoWeeks = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 13); return d; }, []);

  const [form, setForm] = useState({
    shift_id: '',
    user_ids: [],
    weekdays: [1, 2, 3, 4, 5],
    from: ymd(today),
    to: ymd(inTwoWeeks),
  });

  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, a] = await Promise.all([
        api.get('/pm/shift-templates'),
        api.get('/pm/team'),
        api.get('/pm/shift-assignments'),
      ]);
      const templates = s.data.data ?? [];
      setShifts(templates);
      setTeam(t.data.data ?? []);
      setAssignments(a.data.data ?? []);
      setForm((prev) => ({ ...prev, shift_id: prev.shift_id || String(templates[0]?.shift_id ?? '') }));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load the roster.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePerson = (id) =>
    setForm((p) => ({ ...p, user_ids: p.user_ids.includes(id) ? p.user_ids.filter((x) => x !== id) : [...p.user_ids, id] }));
  const toggleDay = (d) =>
    setForm((p) => ({ ...p, weekdays: p.weekdays.includes(d) ? p.weekdays.filter((x) => x !== d) : [...p.weekdays, d] }));

  const canSubmit = form.shift_id && form.user_ids.length > 0 && form.weekdays.length > 0 && form.from && form.to;

  async function assign(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const r = await api.post('/pm/shift-assignments/bulk', {
        shift_id: Number(form.shift_id),
        user_ids: form.user_ids,
        weekdays: form.weekdays,
        from: form.from,
        to: form.to,
      });
      const created = r.data.data?.created ?? r.data.data?.count ?? 0;
      note(created ? `${created} shift(s) rostered.` : 'No new shifts — those days were already rostered.');
      setForm((p) => ({ ...p, user_ids: [] }));
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.errors?.[0]?.msg ?? 'Failed to roster those shifts.');
    } finally {
      setSaving(false);
    }
  }

  // Clearing week by week is unusable once a roster spans a month. Two scopes:
  // from today onwards (the common case — replan the future, keep worked history)
  // or genuinely everything.
  async function clearAll(scope) {
    const fromToday = scope === 'upcoming';
    const count = fromToday ? upcoming.length : assignments.length;
    if (!count) { note('Nothing to clear.'); return; }

    if (!window.confirm(
      fromToday
        ? `Remove all ${count} upcoming shift(s) from today onwards?\n\nPast shifts are kept.`
        : `Remove ALL ${count} shift(s), including past ones?\n\nThis cannot be undone.`,
    )) return;

    setClearing(true);
    try {
      const qs = fromToday ? `?from=${ymd(new Date())}` : '';
      const r = await api.delete(`/pm/shift-assignments/clear${qs}`);
      note(`${r.data.data?.deleted ?? 0} shift(s) removed.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to clear the roster.');
    } finally {
      setClearing(false);
    }
  }

  async function remove(a) {
    if (!window.confirm(`Remove ${a.user?.full_name ?? 'this worker'} from ${fmtDate(a.date)}?`)) return;
    try {
      await api.delete(`/pm/shift-assignments/${a.assignment_id}`);
      setAssignments((prev) => prev.filter((x) => x.assignment_id !== a.assignment_id));
      note('Shift removed.');
    } catch (err) {
      note(err.response?.data?.message ?? 'Failed to remove that shift.');
    }
  }

  // Upcoming only — a past roster is history, and the list is long enough already.
  const upcoming = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return assignments
      .filter((a) => new Date(a.date) >= start)
      .sort((x, y) => new Date(x.date) - new Date(y.date));
  }, [assignments]);

  const grouped = useMemo(() => {
    const byDate = new Map();
    for (const a of upcoming) {
      const key = String(a.date).slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(a);
    }
    return [...byDate.entries()];
  }, [upcoming]);

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Roster</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Set which shift your people work and on which days. Shift templates are defined by your
            organisation admin — you schedule against them.
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : shifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-500 text-sm">No shift templates exist yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Ask your organisation admin to create them under Shift Templates, then come back here to roster people onto them.
            </p>
          </div>
        ) : (
          <>
            {/* Assign */}
            <form onSubmit={assign} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
              <h3 className="font-semibold text-gray-800 text-sm">Roster people onto a shift</h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
                  <select value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })} className={inputCls}>
                    {shifts.map((s) => (
                      <option key={s.shift_id} value={s.shift_id}>{s.name} ({s.start_time}–{s.end_time})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm({ ...form, to: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Working days</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const on = form.weekdays.includes(d.value);
                    return (
                      <button
                        key={d.value} type="button" onClick={() => toggleDay(d.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          on ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  A shift is created on each selected weekday between the two dates above.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-600">Employees</label>
                  {form.user_ids.length > 0 && <span className="text-xs text-primary-600 font-medium">{form.user_ids.length} selected</span>}
                </div>
                {team.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No employees to roster yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                    {team.map((m) => (
                      <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox" checked={form.user_ids.includes(m.id)} onChange={() => togglePerson(m.id)}
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

              <div className="flex justify-end">
                <button type="submit" disabled={!canSubmit || saving}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Rostering…' : 'Add to roster'}
                </button>
              </div>
            </form>

            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 text-sm">Upcoming shifts</h3>
                  <span className="text-xs text-gray-400">{upcoming.length} scheduled</span>
                </div>
                {assignments.length > 0 && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => clearAll('upcoming')}
                      disabled={clearing || upcoming.length === 0}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      {clearing ? 'Clearing…' : 'Clear upcoming'}
                    </button>
                    <button
                      onClick={() => clearAll('all')}
                      disabled={clearing}
                      title="Removes past shifts too"
                      className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-40"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
              {grouped.length === 0 ? (
                <p className="px-5 py-10 text-center text-gray-400 text-sm">Nothing rostered yet.</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
                  {grouped.map(([date, rows]) => (
                    <div key={date} className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{fmtDate(date)}</p>
                      <div className="space-y-1.5">
                        {rows.map((a) => (
                          <div key={a.assignment_id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-800 truncate">{a.user?.full_name ?? `User #${a.user_id}`}</p>
                              <p className="text-xs text-gray-400">
                                {a.shift?.name ?? 'Shift'}
                                {a.shift?.start_time ? ` · ${a.shift.start_time}–${a.shift.end_time}` : ''}
                              </p>
                            </div>
                            <button onClick={() => remove(a)} className="text-xs font-medium text-red-500 hover:underline flex-shrink-0">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
