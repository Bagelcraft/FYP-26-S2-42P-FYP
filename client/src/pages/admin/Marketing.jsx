import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ADMIN_NAV } from './nav';
import api from '../../utils/api';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function Section({ title, description, children, onSave, saving }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input className={inputCls} {...props} />
    </div>
  );
}

export default function Marketing() {
  const [content, setContent] = useState({});
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState('');
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const load = async () => {
    setError('');
    try {
      const [contentRes, featRes, testRes] = await Promise.all([
        api.get('/admin/content'),
        api.get('/admin/content/features'),
        api.get('/admin/content/testimonials'),
      ]);
      setContent(contentRes.data.content ?? {});
      setFeatures(featRes.data ?? []);
      setTestimonials(testRes.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load marketing content.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setC = (k) => (e) => setContent({ ...content, [k]: e.target.value });

  const save = async (key, path, body) => {
    setSaving(key); setError('');
    try {
      await api.put(`/admin/content/${path}`, body);
      note('Saved');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving('');
    }
  };

  // ── Features ──
  const setFeature = (id, patch) => setFeatures((p) => p.map((f) => (f.feature_id === id ? { ...f, ...patch } : f)));
  const addFeature = () => setFeatures((p) => [...p, { feature_id: `new-${Date.now()}`, title: '', description: '', icon_url: '', sort_order: p.length, is_active: true, _new: true }]);

  const saveFeature = async (f) => {
    setSaving(`f-${f.feature_id}`); setError('');
    try {
      const body = { title: f.title, description: f.description, icon_url: f.icon_url, sort_order: Number(f.sort_order) || 0, is_active: f.is_active };
      if (f._new) {
        const res = await api.post('/admin/content/features', body);
        setFeatures((p) => p.map((x) => (x.feature_id === f.feature_id ? res.data : x)));
      } else {
        const res = await api.put(`/admin/content/features/${f.feature_id}`, body);
        setFeatures((p) => p.map((x) => (x.feature_id === f.feature_id ? res.data : x)));
      }
      note('Feature saved');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save feature.');
    } finally {
      setSaving('');
    }
  };

  const deleteFeature = async (f) => {
    if (f._new) return setFeatures((p) => p.filter((x) => x.feature_id !== f.feature_id));
    if (!window.confirm('Delete this feature?')) return;
    try {
      await api.delete(`/admin/content/features/${f.feature_id}`);
      setFeatures((p) => p.filter((x) => x.feature_id !== f.feature_id));
      note('Feature deleted');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to delete feature.');
    }
  };

  // ── Testimonials visibility ──
  const toggleVisibility = async (t) => {
    try {
      const res = await api.patch(`/admin/content/testimonials/${t.testimonial_id}/visibility`, { is_active: !t.is_active });
      setTestimonials((p) => p.map((x) => (x.testimonial_id === t.testimonial_id ? res.data : x)));
      note(t.is_active ? 'Hidden from site' : 'Shown on site');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update visibility.');
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} roleLabel="System Admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Marketing Page</h2>
          <p className="text-gray-500 text-sm mt-0.5">Edit the public landing page content and choose which testimonials appear.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        {loading ? (
          <div className="text-gray-400 text-sm py-10 text-center">Loading…</div>
        ) : (
          <>
            {/* Hero */}
            <Section
              title="Hero Section"
              description="The main headline at the top of the page."
              saving={saving === 'hero'}
              onSave={() => save('hero', 'hero', { hero_title: content.hero_title, hero_subtitle: content.hero_subtitle, hero_image_url: content.hero_image_url })}
            >
              <Field label="Headline" value={content.hero_title ?? ''} onChange={setC('hero_title')} placeholder="Smart Task Allocation" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={content.hero_subtitle ?? ''} onChange={setC('hero_subtitle')} />
              </div>
            </Section>

            {/* Demo / Video */}
            <Section
              title="Demo Section"
              description="The 'See it in action' block beside the demo video."
              saving={saving === 'video'}
              onSave={() => save('video', 'video', { video_title: content.video_title, video_subtitle: content.video_subtitle, video_url: content.video_url })}
            >
              <Field label="Heading" value={content.video_title ?? ''} onChange={setC('video_title')} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={content.video_subtitle ?? ''} onChange={setC('video_subtitle')} />
              </div>
            </Section>

            {/* Pricing */}
            <Section
              title="Pricing Section"
              description="The pricing card details."
              saving={saving === 'pricing'}
              onSave={() => save('pricing', 'pricing', { plan_name: content.plan_name, plan_price: content.plan_price, plan_description: content.plan_description })}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan name" value={content.plan_name ?? ''} onChange={setC('plan_name')} placeholder="Standard Plan" />
                <Field label="Price (e.g. $9)" value={content.plan_price ?? ''} onChange={setC('plan_price')} placeholder="$9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={content.plan_description ?? ''} onChange={setC('plan_description')} />
              </div>
            </Section>

            {/* Features */}
            <Section title="Features" description="Feature cards shown on the landing page.">
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.feature_id} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50/50">
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <input className={inputCls} value={f.icon_url ?? ''} onChange={(e) => setFeature(f.feature_id, { icon_url: e.target.value })} placeholder="📋" title="Icon (emoji)" />
                      <input className={inputCls} value={f.title ?? ''} onChange={(e) => setFeature(f.feature_id, { title: e.target.value })} placeholder="Feature title" />
                    </div>
                    <textarea rows={2} className={`${inputCls} resize-none`} value={f.description ?? ''} onChange={(e) => setFeature(f.feature_id, { description: e.target.value })} placeholder="Feature description" />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={!!f.is_active} onChange={(e) => setFeature(f.feature_id, { is_active: e.target.checked })} className="rounded" />
                        Shown on site
                      </label>
                      <div className="flex gap-3">
                        <button onClick={() => saveFeature(f)} disabled={saving === `f-${f.feature_id}` || !f.title} className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50">
                          {saving === `f-${f.feature_id}` ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => deleteFeature(f)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addFeature} className="text-sm text-primary-600 hover:underline font-medium">+ Add feature</button>
              </div>
            </Section>

            {/* Testimonials selection */}
            <Section title="Testimonials" description="Choose which manager-written testimonials appear on the site. Content is edited by managers.">
              <div className="space-y-3">
                {testimonials.map((t) => (
                  <div key={t.testimonial_id} className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${t.is_active ? 'border-green-200 bg-green-50/40' : 'border-gray-100'}`}>
                    <div className="min-w-0">
                      <div className="flex gap-0.5 mb-1">{Array.from({ length: t.rating || 0 }).map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                      <p className="text-sm text-gray-700">“{t.review_text}”</p>
                      <p className="text-xs text-gray-400 mt-1">{t.name}{t.company ? ` · ${t.company}` : ''}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer">
                      <input type="checkbox" checked={!!t.is_active} onChange={() => toggleVisibility(t)} className="rounded" />
                      Show on site
                    </label>
                  </div>
                ))}
                {testimonials.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No testimonials yet. Managers can add them from their portal.</p>}
              </div>
            </Section>
          </>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>}
    </DashboardLayout>
  );
}
