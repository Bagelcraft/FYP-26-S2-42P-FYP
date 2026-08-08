import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

// Landing page for the link mailed by the server at registration. Hitting it is
// what proves the applicant owns the address — until then login is refused.
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [state, setState] = useState('verifying'); // verifying | done | expired | error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendState, setResendState] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This link is missing its verification token.');
      return;
    }

    let alive = true;
    api.post('/public/verify-email', { token })
      .then((r) => {
        if (!alive) return;
        setState('done');
        setMessage(r.data.message);
      })
      .catch((err) => {
        if (!alive) return;
        setState(err.response?.data?.expired ? 'expired' : 'error');
        setMessage(err.response?.data?.message ?? 'We could not verify this link.');
      });
    return () => { alive = false; };
  }, [token]);

  const resend = async (e) => {
    e.preventDefault();
    setResendState('sending');
    try {
      const r = await api.post('/public/resend-verification', { email });
      setResendState('sent');
      setMessage(r.data.message);
    } catch {
      setResendState('error');
    }
  };

  const ICONS = {
    verifying: { bg: 'bg-gray-100',  fg: 'text-gray-400',  path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    done:      { bg: 'bg-green-100', fg: 'text-green-600', path: 'M5 13l4 4L19 7' },
    expired:   { bg: 'bg-yellow-100', fg: 'text-yellow-600', path: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
    error:     { bg: 'bg-red-100',   fg: 'text-red-600',   path: 'M6 18L18 6M6 6l12 12' },
  };
  const icon = ICONS[state];

  const TITLES = {
    verifying: 'Verifying your email…',
    done:      'Email verified',
    expired:   'This link has expired',
    error:     'Verification failed',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-6">
          <Link to="/" className="text-primary-600 font-bold text-2xl">SmartTask</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className={`w-12 h-12 ${icon.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-6 h-6 ${icon.fg}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">{TITLES[state]}</h2>
          {message && <p className="text-sm text-gray-500 mb-6">{message}</p>}

          {(state === 'expired' || state === 'error') && resendState !== 'sent' && (
            <form onSubmit={resend} className="space-y-3 mb-6 text-left">
              <label className="block text-sm font-medium text-gray-700">
                Enter your registered email to get a fresh link
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={resendState === 'sending'}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {resendState === 'sending' ? 'Sending…' : 'Send a new link'}
              </button>
              {resendState === 'error' && (
                <p className="text-sm text-red-600">Could not resend right now. Please try again shortly.</p>
              )}
            </form>
          )}

          <Link
            to="/login"
            className="block w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
