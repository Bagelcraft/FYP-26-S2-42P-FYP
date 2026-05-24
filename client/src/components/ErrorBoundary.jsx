import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6">{this.state.message}</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Clear cache and go to login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}