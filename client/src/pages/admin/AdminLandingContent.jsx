import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const TABS = ['Headline', 'About / Video', 'Pricing', 'Features', 'Testimonials'];

function toEmbedUrl(url) {
  if (!url) return url;
  if (url.includes('/embed/')) return url;
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  return url;
}

export default function AdminLandingContent() {
  const [tab, setTab] = useState('Headline');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [hero, setHero]       = useState({ hero_title: '', hero_subtitle: '' });
  const [video, setVideo]     = useState({ video_title: '', video_subtitle: '', video_url: '' });
  const [pricing, setPricing] = useState({ plan_name: '', plan_price: '', plan_description: '' });
  const [testimonials, setTestimonials] = useState([]);
  const [rules, setRules] = useState(null);
  const [rerunning, setRerunning] = useState(false);
  const [features, setFeatures] = useState([]);
  const [editing, setEditing] = useState(null);   // feature being edited, or 'new'
  const [savingFeature, setSavingFeature] = useState(false);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [contentRes, testimRes, rulesRes, featRes] = await Promise.all([
        fetch(`${API_BASE}/admin/content`, { headers }),
        fetch(`${API_BASE}/admin/content/testimonials`, { headers }),
        fetch(`${API_BASE}/admin/content/testimonials/rules`, { headers }),
        fetch(`${API_BASE}/admin/content/features`, { headers }),
      ]);
      const { content } = await contentRes.json();
      if (content) {
        setHero({ hero_title: content.hero_title || '', hero_subtitle: content.hero_subtitle || '' });
        setVideo({ video_title: content.video_title || '', video_subtitle: content.video_subtitle || '', video_url: content.video_url || '' });
        setPricing({ plan_name: content.plan_name || '', plan_price: content.plan_price || '', plan_description: content.plan_description || '' });
      }
      setTestimonials(await testimRes.json());
      setRules((await rulesRes.json()).rules ?? null);
      setFeatures(await featRes.json());
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
    const payload = { ...video, video_url: toEmbedUrl(video.video_url) };
    if (payload.video_url !== video.video_url) setVideo(payload);
    try { await put('video', payload); showToast('About / Video section saved.'); } catch { showToast('Failed to save.', true); }
  };
  const savePricing = async (e) => {
    e.preventDefault();
    try { await put('pricing', pricing); showToast('Pricing section saved.'); } catch { showToast('Failed to save.', true); }
  };

  // There is deliberately no publish/hide control — the rules engine decides.
  // This just re-runs it, which is what refills a slot freed by a deletion or
  // picks up a newly submitted review.
  const rerunSelection = async () => {
    setRerunning(true);
    try {
      const res = await fetch(`${API_BASE}/admin/content/testimonials/reevaluate`, { method: 'POST', headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTestimonials(data.testimonials ?? []);
      showToast(`Rules applied to ${data.evaluated} testimonials — ${data.approved} published, ${data.rejected} held back.`);
    } catch {
      showToast('Failed to re-run the selection rules.', true);
    } finally {
      setRerunning(false);
    }
  };

  // ── Feature CRUD (backend: POST/PUT/DELETE /admin/content/features) ──
  const saveFeature = async (e) => {
    e.preventDefault();
    setSavingFeature(true);
    const isNew = editing.feature_id === undefined;
    const body = {
      title:       editing.title,
      description: editing.description,
      icon:        editing.icon || null,
      sort_order:  Number(editing.sort_order) || 0,
      ...(isNew ? {} : { is_active: editing.is_active }),
    };
    try {
      const res = await fetch(
        `${API_BASE}/admin/content/features${isNew ? '' : `/${editing.feature_id}`}`,
        { method: isNew ? 'POST' : 'PUT', headers, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setFeatures((prev) => (isNew
        ? [...prev, saved]
        : prev.map((f) => (f.feature_id === saved.feature_id ? saved : f))
      ).sort((a, b) => a.sort_order - b.sort_order));
      setEditing(null);
      showToast(isNew ? 'Feature added.' : 'Feature saved.');
    } catch {
      showToast('Failed to save feature.', true);
    } finally {
      setSavingFeature(false);
    }
  };

  const toggleFeature = async (f) => {
    try {
      const res = await fetch(`${API_BASE}/admin/content/features/${f.feature_id}`, {
        method: 'PUT', headers, body: JSON.stringify({ ...f, is_active: !f.is_active }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setFeatures((prev) => prev.map((x) => (x.feature_id === saved.feature_id ? saved : x)));
      showToast(saved.is_active ? 'Feature shown on the landing page.' : 'Feature hidden.');
    } catch { showToast('Failed to update feature.', true); }
  };

  const deleteFeature = async (f) => {
    if (!window.confirm(`Delete "${f.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/content/features/${f.feature_id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error();
      setFeatures((prev) => prev.filter((x) => x.feature_id !== f.feature_id));
      showToast('Feature deleted.');
    } catch { showToast('Failed to delete feature.', true); }
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

            {/* ── Headline ── */}
            {tab === 'Headline' && (
              <form onSubmit={saveHero} className="space-y-5 max-w-xl">
                <h3 className="font-semibold text-gray-800 mb-1">Headline Section</h3>
                <div>
                  <label className={labelCls}>Headline</label>
                  <input className={inputCls} value={hero.hero_title} onChange={(e) => setHero((p) => ({ ...p, hero_title: e.target.value }))} required maxLength={200} placeholder="Smart Task Allocation" />
                </div>
                <div>
                  <label className={labelCls}>Subheadline</label>
                  <textarea className={inputCls} rows={3} value={hero.hero_subtitle} onChange={(e) => setHero((p) => ({ ...p, hero_subtitle: e.target.value }))} placeholder="Your workforce, intelligently managed..." />
                </div>
                <button type="submit" className={saveBtnCls}>Save Headline</button>
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
                  <input className={inputCls} value={video.video_url} onChange={(e) => setVideo((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=... or youtu.be/..." />
                  <p className="text-xs text-gray-400 mt-1">Paste any YouTube link — it will be converted to an embed URL automatically on save.</p>
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
                  <p className="text-xs text-gray-400 mt-1">
                    Just the number/amount — "/month" is appended automatically. Leave blank to track
                    the active subscription plan, so the advertised price always matches what
                    organisations are billed.
                  </p>
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Landing Page Features</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      The feature cards shown on the public site. Lower sort order appears first;
                      hidden features stay saved but are not published.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing({ title: '', description: '', icon: '', sort_order: (features.length + 1) })}
                    className="flex-shrink-0 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>

                {editing && (
                  <form onSubmit={saveFeature} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                    <h4 className="font-medium text-gray-800 text-sm">
                      {editing.feature_id === undefined ? 'New feature' : `Editing "${editing.title}"`}
                    </h4>
                    <div className="grid sm:grid-cols-[80px_1fr_110px] gap-3">
                      <div>
                        <label className={labelCls}>Icon</label>
                        <input className={inputCls} value={editing.icon ?? ''} maxLength={10} placeholder="🤖"
                          onChange={(e) => setEditing((p) => ({ ...p, icon: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Title</label>
                        <input className={inputCls} value={editing.title} required maxLength={200} placeholder="Automated Task Allocation"
                          onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Sort order</label>
                        <input className={inputCls} type="number" min={0} value={editing.sort_order ?? 0}
                          onChange={(e) => setEditing((p) => ({ ...p, sort_order: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Description</label>
                      <textarea className={inputCls} rows={3} value={editing.description ?? ''}
                        placeholder="What this feature does, in one or two sentences."
                        onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                      <button type="submit" disabled={savingFeature || !editing.title.trim()} className={saveBtnCls}>
                        {savingFeature ? 'Saving…' : 'Save Feature'}
                      </button>
                    </div>
                  </form>
                )}

                {features.length === 0 ? (
                  <p className="text-gray-400 text-sm">No features yet. Add one to populate the landing page.</p>
                ) : (
                  <div className="space-y-2">
                    {features.map((f) => (
                      <div key={f.feature_id} className={`flex items-start justify-between rounded-xl px-4 py-3 border ${f.is_active ? 'bg-gray-50 border-gray-100' : 'bg-white border-dashed border-gray-200 opacity-70'}`}>
                        <div className="flex gap-3 flex-1 min-w-0">
                          <span className="text-xl leading-none mt-0.5">{f.icon || '•'}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{f.title}</p>
                              <span className="text-xs text-gray-400">#{f.sort_order}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{f.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {f.is_active ? 'Shown' : 'Hidden'}
                          </span>
                          <button onClick={() => setEditing(f)} className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                          <button onClick={() => toggleFeature(f)} className={`text-xs font-medium hover:underline ${f.is_active ? 'text-gray-500' : 'text-green-600'}`}>
                            {f.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button onClick={() => deleteFeature(f)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Customer Testimonials</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Selection is automatic. Every submitted testimonial is scored against the rules
                      below and published only if it passes all of them — there is no manual override.
                    </p>
                  </div>
                  <button
                    onClick={rerunSelection}
                    disabled={rerunning || testimonials.length === 0}
                    className="flex-shrink-0 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {rerunning ? 'Re-running…' : 'Re-run selection'}
                  </button>
                </div>

                {rules && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Publication rules</p>
                    <ul className="text-xs text-blue-900/80 space-y-1">
                      <li>• Rated {rules.MIN_RATING}★ or higher</li>
                      <li>• Between {rules.MIN_LENGTH} and {rules.MAX_LENGTH} characters, at least {rules.MIN_WORDS} words</li>
                      <li>• No profanity, promotional spam, links, emails, or phone numbers</li>
                      <li>• Under {Math.round(rules.MAX_CAPS_RATIO * 100)}% uppercase, no excessive punctuation</li>
                      <li>• Not a near-duplicate of an already published review</li>
                      <li>• Top {rules.MAX_PUBLISHED} by quality score — the rest queue for the next free slot</li>
                    </ul>
                  </div>
                )}

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
                          {!t.is_active && t.auto_reasons && (
                            <p className="text-xs text-gray-500 mt-1.5">
                              <span className="font-medium text-gray-600">Held back:</span> {t.auto_reasons}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <span className="text-xs text-gray-400" title="Automated quality score out of 100">
                            {t.auto_score}/100
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_active ? 'Published' : 'Not published'}
                          </span>
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
