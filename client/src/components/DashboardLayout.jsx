import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { markSeen, reconcile, unseenCount } from '../utils/navBadges';

// How often to re-check for new activity while the user sits on a page.
const POLL_MS = 60000;

// A nav item may carry `orgTypes: ['PROJECT']` (or ['NON_PROJECT']) to restrict
// it to one kind of organisation — Projects only exist for project-based
// companies, shift rostering only for shift-based ones. Items without the field
// are shown to everyone. An unknown org type (a session predating the field)
// falls back to showing everything; the API still enforces the real boundary.
const visibleFor = (items, orgType) =>
  items.filter((i) => !i.orgTypes || !orgType || i.orgTypes.includes(orgType));

// `secondaryNav` (optional) renders a subordinate "Account" group at the
// bottom of the sidebar — used by the PM portal for Subscription / Testimonials
// so they sit below the core operational features.
export default function DashboardLayout({ children, navItems, secondaryNav = [], roleLabel, topbarRight }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const orgType = user?.org_type ?? null;
  const primaryItems = visibleFor(navItems, orgType);
  const secondaryItems = visibleFor(secondaryNav, orgType);

  // counts = live per-tab totals from the server; seen = what this user has
  // already looked at. A dot appears only where counts has grown past seen.
  const [counts, setCounts] = useState({});
  const [seen, setSeen] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allItems = [...primaryItems, ...secondaryItems];
  const currentPage = allItems.reduce((best, item) => {
    const matches = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    if (!matches) return best;
    return !best || item.path.length > best.path.length ? item : best;
  }, null);

  const currentPath = currentPage?.path;

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/activity/badges');
      const next = r.data.data ?? {};
      setCounts(next);
      // Viewing a tab counts as reading it, so the dot never lingers on the page
      // the user is already looking at.
      const base = reconcile(user?.userId, next);
      setSeen(currentPath !== undefined && next[currentPath] !== undefined
        ? markSeen(user?.userId, currentPath, next[currentPath])
        : base);
    } catch {
      setCounts({}); // badges are decoration — never surface an error for them
    }
  }, [user?.userId, currentPath]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const renderLink = (item, { secondary } = {}) => {
    const isActive = item === currentPage;
    const unread = unseenCount(counts, seen, item.path);
    const base = 'flex items-center gap-3 rounded-lg font-medium transition-colors';
    const cls = secondary
      ? `${base} px-3 py-2 text-[13px] ${isActive ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-300'}`
      : `${base} px-3 py-2.5 text-sm ${isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={cls}
        // Clear immediately on click rather than waiting for the next poll.
        onClick={() => setSeen(markSeen(user?.userId, item.path, counts[item.path] ?? 0))}
      >
        <span className={`relative w-5 text-center ${secondary ? 'text-sm opacity-80' : ''}`}>
          {item.icon}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-gray-900" />
          )}
        </span>
        <span className="flex-1">{item.label}</span>
        {unread > 0 && (
          <span
            title={`${unread} new`}
            className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-700">
          <span className="text-white font-bold text-base">SmartTask</span>
          <span className="block text-gray-400 text-xs mt-0.5">{roleLabel}</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {primaryItems.map((item) => renderLink(item))}

          {secondaryItems.length > 0 && (
            <div className="pt-4 mt-3 border-t border-gray-700/60">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Account</p>
              {secondaryItems.map((item) => renderLink(item, { secondary: true }))}
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.full_name?.[0] ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name ?? 'User'}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-gray-800 font-semibold">{currentPage?.label ?? 'Dashboard'}</h1>
          <div className="flex items-center gap-4">
            {topbarRight}
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] ?? 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
