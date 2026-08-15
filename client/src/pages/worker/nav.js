// The roster (shift agenda + shift-change requests) lives on the Calendar page
// rather than a tab of its own — in a shift-based organisation that page is
// titled "Schedule & Calendar" and carries both. /worker/schedule redirects
// there, so nothing that linked to the old tab breaks.
export const WORKER_NAV = [
  { path: '/worker', icon: '🏠', label: 'My Day' },
  { path: '/worker/tasks', icon: '📋', label: 'My Tasks' },
  { path: '/worker/calendar', icon: '🗓️', label: 'Calendar' },
  { path: '/worker/attendance', icon: '🕐', label: 'Time Sheet' },
  { path: '/worker/leave', icon: '🌴', label: 'Leave' },
  { path: '/worker/profile', icon: '👤', label: 'Profile' },
];
