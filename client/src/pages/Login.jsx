import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleRedirects = {
    SYSTEM_ADMIN:     '/admin',
    ORG_ADMIN:        '/org-admin',
    PROJECT_MANAGER:  '/pm',
    PERMANENT_WORKER: '/worker',
    TEMPORARY_WORKER: '/temp-worker',
  };

  // Test accounts (Appendix A) — all share the password below. These accounts
  // own the seeded demo/test data; a normally-registered org sees a clean slate.
  const TEST_PASSWORD = 'Passw0rd!';
  const TEST_USERS = [
    { label: 'System Admin',       icon: '🛡️', email: 'sysadmin@sta.test' },
    { label: 'Org Admin · Acme',   icon: '🏢', email: 'admin@acme.test' },
    { label: 'Manager · Acme',     icon: '📋', email: 'pm@acme.test' },
    { label: 'Permanent Employee', icon: '👷', email: 'perm@acme.test' },
    { label: 'Temporary Employee', icon: '🔧', email: 'temp@acme.test' },
    { label: 'Org Admin · Globex', icon: '🏬', email: 'admin@globex.test' },
  ];

  const quickLogin = async (u) => {
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email: u.email, password: TEST_PASSWORD });
      login(data.user, data.token);
      navigate(roleRedirects[data.user.user_type] ?? '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Quick login failed — run "npm run seed:test" to create the test accounts.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      navigate(roleRedirects[data.user.user_type] ?? '/');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-primary-600 font-bold text-2xl">SmartTask</span>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end -mt-2">
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New organisation?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">
              Register here
            </Link>
          </p>
        </div>

        {/* Test-account quick access — shown in local dev, hidden on the live
            site by default. Set VITE_SHOW_TEST_LOGIN=true to re-enable it. */}
        {(import.meta.env.DEV || import.meta.env.VITE_SHOW_TEST_LOGIN === 'true') && (
          <div className="mt-4 rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-4">
            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">
              Test accounts · password {TEST_PASSWORD}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {TEST_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-white border border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-colors text-left"
                >
                  <span className="text-lg">{u.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{u.label}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-yellow-600 font-medium">Enter →</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}