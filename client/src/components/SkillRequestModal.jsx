import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

// Skill changes get their own popup rather than riding on the generic
// "Request Profile Change" form, because they are a different shape of request:
// a set of skills, not one text value.
//
// The organisation's existing skills are listed to pick from. That is the whole
// point — left to free text the register fills up with "Forklift", "forklift "
// and "Fork Lift" as three separate skills. Proposing a new one is still allowed,
// but only after it fails a duplicate check against the list.
export default function SkillRequestModal({ endpoint, currentSkills = [], onClose, onSubmitted }) {
  const [orgSkills, setOrgSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(() => currentSkills.map((s) => s.skill_id));
  const [proposed, setProposed] = useState([]);
  const [draft, setDraft] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const base = endpoint.replace('/profile/change-request', '');

  useEffect(() => {
    api.get(`${base}/skills`)
      .then((r) => setOrgSkills(r.data.data ?? []))
      .catch(() => setError('Could not load your organisation’s skills.'))
      .finally(() => setLoading(false));
  }, [base]);

  const norm = (v) => v.trim().toLowerCase();

  // Duplicate detection runs against both the existing register and anything
  // already queued in this request, so the message is specific about which.
  const duplicateOf = useMemo(() => {
    const q = norm(draft);
    if (!q) return null;
    const existing = orgSkills.find((s) => norm(s.skill_name) === q);
    if (existing) return { kind: 'existing', name: existing.skill_name, id: existing.skill_id };
    if (proposed.some((p) => norm(p) === q)) return { kind: 'queued', name: draft.trim() };
    return null;
  }, [draft, orgSkills, proposed]);

  const toggle = (id) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function addProposed() {
    const name = draft.trim();
    if (!name || duplicateOf) return;
    setProposed((prev) => [...prev, name]);
    setDraft('');
  }

  const currentIds = new Set(currentSkills.map((s) => s.skill_id));
  const changed =
    proposed.length > 0 ||
    picked.length !== currentIds.size ||
    picked.some((id) => !currentIds.has(id));

  async function submit(e) {
    e.preventDefault();
    if (!changed) { setError('Nothing has changed yet.'); return; }
    if (!picked.length && !proposed.length) { setError('Select at least one skill, or propose a new one.'); return; }
    setSaving(true); setError('');
    try {
      await api.post(endpoint, {
        field: 'Skills',
        skill_ids: picked,
        new_skills: proposed,
        reason: reason.trim() || null,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">Request Skill Change</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your organisation admin reviews this before it takes effect.</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-600">Your skills</label>
              <span className="text-xs text-gray-400">{picked.length} selected</span>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400 py-3 text-center">Loading skills…</p>
            ) : orgSkills.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                Your organisation has no skills registered yet — propose one below.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                {orgSkills.map((s) => {
                  const has = currentIds.has(s.skill_id);
                  return (
                    <label key={s.skill_id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={picked.includes(s.skill_id)}
                        onChange={() => toggle(s.skill_id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{s.skill_name}</span>
                      {has && <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">current</span>}
                      {s.cert_required && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">cert</span>}
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Tick what you can do and untick what you no longer do. Approved changes replace your current set.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-600 mb-1">Not listed? Propose a new skill</label>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProposed(); } }}
                placeholder="e.g. Forklift Operation"
                maxLength={100}
                className={inputCls}
              />
              <button
                type="button"
                onClick={addProposed}
                disabled={!draft.trim() || !!duplicateOf}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
              >
                + Add
              </button>
            </div>

            {duplicateOf && (
              <p className="text-xs text-amber-600 mt-1.5">
                {duplicateOf.kind === 'existing'
                  ? <>&ldquo;{duplicateOf.name}&rdquo; already exists — tick it in the list above instead.</>
                  : <>You have already proposed &ldquo;{duplicateOf.name}&rdquo;.</>}
              </p>
            )}

            {proposed.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {proposed.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full pl-2.5 pr-1.5 py-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => setProposed((prev) => prev.filter((p) => p !== name))}
                      aria-label={`Remove ${name}`}
                      className="text-primary-400 hover:text-primary-700 leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Completed forklift certification last month"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            type="submit"
            disabled={saving || !changed}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
