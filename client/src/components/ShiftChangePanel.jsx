import { useEffect, useState, useCallback } from 'react';
import Badge from './Badge';
import api from '../utils/api';

const fmt = (d) => new Date(d).toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
};
const dayLabel = (d) => new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' });
const dateOnly = (d) => new Date(d).toISOString().slice(0, 10);

// Worker/temp shift-change requests: submit + view own. `base` = '/worker' | '/temp-worker'.
// The staff can only ask to swap a shift they are actually rostered on (dropdown of
// their assigned shifts) to another shift the org defines (dropdown of shift templates),
// so a shift timing they don't have can never be requested.
export default function ShiftChangePanel({ base }) {
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState([]);   // the staff's own assigned shifts (today onward)
  const [templates, setTemplates] = useState([]); // org shift templates to switch to
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assignment_id: '', requested_shift_id: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`${base}/shift-change-requests`),
      api.get(`${base}/schedule`),
      api.get(`${base}/shift-templates`),
    ])
      .then(([reqs, sched, tmpl]) => {
        setItems(reqs.data.data ?? []);
        setSchedule(sched.data.data ?? []);
        setTemplates(tmpl.data.data ?? []);
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const assignment = schedule.find((s) => String(s.assignment_id) === String(form.assignment_id));
      const template = templates.find((t) => String(t.shift_id) === String(form.requested_shift_id));
      if (!assignment || !template) { setError('Pick your current shift and the shift you want.'); setSaving(false); return; }
      const day = dateOnly(assignment.date);
      const payload = {
        original_shift:  `${day}T${assignment.shift.start_time}:00`,
        requested_shift: `${day}T${template.start_time}:00`,
        reason: form.reason || undefined,
      };
      const r = await api.post(`${base}/shift-change-request`, payload);
      setItems((p) => [r.data.data, ...p]);
      setShowForm(false);
      setForm({ assignment_id: '', requested_shift_id: '', reason: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Failed to submit.');
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Shift-Change Requests</h3>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm text-primary-600 hover:underline">+ Request change</button>
      </div>

      {error && <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-end gap-3">
          <div className="min-w-[230px] flex-1">
            <label className="block text-xs text-gray-500 mb-1">Your current shift</label>
            <select required value={form.assignment_id} onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Select a rostered shift —</option>
              {schedule.map((s) => (
                <option key={s.assignment_id} value={s.assignment_id}>
                  {dayLabel(s.date)} · {s.shift?.name} ({fmtTime(s.shift?.start_time)}–{fmtTime(s.shift?.end_time)})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[210px] flex-1">
            <label className="block text-xs text-gray-500 mb-1">Change to shift</label>
            <select required value={form.requested_shift_id} onChange={(e) => setForm({ ...form, requested_shift_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Select a shift —</option>
              {templates.map((t) => (
                <option key={t.shift_id} value={t.shift_id}>{t.name} ({fmtTime(t.start_time)}–{fmtTime(t.end_time)})</option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
            <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. medical appointment"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Submitting…' : 'Submit'}
          </button>
          {schedule.length === 0 && (
            <p className="w-full text-xs text-gray-400">You have no rostered shifts to change yet.</p>
          )}
        </form>
      )}

      <div className="divide-y divide-gray-50">
        {items.map((r) => (
          <div key={r.request_id} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <span className="text-gray-400">{fmt(r.original_shift)}</span>
              <span className="mx-2 text-gray-300">→</span>
              <span className="font-medium">{fmt(r.requested_shift)}</span>
            </div>
            <Badge status={r.status} />
          </div>
        ))}
        {!loading && items.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No shift-change requests.</div>}
        {loading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading…</div>}
      </div>
    </div>
  );
}
