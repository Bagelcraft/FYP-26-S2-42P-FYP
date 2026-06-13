import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const DEFAULT_FEATURES = [
  { icon: '📋', title: 'Task Management', description: 'Create, assign, and track tasks across your entire organisation in real time.' },
  { icon: '🤖', title: 'Auto Allocation', description: 'Automatically assign tasks to the best available staff based on skills and schedule.' },
  { icon: '📅', title: 'Workforce Scheduling', description: 'Manage availability, shifts, and leave in one unified calendar.' },
  { icon: '📊', title: 'Reports & Analytics', description: 'Monitor working hours, task completion rates, and team performance.' },
  { icon: '🔔', title: 'Real-time Notifications', description: 'Keep your team informed with instant in-app notifications for every update.' },
];

const DEFAULT_TESTIMONIALS = [
  { name: 'Sarah Lim', company: 'BuildTech Pte Ltd', rating: 5, review_text: 'SmartTask transformed how we manage our 80-person team. Auto-allocation alone saves us 3 hours every day.' },
  { name: 'James Tan', company: 'LogiCore Solutions', rating: 5, review_text: 'The role-based dashboards are intuitive. Our project managers and workers both love using it.' },
  { name: 'Priya Nair', company: 'NovaSoft Asia', rating: 4, review_text: 'Onboarding was seamless. We were fully set up in under an hour with all our staff registered.' },
];

export default function Home() {
  const [content, setContent] = useState(null);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/admin/content`)
      .then((r) => r.json())
      .then((d) => {
        if (d.content) setContent(d.content);
        if (d.features?.length) setFeatures(d.features);
        if (d.testimonials?.length) setTestimonials(d.testimonials);
      })
      .catch(() => {});
  }, []);

  const hero_title    = content?.hero_title    || 'Smart Task Allocation';
  const hero_subtitle = content?.hero_subtitle || 'Your workforce, intelligently managed. Tasks assigned automatically.\nProgress tracked in real time.';
  const video_title   = content?.video_title   || 'Meet SmartTask — your all-in-one task management solution';
  const video_subtitle = content?.video_subtitle || 'How SmartTask helps organisations manage staff, automate task allocation, and track real-time progress — all from one unified platform.';
  const plan_name     = content?.plan_name     || 'Standard Plan';
  const plan_price    = content?.plan_price    || '$9';
  const plan_desc     = content?.plan_description || 'Perfect for small teams and growing organisations.';

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormStatus(null);
    try {
      const res = await fetch(`${API_BASE}/public/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setFormStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setFormStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 backdrop-blur-md">
        <div className="w-full px-8 h-16 flex items-center justify-between">
          <span className="text-blue-400 font-bold text-lg tracking-tight">SmartTask</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">About Us</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
          </div>
          <Link to="/login" className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-[calc(100vh-64px)]">
        <div className="flex-1 bg-slate-950 flex items-center px-10 lg:px-20 py-14">
          <div className="max-w-lg">
            <span className="inline-block text-primary-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Workforce Management Platform
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">{hero_title}</h1>
            <p className="text-slate-400 mt-4 text-base leading-relaxed whitespace-pre-line">{hero_subtitle}</p>
            <div className="flex items-center gap-3 mt-7">
              <Link to="/register" className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors">
                Get Started Free
              </Link>
              <a href="#demo" className="flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-sm transition-colors">
                ▶ Watch Demo
              </a>
            </div>
            <div className="flex items-center gap-6 mt-6 text-slate-500 text-xs">
              <span>✓ No credit card required</span>
              <span>✓ Free setup</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-gray-50 hidden md:flex items-center justify-center px-10 lg:px-16 py-14">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">SmartTask Dashboard</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[['Total Staff', '256'], ['Tasks Done', '1,429'], ['Pending', '87'], ['On Time', '95%']].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-gray-800 text-sm font-bold mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl h-28 flex items-end px-4 pb-3 gap-1.5 border border-primary-100">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div key={i} className="flex-1 bg-primary-500 rounded-t-sm opacity-75" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: 'Install HVAC Unit – Bay 3', status: 'In Progress', color: 'bg-blue-100 text-blue-700' },
                { label: 'Safety Inspection – Floor 2', status: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
                { label: 'Electrical Wiring – Room 4A', status: 'Done', color: 'bg-green-100 text-green-700' },
              ].map((task) => (
                <div key={task.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-700 truncate mr-2">{task.label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${task.color}`}>{task.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-primary-600 text-xs font-semibold uppercase tracking-widest">Features</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Everything your team needs</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
              One platform built for every role — admins, project managers, and workers alike.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.feature_id ?? f.title} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex gap-4 items-start">
                {f.icon && <span className="text-2xl mt-1">{f.icon}</span>}
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">{f.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo / About */}
      <section id="demo" className="bg-slate-950 py-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">See it in action</span>
            <h2 className="text-3xl font-bold text-white mt-2">{video_title}</h2>
            <p className="text-slate-400 mt-3 text-sm leading-relaxed">{video_subtitle}</p>
          </div>
          <div className="flex-1 bg-slate-800 rounded-2xl aspect-video flex items-center justify-center border border-slate-700">
            {content?.video_url ? (
              <iframe
                src={content.video_url}
                className="w-full h-full rounded-2xl"
                allowFullScreen
                title="Demo video"
              />
            ) : (
              <button className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-primary-600 text-2xl hover:scale-105 transition-transform">
                ▶
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-primary-600 text-xs font-semibold uppercase tracking-widest">Pricing</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-2 text-sm">One plan. Full access. Cancel anytime.</p>
          </div>
          <div className="max-w-2xl mx-auto bg-slate-950 rounded-2xl border border-slate-800 p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-lg">⭐</span>
                <span className="font-bold text-white">{plan_name}</span>
              </div>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-5xl font-bold text-white">{plan_price}</span>
                <span className="text-slate-400 mb-1.5">/month</span>
              </div>
              <p className="text-slate-400 text-sm mt-1">{plan_desc}</p>
            </div>
            <div className="flex-1 space-y-2">
              {['Up to 50 Users', 'Task Management', 'Workforce Scheduling', 'Real-time Monitoring', 'Reports & Analytics', 'Priority Support'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="text-green-400 font-bold">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link to="/register" className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-7 py-3 rounded-lg text-sm transition-colors whitespace-nowrap">
                Get Started Now
              </Link>
              <span className="text-slate-500 text-xs">No commitment. Cancel anytime.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-50 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-primary-600 text-xs font-semibold uppercase tracking-widest">Testimonials</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">What our customers say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.testimonial_id ?? t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-gray-700 text-base leading-relaxed mb-5">"{t.review_text}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-primary-600 text-xs font-semibold uppercase tracking-widest">Get In Touch</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Contact Us</h2>
            <p className="text-gray-500 mt-2 text-sm">Have a question or want to learn more? Send us a message and our team will get back to you.</p>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8">
            {formStatus === 'success' && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-sm font-medium">
                Your message has been sent! Our team will get back to you shortly.
              </div>
            )}
            {formStatus === 'error' && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-medium">
                Something went wrong. Please try again or email us directly.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@company.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
                <input type="text" name="subject" value={form.subject} onChange={handleChange} required placeholder="e.g. Enterprise pricing enquiry"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Tell us how we can help..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-medium py-3 rounded-lg text-sm transition-colors">
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-slate-500">
          <span className="text-primary-400 font-bold">SmartTask</span>
          <span>© 2026 SmartTask. FYP-26-S2-42P.</span>
        </div>
      </footer>
    </div>
  );
}
