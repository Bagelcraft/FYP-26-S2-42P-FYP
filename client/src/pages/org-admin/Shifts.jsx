import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { ORG_ADMIN_NAV } from './nav';

function fmt(time) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short' }) : '—');

const EMPTY = { name: '', start_time: '', end_time: '' };

export default function Shifts() {
  const [shifts, setShifts]   = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');
  const [assignForm, setAssignForm] = useState({ user_id: '', shift_id: '', date: '' });
  const [assigning, setAssigning]   = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/org-admin/shifts'),
      api.get('/org-admin/shift-assignments'),
      api.get('/org-admin/staff'),
    ])
      .then(([sh, as, st]) => {
        setShifts(sh.data.data);
        setAssignments(as.data.data);
        setStaff(st.data.data);
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(''); setShowModal(true); }
  function openEdit(shift) { setEditing(shift); setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time }); setFormError(''); setShowModal(true); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      if (editing) {
        const r = await api.patch(`/org-admin/shifts/${editing.shift_id}`, form);
        setShifts((prev) => prev.map((s) => s.shift_id === editing.shift_id ? r.data.data : s));
      } else {
        const r = await api.post('/org-admin/shifts', form);
        setShifts((prev) => [...prev, r.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowModal(false);
    } catch (e) {
      setFormError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || e.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(shift) {
    if (!confirm(`Delete shift "${shift.name}"?`)) return;
    try {
      await api.delete(`/org-admin/shifts/${shift.shift_id}`);
      setShifts((prev) => prev.filter((s) => s.shift_id !== shift.shift_id));
    } catch (e) { alert(e.response?.data?.message || e.message); }
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssigning(true); setError('');
    try {
      const r = await api.post('/org-admin/shift-assignments', {
        user_id: Number(assignForm.user_id), shift_id: Number(assignForm.shift_id), date: assignForm.date,
      });
      setAssignments((prev) => [...prev, r.data.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setAssignForm({ user_id: '', shift_id: '', date: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || e.message);
    } finally { setAssigning(false); }
  }

  async function removeAssignment(a) {
    if (!confirm('Remove this shift assignment?')) return;
    try {
      await api.delete(`/org-admin/shift-assignments/${a.assignment_id}`);
      setAssignments((prev) => prev.filter((x) => x.assignment_id !== a.assignment_id));
    } catch (e) { alert(e.response?.data?.message || e.message); }
  }

  return (
    <DashboardLayout navItems={ORG_ADMIN_NAV} roleLabel="Organisation Admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Shifts &amp; Roster</h2>
            <p className="text-gray-500 text-sm mt-0.5">Define shift templates and roster staff onto shifts by date.</p>
          </div>
          <button onClick={openCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Shift
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Shift templates */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">Shift Templates</h3></div>
          {loading ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Shift Name</th>
                  <th className="px-5 py-3 text-left font-medium">Start</th>
                  <th className="px-5 py-3 text-left font-medium">End</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shifts.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(s.start_time)}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(s.end_time)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(s)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(s)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No shift templates yet. Add one above.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Roster: assign staff to shifts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">Roster — Assign Staff to Shifts</h3></div>
          <form onSubmit={handleAssign} className="px-5 py-4 flex flex-wrap items-end gap-3 border-b border-gray-50">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              <select required value={assignForm.user_id} onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— Select —</option>
                {staff.map((s) => <option key={s.userId} value={s.userId}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
              <select required value={assignForm.shift_id} onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— Select —</option>
                {shifts.map((s) => <option key={s.shift_id} value={s.shift_id}>{s.name} ({fmt(s.start_time)}–{fmt(s.end_time)})</option>)}
              </select>
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input required type="date" value={assignForm.date} onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button type="submit" disabled={assigning}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </form>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Employee</th>
                <th className="px-5 py-3 text-left font-medium">Shift</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map((a) => (
                <tr key={a.assignment_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-700 font-medium">{fmtDate(a.date)}</td>
                  <td className="px-5 py-3 text-gray-600">{a.user?.full_name}</td>
                  <td className="px-5 py-3 text-gray-600">{a.shift?.name} <span className="text-gray-400">({fmt(a.shift?.start_time)}–{fmt(a.shift?.end_time)})</span></td>
                  <td className="px-5 py-3">
                    <button onClick={() => removeAssignment(a)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
              {!loading && assignments.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No shifts rostered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{editing ? 'Edit Shift' : 'Add Shift Template'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shift Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Shift A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time *</label>
                  <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time *</label>
                  <input required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400">End before start indicates an overnight shift (e.g. 22:00 – 06:00).</p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
