import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const TABS = ['Hero', 'About / Video', 'Pricing', 'Testimonials'];

export default function AdminLandingContent() {
  const [tab, setTab] = useState('Hero');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [hero, setHero]       = useState({ hero_title: '', hero_subtitle: '' });
  const [video, setVideo]     = useState({ video_title: '', video_subtitle: '', video_url: '' });
  const [pricing, setPricing] = useState({ plan_name: '', plan_price: '', plan_description: '' });
  const [testimonials, setTestimonials] = useState([]);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [contentRes, testimRes] = await Promise.all([
        fetch(`${API_BASE}/admin/content`, { headers }),
        fetch(`${API_BASE}/admin/content/testimonials`, { headers }),
      ]);
      const { content } = await contentRes.json();
      if (content) {
        setHero({ hero_title: content.hero_title || '', hero_subtitle: content.hero_subtitle || '' });
        setVideo({ video_title: content.video_title || '', video_subtitle: content.video_subtitle || '', video_url: content.video_url || '' });
        setPricing({ plan_name: content.plan_name || '', plan_price: content.plan_price || '', plan_description: content.plan_description || '' });
      }
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

  const toggleTestimonial = async (t) => {
    try {
      const res = await fetch(`${API_BASE}/admin/content/testimonials/${t.testimonial_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (!res.ok) throw new Error();
      setTestimonials((prev) =>
        prev.map((x) => x.testimonial_id === t.testimonial_id ? { ...x, is_active: !x.is_active } : x)
      );
      showToast(t.is_active ? 'Testimonial hidden from landing page.' : 'Testimonial shown on landing page.');
    } catch { showToast('Failed to update testimonial.', true); }
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

            {/* ── Testimonials ── */}
            {tab === 'Testimonials' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Customer Testimonials</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    These testimonials are submitted by customers. Toggle which ones appear on the landing page.
                  </p>
                </div>
                {testimonials.length === 0 ? (
                  <p className="text-gray-400 text-sm">No testimonials submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {testimonials.map((t) => (
                      <div key={t.testimonial_id} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800">{t.name}</p>
                            {t.company && <span className="text-xs text-gray-400">· {t.company}</span>}
                            <span className="text-yellow-400 text-xs">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">"{t.review_text}"</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_active ? 'Shown' : 'Hidden'}
                          </span>
                          <button
                            onClick={() => toggleTestimonial(t)}
                            className={`text-xs font-medium hover:underline ${t.is_active ? 'text-red-500' : 'text-green-600'}`}
                          >
                            {t.is_active ? 'Hide' : 'Show'}
                          </button>
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
    </DashboardLayout>
  );
}
