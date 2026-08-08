import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Mirrors the server-side check in server/src/utils/uen.js — the same three ACRA
// formats, checked here purely so the user gets instant feedback.
const UEN_PATTERNS = [
  /^\d{8}[A-Z]$/,             // 12345678A   — ACRA-registered business
  /^(19|20)\d{2}\d{5}[A-Z]$/, // 201512345A  — local company
  /^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$/, // T09LL0001B — other entities
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    company_name: '',
    uen: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendState, setResendState] = useState('');

  const handleChange = (e) => {
    const value = e.target.name === 'uen' ? e.target.value.toUpperCase() : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    const uen = form.uen.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!UEN_PATTERNS.some((re) => re.test(uen))) {
      return setError('That is not a valid UEN. Expected formats: 12345678A, 201512345A, or T09LL0001B.');
    }

    setLoading(true);
    try {
      await api.post('/public/organisations/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        uen,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendState('sending');
    try {
      await api.post('/public/resend-verification', { email: form.email });
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-2">
              We&apos;ve sent a verification link to <span className="font-medium text-gray-700">{form.email}</span>.
              Click it to confirm your address — the link expires in 24 hours.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Once verified, our team reviews your UEN and activates your account. You won&apos;t be able
              to sign in until your email is verified.
            </p>

            {resendState === 'sent' ? (
              <p className="text-sm text-green-600 mb-4">Verification email resent.</p>
            ) : (
              <button
                onClick={resendVerification}
                disabled={resendState === 'sending'}
                className="text-sm text-primary-600 hover:underline mb-4 disabled:opacity-60"
              >
                {resendState === 'sending' ? 'Sending…' : "Didn't get it? Resend the link"}
              </button>
            )}
            {resendState === 'error' && (
              <p className="text-sm text-red-600 mb-4">Could not resend right now. Please try again shortly.</p>
            )}

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="text-center mb-8">
          <span className="text-primary-600 font-bold text-2xl">SmartTask</span>
          <p className="text-gray-500 text-sm mt-1"></p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={form.full_name}
                onChange={handleChange}
                placeholder="Alson Chew"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="alsonchew@yourcompany.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                We&apos;ll email a verification link here. Disposable addresses aren&apos;t accepted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input
                type="text"
                name="company_name"
                required
                value={form.company_name}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">UEN</label>
              <input
                type="text"
                name="uen"
                required
                value={form.uen}
                onChange={handleChange}
                placeholder="201512345A"
                maxLength={10}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Your Unique Entity Number, used to verify your organisation. Formats: 12345678A, 201512345A, or T09LL0001B.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                required
                value={form.confirm_password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Submitting…' : 'Register'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
