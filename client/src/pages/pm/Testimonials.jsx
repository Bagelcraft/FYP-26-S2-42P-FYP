import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { PM_NAV, PM_SECONDARY } from './nav';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE MODE — no backend required.
// Testimonials are stored in the browser's localStorage so the page is fully
// functional (create / edit / publish / delete, persists across refreshes)
// without a server or database. To switch back to the real API later, replace
// the `db` helpers below with the api.get/post/put/delete calls.
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'smarttask_testimonials';

const SEED = [
  { testimonial_id: 1, name: 'Alson Lim',  company: 'TechCorp Pte Ltd',  rating: 5, review_text: 'Smart Task Allocation has transformed how we manage our team. The auto-allocation feature saves us hours every week.', is_active: true,  created_at: '2026-04-15T09:00:00.000Z' },
  { testimonial_id: 2, name: 'Sarah Lim',  company: 'BuildTech Pte Ltd', rating: 5, review_text: 'Auto-allocation alone saves us 3 hours every day across our 80-person team. Onboarding was seamless.', is_active: true,  created_at: '2026-04-02T09:00:00.000Z' },
  { testimonial_id: 3, name: 'Priya Nair', company: 'NovaSoft Asia',     rating: 4, review_text: 'We were fully set up in under an hour with all our staff registered. The role-based dashboards are intuitive.', is_active: false, created_at: '2026-03-20T09:00:00.000Z' },
];

// Tiny localStorage-backed "database".
const db = {
  read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return SEED.slice();
  },
  write(rows) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); return rows; },
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

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

function TestimonialModal({ item, onClose, onSaved }) {
  const editing = !!item;
  const [form, setForm] = useState(editing
    ? { name: item.name ?? '', company: item.company ?? '', rating: item.rating ?? 5, review_text: item.review_text ?? '', is_active: item.is_active ?? true }
    : { name: '', company: '', rating: 5, review_text: '', is_active: true });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    onSaved({
      testimonial_id: editing ? item.testimonial_id : Date.now(),
      name: form.name.trim(),
      company: form.company.trim(),
      rating: Number(form.rating),
      review_text: form.review_text.trim(),
      is_active: form.is_active,
      created_at: editing ? item.created_at : new Date().toISOString(),
    }, editing);
    onClose();
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input required value={form.name} onChange={set('name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company / Role</label>
              <input value={form.company} onChange={set('company')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Rating</label><Stars n={form.rating} onChange={(r) => setForm({ ...form, rating: r })} /></div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Review</label>
            <textarea rows={4} value={form.review_text} onChange={set('review_text')} placeholder="Share your experience with Smart Task Allocation…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            Publish to marketing site
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={!form.review_text.trim()} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{editing ? 'Save Changes' : 'Publish'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Testimonials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [toast, setToast] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const load = useCallback(() => {
    setLoading(true);
    // Read from the localStorage "database".
    const rows = db.read().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setItems(rows);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function persist(rows) { db.write(rows); setItems(rows.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); }

  function handleSaved(saved, wasEdit) {
    const rows = db.read();
    const next = wasEdit
      ? rows.map((t) => (t.testimonial_id === saved.testimonial_id ? saved : t))
      : [saved, ...rows];
    persist(next);
    note(wasEdit ? 'Testimonial updated' : 'Testimonial published');
  }
  function togglePublish(t) {
    const rows = db.read().map((x) => (x.testimonial_id === t.testimonial_id ? { ...x, is_active: !x.is_active } : x));
    persist(rows);
    note(t.is_active ? 'Unpublished' : 'Published');
  }
  function remove(t) {
    if (!confirm('Delete this testimonial?')) return;
    persist(db.read().filter((x) => x.testimonial_id !== t.testimonial_id));
    note('Testimonial deleted');
  }

  return (
    <DashboardLayout navItems={PM_NAV} secondaryNav={PM_SECONDARY} roleLabel="Manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Testimonials</h2>
            <p className="text-gray-500 text-sm mt-0.5">Create, edit and publish testimonials shown on the marketing site.</p>
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
                  <div className="flex items-center justify-between"><Stars n={t.rating} />{!t.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>}</div>
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">“{t.review_text}”</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-50">
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.company}{t.created_at ? ` · ${fmtDate(t.created_at)}` : ''}</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-50 flex gap-3">
                  <button onClick={() => setModal(t)} className="text-xs text-primary-600 hover:underline font-medium">Edit</button>
                  <button onClick={() => togglePublish(t)} className="text-xs text-yellow-600 hover:underline font-medium">{t.is_active ? 'Unpublish' : 'Publish'}</button>
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

      {modal !== undefined && <TestimonialModal item={modal} onClose={() => setModal(undefined)} onSaved={handleSaved} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
