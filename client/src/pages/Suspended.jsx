import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shown when an organisation has been suspended by the system admin. Reached
// either from a blocked sign-in, or mid-session when the API starts returning
// 403 ORG_SUSPENDED (see the interceptor in utils/api.js).
export default function Suspended() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-6">
          <Link to="/" className="text-primary-600 font-bold text-2xl">SmartTask</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">Account suspended</h2>
          <p className="text-sm text-gray-500 mb-4">
            {user?.organisation?.name
              ? <>Access for <span className="font-medium text-gray-700">{user.organisation.name}</span> has been suspended.</>
              : <>Your organisation&apos;s account has been suspended.</>}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            While an account is suspended, nobody in the organisation can sign in or use the
            platform. Your data is not deleted — everything is restored the moment the account
            is reactivated. Please contact your system administrator to resolve this.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Need help?</p>
            <p className="text-xs text-gray-500">
              Common reasons include an unpaid subscription or a request from your organisation.
              Your system administrator can reactivate the account from the Organisations page.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSignOut}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Sign out
            </button>
            <Link
              to="/#contact"
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
