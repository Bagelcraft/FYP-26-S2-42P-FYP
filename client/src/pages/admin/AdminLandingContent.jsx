import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const TABS = ['Hero', 'About / Video', 'Pricing', 'Features', 'Testimonials'];

export default function AdminLandingContent() {
  const [tab, setTab] = useState('Hero');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Hero / Video / Pricing
  const [hero, setHero] = useState({ hero_title: '', hero_subtitle: '' });
  const [video, setVideo] = useState({ video_title: '', video_subtitle: '', video_url: '' });
  const [pricing, setPricing] = useState({ plan_name: '', plan_price: '', plan_description: '' });

  // Features
  const [features, setFeatures] = useState([]);
  const [featureModal, setFeatureModal] = useState(null); // null | { mode:'add'|'edit', data }

  // Testimonials
  const [testimonials, setTestimonials] = useState([]);
  const [testimModal, setTestimModal] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [contentRes, featRes, testimRes] = await Promise.all([
        fetch(`${API_BASE}/admin/content`, { headers }),
        fetch(`${API_BASE}/admin/content/features`, { headers }),
        fetch(`${API_BASE}/admin/content/testimonials`, { headers }),
      ]);
      const { content } = await contentRes.json();
      if (content) {
        setHero({ hero_title: content.hero_title || '', hero_subtitle: content.hero_subtitle || '' });
        setVideo({ video_title: content.video_title || '', video_subtitle: content.video_subtitle || '', video_url: content.video_url || '' });
        setPricing({ plan_name: content.plan_name || '', plan_price: content.plan_price || '', plan_description: content.plan_description || '' });
      }
      setFeatures(await featRes.json());
      setTestimonials(await testimRes.json());
    } catch {
      showToast('Failed to load content.', true);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  const put = async (path, body) => {
    const res = await fetch(`${API_BASE}/admin/content/${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error();
  };

  const saveHero = async (e) => {
    e.preventDefault();
    try { await put('hero', hero); showToast('Hero section saved.'); } catch { showToast('Failed to save.', true); }
  };
  const saveVideo = async (e) => {
    e.preventDefault();
    try { await put('video', video); showToast('About / Video section saved.'); } catch { showToast('Failed to save.', true); }
  };
  const savePricing = async (e) => {
    e.preventDefault();
    try { await put('pricing', pricing); showToast('Pricing section saved.'); } catch { showToast('Failed to save.', true); }
  };

  // Features CRUD
  const saveFeature = async (data) => {
    try {
      if (featureModal.mode === 'add') {
        const res = await fetch(`${API_BASE}/admin/content/features`, { method: 'POST', headers, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`${API_BASE}/admin/content/features/${featureModal.data.feature_id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
      }
      setFeatureModal(null);
      showToast('Feature saved.');
      const r = await fetch(`${API_BASE}/admin/content/features`, { headers });
      setFeatures(await r.json());
    } catch { showToast('Failed to save feature.', true); }
  };

  const deleteFeature = async (id) => {
    if (!window.confirm('Delete this feature?')) return;
    try {
      await fetch(`${API_BASE}/admin/content/features/${id}`, { method: 'DELETE', headers });
      setFeatures((p) => p.filter((f) => f.feature_id !== id));
      showToast('Feature deleted.');
    } catch { showToast('Failed to delete.', true); }
  };

  // Testimonials CRUD
  const saveTestimonial = async (data) => {
    try {
      if (testimModal.mode === 'add') {
        const res = await fetch(`${API_BASE}/admin/content/testimonials`, { method: 'POST', headers, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`${API_BASE}/admin/content/testimonials/${testimModal.data.testimonial_id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
        if (!res.ok) throw new Error();
      }
      setTestimModal(null);
      showToast('Testimonial saved.');
      const r = await fetch(`${API_BASE}/admin/content/testimonials`, { headers });
      setTestimonials(await r.json());
    } catch { showToast('Failed to save testimonial.', true); }
  };

  const deleteTestimonial = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await fetch(`${API_BASE}/admin/content/testimonials/${id}`, { method: 'DELETE', headers });
      setTestimonials((p) => p.filter((t) => t.testimonial_id !== id));
      showToast('Testimonial deleted.');
    } catch { showToast('Failed to delete.', true); }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';
  const saveBtnCls = 'bg-primary-600 hover:bg-primary-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors';

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Landing Page Content</h2>
          <p className="text-gray-500 text-sm mt-0.5">Edit the content shown on the public landing page.</p>
        </div>

        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

            {/* ── Hero ── */}
            {tab === 'Hero' && (
              <form onSubmit={saveHero} className="space-y-5 max-w-xl">
                <h3 className="font-semibold text-gray-800 mb-1">Hero Section</h3>
                <div>
                  <label className={labelCls}>Headline</label>
                  <input className={inputCls} value={hero.hero_title} onChange={(e) => setHero((p) => ({ ...p, hero_title: e.target.value }))} required maxLength={200} placeholder="Smart Task Allocation" />
                </div>
                <div>
                  <label className={labelCls}>Subheadline</label>
                  <textarea className={inputCls} rows={3} value={hero.hero_subtitle} onChange={(e) => setHero((p) => ({ ...p, hero_subtitle: e.target.value }))} placeholder="Your workforce, intelligently managed..." />
                </div>
                <button type="submit" className={saveBtnCls}>Save Hero</button>
              </form>
            )}

            {/* ── About / Video ── */}
            {tab === 'About / Video' && (
              <form onSubmit={saveVideo} className="space-y-5 max-w-xl">
                <h3 className="font-semibold text-gray-800 mb-1">About / Video Section</h3>
                <div>
                  <label className={labelCls}>Section Title</label>
                  <input className={inputCls} value={video.video_title} onChange={(e) => setVideo((p) => ({ ...p, video_title: e.target.value }))} maxLength={200} placeholder="Meet SmartTask..." />
                </div>
                <div>
                  <label className={labelCls}>Section Subtitle</label>
                  <textarea className={inputCls} rows={3} value={video.video_subtitle} onChange={(e) => setVideo((p) => ({ ...p, video_subtitle: e.target.value }))} placeholder="Brief description..." />
                </div>
                <div>
                  <label className={labelCls}>Video Embed URL <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className={inputCls} value={video.video_url} onChange={(e) => setVideo((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://www.youtube.com/embed/..." />
                  <p className="text-xs text-gray-400 mt-1">Use the embed URL, e.g. youtube.com/embed/VIDEO_ID</p>
                </div>
                <button type="submit" className={saveBtnCls}>Save About / Video</button>
              </form>
            )}

            {/* ── Pricing ── */}
            {tab === 'Pricing' && (
              <form onSubmit={savePricing} className="space-y-5 max-w-xl">
                <h3 className="font-semibold text-gray-800 mb-1">Pricing Section</h3>
                <div>
                  <label className={labelCls}>Plan Name</label>
                  <input className={inputCls} value={pricing.plan_name} onChange={(e) => setPricing((p) => ({ ...p, plan_name: e.target.value }))} maxLength={100} placeholder="Standard Plan" />
                </div>
                <div>
                  <label className={labelCls}>Price</label>
                  <input className={inputCls} value={pricing.plan_price} onChange={(e) => setPricing((p) => ({ ...p, plan_price: e.target.value }))} maxLength={50} placeholder="$9" />
                  <p className="text-xs text-gray-400 mt-1">Just the number/amount — "/month" is appended automatically.</p>
                </div>
                <div>
                  <label className={labelCls}>Plan Description</label>
                  <textarea className={inputCls} rows={2} value={pricing.plan_description} onChange={(e) => setPricing((p) => ({ ...p, plan_description: e.target.value }))} placeholder="Perfect for small teams..." />
                </div>
                <button type="submit" className={saveBtnCls}>Save Pricing</button>
              </form>
            )}

            {/* ── Features ── */}
            {tab === 'Features' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Features</h3>
                  <button onClick={() => setFeatureModal({ mode: 'add', data: { icon: '', title: '', description: '', sort_order: features.length } })}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    + Add Feature
                  </button>
                </div>
                {features.length === 0 ? (
                  <p className="text-gray-400 text-sm">No features yet. Add one above.</p>
                ) : (
                  <div className="space-y-2">
                    {features.map((f) => (
                      <div key={f.feature_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div className="flex items-center gap-3">
                          {f.icon && <span className="text-xl">{f.icon}</span>}
                          <div>
                            <p className="text-sm font-medium text-gray-800">{f.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{f.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {f.is_active ? 'Active' : 'Hidden'}
                          </span>
                          <button onClick={() => setFeatureModal({ mode: 'edit', data: { ...f } })}
                            className="text-xs text-primary-600 hover:underline px-2">Edit</button>
                          <button onClick={() => deleteFeature(f.feature_id)}
                            className="text-xs text-red-500 hover:underline px-2">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Testimonials ── */}
            {tab === 'Testimonials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Testimonials</h3>
                  <button onClick={() => setTestimModal({ mode: 'add', data: { name: '', company: '', rating: 5, review_text: '' } })}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    + Add Testimonial
                  </button>
                </div>
                {testimonials.length === 0 ? (
                  <p className="text-gray-400 text-sm">No testimonials yet.</p>
                ) : (
                  <div className="space-y-2">
                    {testimonials.map((t) => (
                      <div key={t.testimonial_id} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.name} <span className="text-gray-400 font-normal">· {t.company}</span></p>
                          <p className="text-xs text-yellow-500 mt-0.5">{'★'.repeat(t.rating)}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.review_text}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_active ? 'Active' : 'Hidden'}
                          </span>
                          <button onClick={() => setTestimModal({ mode: 'edit', data: { ...t } })}
                            className="text-xs text-primary-600 hover:underline px-2">Edit</button>
                          <button onClick={() => deleteTestimonial(t.testimonial_id)}
                            className="text-xs text-red-500 hover:underline px-2">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Modal */}
      {featureModal && (
        <FeatureModal
          initial={featureModal.data}
          onSave={saveFeature}
          onClose={() => setFeatureModal(null)}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}

      {/* Testimonial Modal */}
      {testimModal && (
        <TestimonialModal
          initial={testimModal.data}
          onSave={saveTestimonial}
          onClose={() => setTestimModal(null)}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}
    </DashboardLayout>
  );
}

function FeatureModal({ initial, onSave, onClose, inputCls, labelCls }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{initial.feature_id ? 'Edit Feature' : 'Add Feature'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div>
          <label className={labelCls}>Icon (emoji) <span className="text-gray-400 font-normal">optional</span></label>
          <input className={inputCls} value={form.icon || ''} onChange={(e) => set('icon', e.target.value)} placeholder="📋" maxLength={10} />
        </div>
        <div>
          <label className={labelCls}>Title <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Task Management" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Brief description..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Sort Order</label>
            <input type="number" className={inputCls} value={form.sort_order ?? 0} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} min={0} />
          </div>
          <div>
            <label className={labelCls}>Visibility</label>
            <select className={inputCls} value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => onSave(form)} disabled={!form.title?.trim()}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            Save
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialModal({ initial, onSave, onClose, inputCls, labelCls }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{initial.testimonial_id ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Sarah Lim" />
          </div>
          <div>
            <label className={labelCls}>Company</label>
            <input className={inputCls} value={form.company || ''} onChange={(e) => set('company', e.target.value)} placeholder="BuildTech Pte Ltd" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Rating (1–5)</label>
          <select className={inputCls} value={form.rating} onChange={(e) => set('rating', parseInt(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Review Text <span className="text-red-500">*</span></label>
          <textarea className={inputCls} rows={4} value={form.review_text} onChange={(e) => set('review_text', e.target.value)} required placeholder="What they said about SmartTask..." />
        </div>
        <div>
          <label className={labelCls}>Visibility</label>
          <select className={inputCls} value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => onSave(form)} disabled={!form.name?.trim() || !form.review_text?.trim()}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            Save
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
