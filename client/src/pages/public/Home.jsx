import { Link } from 'react-router-dom';

const features = [
  { icon: '📋', title: 'Task Management', desc: 'Create, assign, and track tasks across your entire organisation in real time.' },
  { icon: '🤖', title: 'Auto Allocation', desc: 'Automatically assign tasks to the best available staff based on skills and schedule.' },
  { icon: '📅', title: 'Workforce Scheduling', desc: 'Manage availability, shifts, and leave in one unified calendar.' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Monitor working hours, task completion rates, and team performance.' },
  { icon: '🔔', title: 'Real-time Notifications', desc: 'Keep your team informed with instant in-app notifications for every update.' },
];

const testimonials = [
  {
    name: 'Sarah Lim',
    company: 'BuildTech Pte Ltd',
    rating: 5,
    text: 'SmartTask transformed how we manage our 80-person team. Auto-allocation alone saves us 3 hours every day.',
  },
  {
    name: 'James Tan',
    company: 'LogiCore Solutions',
    rating: 5,
    text: 'The role-based dashboards are intuitive. Our project managers and workers both love using it.',
  },
  {
    name: 'Priya Nair',
    company: 'NovaSoft Asia',
    rating: 4,
    text: 'Onboarding was seamless. We were fully set up in under an hour with all our staff registered.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-primary-600 font-bold text-lg">SmartTask</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#demo" className="hover:text-gray-900 transition-colors">About Us</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Login</Link>
          </div>
          <Link
            to="/register"
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Smart Workforce &<br />Task Allocation
          </h1>
          <p className="text-gray-500 mt-4 text-lg">
            Manage your workforce. Assign tasks.<br />Track progress in real time.
          </p>
          <div className="flex items-center gap-3 mt-8">
            <Link
              to="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <a
              href="#demo"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              ▶ Watch Demo
            </a>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Dashboard</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[['Total Staff', '256'], ['Tasks Done', '1,429'], ['Pending', '87'], ['On Time', '95%']].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-gray-800 text-sm font-bold">{val}</p>
                </div>
              ))}
            </div>
            <div className="h-24 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg flex items-end px-3 pb-2 gap-1">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div key={i} className="flex-1 bg-primary-400 rounded-sm opacity-70" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-primary-600 text-sm font-semibold uppercase tracking-wide">Features</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Everything your team needs</h2>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="font-semibold text-gray-800 mt-3 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="text-primary-600 text-sm font-semibold uppercase tracking-wide">See it in action</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">See how our platform works!</h2>
            <p className="text-gray-500 mt-4">
              Watch how SmartTask helps organisations manage staff, automate task allocation, and track real-time progress — all from one unified platform.
            </p>
          </div>
          <div className="flex-1 bg-gray-100 rounded-2xl aspect-video flex items-center justify-center border border-gray-200">
            <button className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-primary-600 text-2xl hover:scale-105 transition-transform">
              ▶
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-primary-600 text-sm font-semibold uppercase tracking-wide">Subscription Plan</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-2">One plan. Full access. Cancel anytime.</p>
          </div>
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400 text-xl">⭐</span>
                <span className="font-bold text-gray-800">Standard Plan</span>
              </div>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-4xl font-bold text-gray-900">$9</span>
                <span className="text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">Perfect for small teams and growing organisations.</p>
            </div>
            <div className="flex-1 space-y-2">
              {['Up to 50 Users', 'Task Management', 'Workforce Scheduling', 'Real-time Monitoring', 'Reports & Analytics', 'Priority Support'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                Get Started Now
              </Link>
              <span className="text-gray-400 text-xs">Cancel anytime. No commitment.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-primary-600 text-sm font-semibold uppercase tracking-wide">Testimonials</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">What our customers say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.company}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span>© 2026 SmartTask. FYP-26-S2-42P.</span>
          <Link to="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}