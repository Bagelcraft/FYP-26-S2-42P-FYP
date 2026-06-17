import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Smoothly animates the displayed number from its current value to `end`
// whenever `end` changes — so live updates tick instead of snapping.
function CountUp({ end, duration = 1000, suffix = '' }) {
  const [val, setVal] = useState(0);
  const valRef = useRef(0);
  valRef.current = val;
  useEffect(() => {
    const from = valRef.current;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(from + (end - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return <>{Math.round(val).toLocaleString()}{suffix}</>;
}

// Task statuses cycle in this order, like work progressing in real time.
const TASK_STATUSES = [
  { status: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { status: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { status: 'Done', color: 'bg-green-100 text-green-700' },
];

// Case study carousel: the dashboard cycles through different companies,
// each from a distinct industry, with its own relevant tasks and figures.
const COMPANIES = [
  {
    name: 'BuildTech Pte Ltd',
    sector: 'Facilities & Maintenance',
    staff: 82,
    tasks: [
      'Install HVAC Unit – Bay 3', 'Fire Alarm Test – Block C', 'Lift Maintenance – Tower B',
      'Generator Service – Basement', 'CCTV Install – Main Lobby', 'Pipe Insulation – Riser 2',
      'Water Tank Cleaning – Roof', 'Aircon Servicing – Level 5',
    ],
  },
  {
    name: 'LogiCore Solutions',
    sector: 'Logistics & Warehousing',
    staff: 140,
    tasks: [
      'Inbound Unloading – Dock 4', 'Pallet Restock – Aisle 12', 'Order Picking – Zone B',
      'Forklift Inspection – Bay 2', 'Outbound Dispatch – Gate 7', 'Inventory Count – Rack 9',
      'Cold Storage Check – Unit 3', 'Label Printing – Station 5',
    ],
  },
  {
    name: 'NovaCare Clinic Group',
    sector: 'Healthcare',
    staff: 64,
    tasks: [
      'Ward Round – Level 3', 'Lab Sample Collection', 'Equipment Sterilisation',
      'Patient Discharge – Bed 12', 'Pharmacy Restock', 'Vaccination Clinic – Room 2',
      'X-Ray Scan – Patient 48', 'Bed Turnover – Ward B',
    ],
  },
  {
    name: 'GreenLeaf Hospitality',
    sector: 'Hotels & F&B',
    staff: 96,
    tasks: [
      'Room Turnover – Floor 8', 'Banquet Setup – Hall A', 'Kitchen Deep Clean',
      'Front Desk Check-in', 'Pool Maintenance', 'Laundry Run – Batch 5',
      'Minibar Restock – Wing C', 'Event Breakdown – Ballroom',
    ],
  },
  {
    name: 'BrightSpark Retail',
    sector: 'Retail Chain',
    staff: 120,
    tasks: [
      'Shelf Restock – Aisle 5', 'Cashier Shift – Lane 3', 'Stock Take – Backroom',
      'Window Display Setup', 'Price Tag Update', 'Click & Collect Prep',
      'Floor Cleaning – Entrance', 'Fitting Room Reset',
    ],
  },
];

// Pick a task from `pool` that isn't in `exclude`.
function pickTask(pool, exclude) {
  const avail = pool.filter((t) => !exclude.includes(t));
  return avail[Math.floor(Math.random() * avail.length)] ?? pool[0];
}

// Seed three distinct tasks (with varied statuses) for a company.
function seedTasks(company) {
  const picks = [];
  for (let i = 0; i < 3; i++) picks.push(pickTask(company.tasks, picks));
  return picks.map((label, i) => ({ label, s: [1, 0, 2][i] }));
}

// Seed plausible headline figures for a company.
function seedStats(company) {
  return {
    totalStaff: company.staff,
    tasksDone: 900 + Math.floor(Math.random() * 900),
    pending: 40 + Math.floor(Math.random() * 60),
    onTime: 90 + Math.floor(Math.random() * 9),
  };
}

// A mock dashboard that updates itself on an interval so it looks like
// someone is actively using the product — numbers tick, statuses progress.
function LiveDashboard() {
  const [ci, setCi] = useState(0); // current company index
  const company = COMPANIES[ci];
  const [stats, setStats] = useState(() => seedStats(COMPANIES[0]));
  const [bars, setBars] = useState([40, 65, 45, 80, 55, 70, 90]);
  const [tasks, setTasks] = useState(() => seedTasks(COMPANIES[0]));

  useEffect(() => {
    const co = COMPANIES[ci];
    // Reseed everything when the company changes (new industry, new tasks).
    setStats(seedStats(co));
    setTasks(seedTasks(co));
    setBars(Array.from({ length: 7 }, () => 35 + Math.floor(Math.random() * 60)));

    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      if (tick >= 6) {
        // Switch to the next company; this effect re-runs and reseeds.
        setCi((c) => (c + 1) % COMPANIES.length);
        return;
      }

      // Advance every task one step; completed ones are retired and a
      // fresh relevant task rolls in, so the names keep changing.
      setTasks((prev) => {
        const used = prev.map((t) => t.label);
        return prev.map((t) => {
          if (t.s === 2) {
            const label = pickTask(co.tasks, used);
            used.push(label);
            return { label, s: 0 };
          }
          return { ...t, s: t.s + 1 };
        });
      });

      // Big, visible swings on every figure.
      const rint = (n) => Math.floor(Math.random() * (2 * n + 1)) - n; // [-n, n]
      setStats((p) => ({
        totalStaff: Math.max(20, co.staff + rint(8)),
        tasksDone: p.tasksDone + 4 + Math.floor(Math.random() * 16),
        pending: Math.max(15, p.pending + rint(14)),
        onTime: Math.min(99, Math.max(86, p.onTime + rint(4))),
      }));

      // Stream a new value into the chart (drop oldest, push newest).
      setBars((p) => [...p.slice(1), 35 + Math.floor(Math.random() * 60)]);
    }, 2000);
    return () => clearInterval(id);
  }, [ci]);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span key={company.name} className="flex flex-col" style={{ animation: 'fadeUp 0.5s ease-out both' }}>
          <span className="text-xs font-semibold text-gray-800">{company.name}</span>
          <span className="text-[10px] text-gray-400">{company.sector} · {company.staff} staff</span>
        </span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total Staff', value: stats.totalStaff },
          { label: 'Tasks Done', value: stats.tasksDone },
          { label: 'Pending', value: stats.pending },
          { label: 'On Time', value: stats.onTime, suffix: '%' },
        ].map(({ label, value, suffix }, i) => (
          <div
            key={label}
            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
            style={{ animation: `fadeUp 0.6s ease-out both`, animationDelay: `${i * 0.1}s` }}
          >
            <p className="text-gray-400 text-xs">{label}</p>
            <p className="text-gray-800 text-sm font-bold mt-0.5">
              <CountUp end={value} suffix={suffix} />
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl h-28 flex items-end px-4 pb-3 gap-1.5 border border-primary-100">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-primary-500 rounded-t-sm opacity-75 transition-[height] duration-700 ease-out"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const st = TASK_STATUSES[task.s];
          return (
            <div
              key={task.label}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
            >
              <span className="text-xs text-gray-700 truncate mr-2">{task.label}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap transition-colors duration-300 ${st.color}`}
                style={st.status === 'In Progress' ? { animation: 'badgePulse 1.6s ease-in-out infinite' } : undefined}
              >
                {st.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Served from client/public — swap demo.mp4 for your real marketing video (same filename = no code change)
const DEMO_VIDEO_URL = '/demo.mp4';

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
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 backdrop-blur-md">
        <div className="w-full px-8 h-16 flex items-center justify-between">
          <span className="text-blue-400 font-bold text-lg tracking-tight">SmartTask</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">About Us</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <Link
            to="/login"
            className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero — split dark/light */}
      <section className="flex min-h-[calc(100vh-64px)]">
        {/* Left — dark */}
        <div className="flex-1 bg-slate-950 flex items-center px-10 lg:px-20 py-14">
          <div className="max-w-lg">
            <span className="inline-block text-primary-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Workforce Management Platform
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Smart Task Allocation
            </h1>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Your workforce, intelligently managed. Tasks assigned automatically. <br />
              Progress tracked in real time.

            </p>
            <div className="flex items-center gap-3 mt-7">
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors"
              >
                Get Started Free
              </Link>
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className="flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-sm transition-colors"
              >
                ▶ Watch Demo
              </button>
            </div>
            <div className="flex items-center gap-6 mt-6 text-slate-500 text-xs">
              <span>✓ No credit card required</span>
              <span>✓ Free setup</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Right — light */}
        <div className="flex-1 bg-gray-50 hidden md:flex items-center justify-center px-10 lg:px-16 py-14">
          <LiveDashboard />
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
              <div key={f.title} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex gap-4 items-start">
                <span className="text-2xl mt-1">{f.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">{f.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="bg-slate-950 py-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">See it in action</span>
            <h2 className="text-3xl font-bold text-white mt-2">Meet SmartTask — your all-in-one task management solution</h2>
            <p className="text-slate-400 mt-3 text-sm leading-relaxed">
              How SmartTask helps organisations manage staff, automate task allocation, and track real-time progress — all from one unified platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            aria-label="Open demo video with sound"
            className="group flex-1 relative bg-slate-800 rounded-2xl aspect-video flex items-center justify-center border border-slate-700 overflow-hidden cursor-pointer"
          >
            {/* Auto-plays muted on loop inline; click to open full video with sound */}
            <video
              src={DEMO_VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              Your browser does not support the video tag.
            </video>
          </button>
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
                <span className="font-bold text-white">Standard Plan</span>
              </div>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-5xl font-bold text-white">$9</span>
                <span className="text-slate-400 mb-1.5">/month</span>
              </div>
              <p className="text-slate-400 text-sm mt-1">Perfect for small teams and growing organisations.</p>
            </div>
            <div className="flex-1 space-y-2">
              {['Up to 50 Users', 'Task Management', 'Workforce Scheduling', 'Real-time Monitoring', 'Reports & Analytics', 'Priority Support'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="text-green-400 font-bold">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-7 py-3 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
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
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-gray-700 text-base leading-relaxed mb-5">"{t.text}"</p>
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

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-slate-500">
          <span className="text-primary-400 font-bold">SmartTask</span>
          <span>© 2026 SmartTask. FYP-26-S2-42P.</span>
        </div>
      </footer>

      {/* Video modal */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              aria-label="Close video"
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-3xl leading-none"
            >
              ✕
            </button>
            <video
              src={DEMO_VIDEO_URL}
              controls
              autoPlay
              loop
              className="w-full rounded-xl shadow-2xl bg-black aspect-video"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}