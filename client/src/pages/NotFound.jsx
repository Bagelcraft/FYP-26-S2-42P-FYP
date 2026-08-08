import { Link, useLocation } from 'react-router-dom';

// Catch-all for unmatched paths. Without this, React Router renders an empty
// <Routes> and the user gets a blank white page with no indication of what went
// wrong — which is indistinguishable from the app having crashed.
export default function NotFound() {
  const { pathname, search } = useLocation();

  // A verification/reset link that lost its query string is a common way to land
  // here, so point the user at the recovery path instead of a generic dead end.
  const isAuthLink = pathname.startsWith('/verify-email') || pathname.startsWith('/reset-password');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-6">
          <Link to="/" className="text-primary-600 font-bold text-2xl">SmartTask</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">Page not found</h2>
          <p className="text-sm text-gray-500 mb-1">
            Nothing lives at <span className="font-mono text-gray-700 break-all">{pathname}</span>.
          </p>

          {isAuthLink && !search && (
            <p className="text-sm text-gray-500 mb-4">
              This looks like a verification or reset link that lost its token — some email clients
              trim the end of long links. Try copying the full URL from the email instead of clicking it.
            </p>
          )}

          <div className="flex flex-col gap-2 mt-6">
            <Link to="/" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              Back to home
            </Link>
            <Link to="/login" className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
