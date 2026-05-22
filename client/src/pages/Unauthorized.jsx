import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🚫</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">You don't have permission to view this page.</p>
        <Link
          to="/login"
          className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}