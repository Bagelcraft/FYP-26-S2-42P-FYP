import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { PM_NAV, PM_SECONDARY } from './nav';

// Eligibility data comes straight from the allocation engine
// (GET /pm/tasks/:id/eligible-staff → { task, orgType, project, candidates, summary }).
// Each candidate:
//   { userId, full_name, user_type, staffRole, skills[], weeklyHours, maxHours,
//     remainingHours, isAvailable, withinHours, isDormant, inResourcePool,
//     blockers[], blockedDays[], rosteredDays, eligible, ineligibleReason }
const typeLabel = (t) => (t === 'PERMANENT_WORKER' ? 'Permanent Employee' : t === 'TEMPORARY_WORKER' ? 'Temporary Employee' : t);
const fmtDue = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }) : '—');

// Normalise whatever skill shape the API returns into [{ skill_id, skill_name }].
const skillsOf = (t) => {
  if (Array.isArray(t?.requiredSkills) && t.requiredSkills.length) {
    return t.requiredSkills.map((s) => s.skill ?? s);
  }
  if (t?.requiredSkill) return [t.requiredSkill];
  return [];
};

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
function Avatar({ name, ring }) {
  return <div className={`w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0 ${ring ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}>{name?.[0] ?? '?'}</div>;
}

export default function Allocate() {
  const [pending, setPending] = useState([]);
  const [sel, setSel] = useState(null);
  const [evalData, setEvalData] = useState(null); // { task, candidates }
  const [loading, setLoading] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const loadPending = useCallback(() => {
    setLoading(true);
    api.get('/pm/tasks', { params: { status: 'PENDING' } })
      .then((r) => { setPending(r.data.data); setSel((s) => s ?? r.data.data[0]?.task_id ?? null); })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Fetch ranked candidates whenever the selected task changes.
  useEffect(() => {
    if (!sel) { setEvalData(null); return; }
    setEvalLoading(true);
    api.get(`/pm/tasks/${sel}/eligible-staff`)
      .then((r) => setEvalData(r.data.data))
      .catch((e) => { setEvalData(null); setError(e.response?.data?.message || e.message); })
      .finally(() => setEvalLoading(false));
  }, [sel]);

  const task = pending.find((t) => t.task_id === sel);
  const taskSkills = skillsOf(task);
  const candidates = evalData?.candidates ?? [];
  const suggestion = candidates.find((c) => c.eligible);
  const summary = evalData?.summary;
  const project = evalData?.project;
  const isProjectOrg = evalData?.orgType === 'PROJECT';

  async function assign(userId, auto) {
    if (!sel) return;
    setBusy(true);
    try {
      const url = auto ? `/pm/tasks/${sel}/auto-allocate` : `/pm/tasks/${sel}/assign`;
      const res = await api.post(url, auto ? {} : { assigned_to: userId });
      const name = candidates.find((c) => c.userId === userId)?.full_name ?? 'staff';

      // A shift-based assignment can add roster entries so the worker is
      // actually scheduled for the work. Say so — changing someone's roster
      // without telling the manager would be a surprise.
      const rostered = res.data?.data?.autoRostered?.created ?? [];
      const rosterNote = rostered.length
        ? ` · also rostered onto ${rostered[0].shiftName} on ${rostered.length === 1
            ? new Date(rostered[0].date + 'T00:00:00').toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })
            : `${rostered.length} day(s)`}`
        : '';
      showToast(`${auto ? 'Auto-allocated' : 'Assigned'} “${task.title}” → ${auto ? (suggestion?.full_name ?? name) : name}${rosterNote}`);
      // Remove the now-assigned task from the queue and advance selection.
      setPending((prev) => {
        const next = prev.filter((t) => t.task_id !== sel);
        setSel(next[0]?.task_id ?? null);
        return next;
      });
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Allocate</h2>
            <p className="text-gray-500 text-sm mt-0.5">Assign pending tasks to eligible staff automatically or manually.</p>
          </div>
          <button disabled={!suggestion || busy} onClick={() => assign(suggestion?.userId, true)}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2">🤖 Auto-Allocate</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Queue */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Allocation Queue</h3>
              <p className="text-xs text-gray-400 mt-0.5">{pending.length} pending</p>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? <div className="px-5 py-12 text-center text-gray-400 text-sm">Loading…</div> : pending.map((t) => {
                const sk = skillsOf(t);
                return (
                  <button key={t.task_id} onClick={() => setSel(t.task_id)} className={`w-full text-left px-5 py-3.5 transition-colors ${sel === t.task_id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${sel === t.task_id ? 'text-primary-700' : 'text-gray-800'}`}>{t.title}</p>
                      {sel === t.task_id && <span className="text-primary-500 text-xs">●</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{sk.length ? sk.map((s) => s.skill_name).join(', ') : 'Any skill'} · Due {fmtDue(t.end_datetime)}</p>
                  </button>
                );
              })}
              {!loading && pending.length === 0 && <div className="px-5 py-12 text-center text-gray-400 text-sm">🎉 Queue empty.</div>}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-3 space-y-4">
            {task ? (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{task.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {project ? <span className="text-primary-600 font-medium">{project.name}</span> : (task.department?.name ?? 'No dept')}
                        {' · '}Requires <span className="font-medium text-gray-600">{taskSkills.length ? taskSkills.map((s) => s.skill_name).join(' + ') : 'any skill'}</span> · Due {fmtDue(task.end_datetime)}
                      </p>
                      {project && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {project.resourceCount > 0
                            ? `Candidates limited to the project's ${project.resourceCount}-worker resource pool.`
                            : 'No resource pool set — anyone qualified in the organisation can take this.'}
                        </p>
                      )}
                    </div>
                    <Badge status="PENDING" />
                  </div>

                  {/* Permanent staff come first; a temp is only reached when none is free. */}
                  {summary?.fallbackToTemporary && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800">
                      No permanent employee is free for this window — the work falls to a temporary worker,
                      who is activated by the assignment.
                    </div>
                  )}
                  {suggestion && (
                    <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={suggestion.full_name} ring />
                        <div>
                          <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide">🤖 Engine recommendation</p>
                          <p className="text-sm font-medium text-gray-800">{suggestion.full_name}{suggestion.remainingHours != null ? ` · ${suggestion.remainingHours}h spare` : ''}</p>
                        </div>
                      </div>
                      <button disabled={busy} onClick={() => assign(suggestion.userId, true)} className="text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">Auto-assign</button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 text-sm">Ranked Candidates</h4>
                    <span className="text-xs text-gray-400">
                      {summary
                        ? `${summary.idealMatches ?? summary.eligible} ideal · ${summary.withWarnings ?? 0} with caveats · ${summary.total - summary.eligible} unavailable`
                        : `${candidates.filter((c) => c.eligible).length} of ${candidates.length} assignable`}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {evalLoading ? <div className="px-5 py-10 text-center text-gray-400 text-sm">Evaluating eligibility…</div> : candidates.map((c, i) => (
                      <div key={c.userId} className={`px-5 py-3.5 ${!c.eligible ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-300 font-mono w-4">{i + 1}</span>
                            <Avatar name={c.full_name} ring={c === suggestion} />
                            <div>
                              <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                {c.full_name}
                                {/* A temp carrying no live work — assigning this task is what activates them. */}
                                {c.isDormant && (
                                  <span title="Free of shifts and carrying no active work — this assignment activates them"
                                    className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                    DORMANT
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">{typeLabel(c.user_type)}{c.staffRole ? ` · ${c.staffRole}` : ''}</p>
                            </div>
                          </div>
                          <button
                            disabled={!c.eligible || busy}
                            onClick={() => {
                              // Warned candidates are assignable, but the manager
                              // confirms the trade-off rather than tripping over it.
                              const w = c.warnings ?? [];
                              if (w.length && !window.confirm(
                                `Assign ${c.full_name} anyway?\n\n${w.map((x) => `• ${x.detail}`).join('\n')}`,
                              )) return;
                              assign(c.userId, false);
                            }}
                            title={!c.eligible ? (c.ineligibleReason ?? 'Unavailable for this window') : undefined}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              !c.eligible
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : (c.warnings?.length ?? 0) > 0
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {!c.eligible ? 'Unavailable' : (c.warnings?.length ?? 0) > 0 ? 'Assign anyway' : 'Assign'}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 pl-11">
                          {/* One chip per required skill — green if the candidate has it, red if missing. */}
                          {taskSkills.map((s) => <CheckChip key={s.skill_id} ok={(c.skills ?? []).includes(s.skill_name)}>{s.skill_name}</CheckChip>)}
                          <CheckChip ok={c.isAvailable}>
                            {c.isAvailable
                              ? (isProjectOrg ? 'Free' : 'On shift')
                              : isProjectOrg
                                ? 'Blocked'
                                : c.rosterCoverage > 0 ? `Rostered ${c.rosterCoverage}%` : 'Not rostered'}
                          </CheckChip>
                          <CheckChip ok={c.withinHours}>{c.withinHours ? `${c.remainingHours}h spare` : 'Hours maxed'}</CheckChip>
                          <HoursBar c={c} />
                        </div>
                        {!c.eligible && c.ineligibleReason && <p className="text-xs text-red-500 mt-1 pl-11">{c.ineligibleReason}</p>}
                        {c.eligible && (c.warnings?.length ?? 0) > 0 && (
                          <ul className="mt-1 pl-11 space-y-0.5">
                            {c.warnings.map((w, wi) => (
                              <li key={wi} className="text-xs text-amber-600">⚠ {w.detail}</li>
                            ))}
                          </ul>
                        )}
                        {/* Exactly which days are lost, so a partial clash is obvious. */}
                        {c.blockedDays?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 pl-11">
                            Unavailable on {c.blockedDays.map((d) => new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    {!evalLoading && candidates.length === 0 && (
                      <div className="px-5 py-10 text-center text-gray-400 text-sm">
                        {project?.resourceCount > 0
                          ? 'No one in this project\'s resource pool has the required skills. Add resources on the Projects page.'
                          : 'No staff with the required skills.'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center text-gray-400 text-sm">{loading ? 'Loading…' : 'No pending tasks to allocate.'}</div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-sm">{toast}</div>}
    </DashboardLayout>
  );
}
