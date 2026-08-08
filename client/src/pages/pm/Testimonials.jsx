import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { PM_NAV, PM_SECONDARY } from './nav';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Mirrors server/src/services/testimonialModeration.service.js — shown as guidance
// so submitters know what the automated selector is looking for.
const MIN_LENGTH = 40;
const MAX_LENGTH = 400;

function Stars({ n, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} onClick={onChange ? () => onChange(i) : undefined}
          className={`${onChange ? 'cursor-pointer' : ''} text-base ${i <= n ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
      ))}
    </div>
  );
}

function TestimonialModal({ item, onClose, onSaved, defaultName, defaultCompany }) {
  const editing = !!item;
  const [form, setForm] = useState(editing
    ? { name: item.name ?? '', company: item.company ?? '', rating: item.rating ?? 5, review_text: item.review_text ?? '' }
    : { name: defaultName ?? '', company: defaultCompany ?? '', rating: 5, review_text: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name:        form.name.trim(),
        company:     form.company.trim(),
        rating:      Number(form.rating),
        review_text: form.review_text.trim(),
      };
      let result;
      if (editing) {
        const r = await api.put(`/admin/content/testimonials/${item.testimonial_id}`, body);
        result = r.data;
      } else {
        const r = await api.post('/admin/content/testimonials', body);
        result = r.data;
      }
      onSaved(result);
      onClose();
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Testimonial' : 'New Testimonial'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                value={form.name}
                readOnly={!editing}
                onChange={editing ? set('name') : undefined}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${!editing ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-default' : 'border-gray-200 focus:ring-2 focus:ring-primary-500'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Organisation</label>
              <input
                value={form.company}
                readOnly={!editing}
                onChange={editing ? set('company') : undefined}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${!editing ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-default' : 'border-gray-200 focus:ring-2 focus:ring-primary-500'}`}
              />
            </div>
          </div>
          {!editing && (
            <p className="text-xs text-gray-400 -mt-2">Name and organisation are filled from your account.</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Rating</label>
            <Stars n={form.rating} onChange={(r) => setForm({ ...form, rating: r })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Review *</label>
            <textarea rows={4} required value={form.review_text} onChange={set('review_text')} placeholder="Share your experience with Smart Task Allocation…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <p className="text-xs text-gray-400">
            Testimonials are selected automatically: 4★ or higher, {MIN_LENGTH}–{MAX_LENGTH} characters,
            no links or contact details. You&apos;ll see the outcome as soon as you submit.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving || !form.review_text.trim()} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Submit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Testimonials() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);
  const [toast, setToast] = useState('');
  const [orgName, setOrgName] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  useEffect(() => {
    api.get('/pm/org-info')
      .then((r) => setOrgName(r.data.data?.name ?? ''))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/content/testimonials');
      const rows = Array.isArray(r.data) ? r.data : [];
      setItems(rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      note('Failed to load testimonials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(saved) {
    // The rules run on submit, so the outcome is known immediately. A save can also
    // shuffle which other testimonials hold a landing-page slot, so reload the list.
    note(saved.is_active
      ? 'Published to the landing page'
      : `Not published — ${saved.moderation?.reasons?.[0] ?? 'it did not meet the publication rules'}`);
    load();
  }

  async function remove(t) {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await api.delete(`/admin/content/testimonials/${t.testimonial_id}`);
      note('Testimonial deleted');
      // Deleting a published one frees a slot that a queued testimonial may now take.
      load();
    } catch {
      note('Failed to delete testimonial.');
    }
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Testimonials</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Submit a testimonial and it is scored against the publication rules straight away —
              no one approves it by hand.
            </p>
          </div>
          <button onClick={() => setModal(null)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">+ New Testimonial</button>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm py-10 text-center">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((t) => (
              <div key={t.testimonial_id} className={`bg-white rounded-xl border shadow-sm flex flex-col ${t.is_active ? 'border-gray-100' : 'border-gray-200 opacity-70'}`}>
                <div className="px-5 py-4 flex-1">
                  <div className="flex items-center justify-between">
                    <Stars n={t.rating} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? 'Published' : 'Not published'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">"{t.review_text}"</p>
                  {!t.is_active && t.auto_reasons && (
                    <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">
                      <span className="font-medium text-gray-600">Why:</span> {t.auto_reasons}
                    </p>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-gray-50">
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.company}{t.created_at ? ` · ${fmtDate(t.created_at)}` : ''}</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-50 flex gap-3">
                  <button onClick={() => setModal(t)} className="text-xs text-primary-600 hover:underline font-medium">Edit</button>
                  <button onClick={() => remove(t)} className="text-xs text-red-500 hover:underline font-medium ml-auto">Delete</button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400 text-sm">No testimonials yet. Create one to get started.</div>
            )}
          </div>
        )}
      </div>

      {modal !== undefined && (
        <TestimonialModal
          item={modal}
          onClose={() => setModal(undefined)}
          onSaved={handleSaved}
          defaultName={user?.full_name ?? ''}
          defaultCompany={orgName}
        />
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
