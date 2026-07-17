import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { WORKER_NAV } from './nav';

const FIELDS = ['Full Name', 'Email', 'Phone', 'Department', 'Job Title', 'Skills'];

export default function Profile() {
  const { user } = useAuth();
  const typeLabel = user?.user_type === 'PERMANENT_WORKER' ? 'Permanent Employee'
    : user?.user_type === 'TEMPORARY_WORKER' ? 'Temporary Employee' : '—';
  const initial = (user?.full_name?.[0] || '?').toUpperCase();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ field: FIELDS[0], requested_value: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [skills, setSkills] = useState([]);

  useEffect(() => { api.get('/worker/skills').then((r) => setSkills(r.data.data ?? [])).catch(() => {}); }, []);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function openModal() { setForm({ field: FIELDS[0], requested_value: '', reason: '' }); setError(''); setModalOpen(true); }

  async function submit(e) {
    e.preventDefault();
    if (!form.requested_value.trim()) { setError('Please describe the new value.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/worker/profile/change-request', {
        field: form.field,
        requested_value: form.requested_value.trim(),
        reason: form.reason.trim() || null,
      });
      setModalOpen(false);
      showToast('Change request sent to your organisation admin.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout navItems={WORKER_NAV} roleLabel="Permanent Employee">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your personal details and registered skills.</p>
          </div>
          <button
            onClick={openModal}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Request Changes
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
          To update your profile details or skills, use <span className="font-medium">Request Changes</span> — your organisation admin will review and apply the update.
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
              {initial}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{user?.full_name || '—'}</h3>
              <p className="text-sm text-gray-500">{typeLabel}</p>
              <p className="text-sm text-gray-400">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: user?.full_name || '—' },
              { label: 'Employee Type', value: typeLabel },
              { label: 'Department', value: '—' },
              { label: 'Job Title', value: '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Phone', value: '—' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <p className="text-sm font-medium text-gray-700">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">My Skills</h3>
            <button onClick={openModal} className="text-xs text-primary-600 hover:underline">Request skill change</button>
          </div>
          <p className="text-sm text-gray-400">Your skills are managed by your organisation admin. Use <span className="font-medium">Request skill change</span> to propose an update.</p>
        </div>
      </div>

      {/* Request Changes modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setModalOpen(false)}>
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Request Profile Change</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Field to change</label>
                <select value={form.field} onChange={set('field')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{form.field === 'Skills' ? 'Skill to add *' : 'Requested new value *'}</label>
                {form.field === 'Skills' ? (
                  <select required value={form.requested_value} onChange={set('requested_value')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Select a skill —</option>
                    {skills.map((s) => <option key={s.skill_id} value={s.skill_name}>{s.skill_name}</option>)}
                  </select>
                ) : (
                  <input
                    required
                    value={form.requested_value}
                    onChange={set('requested_value')}
                    placeholder="Enter the new value"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={set('reason')}
                  placeholder="e.g. Legal name change, wrong details at registration…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <p className="text-xs text-gray-400">Your organisation admin will review this request and apply the change on your behalf.</p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
