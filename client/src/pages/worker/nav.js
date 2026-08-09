// Schedule is the shift-change panel, which only exists where there is a
// roster to change — see the `orgTypes` filter in DashboardLayout.
export const WORKER_NAV = [
  { path: '/worker', icon: '🏠', label: 'My Day' },
  { path: '/worker/tasks', icon: '📋', label: 'My Tasks' },
  { path: '/worker/schedule', icon: '📅', label: 'Schedule', orgTypes: ['NON_PROJECT'] },
  { path: '/worker/calendar', icon: '🗓️', label: 'Calendar' },
  { path: '/worker/attendance', icon: '🕐', label: 'Time Sheet' },
  { path: '/worker/leave', icon: '🌴', label: 'Leave' },
  { path: '/worker/profile', icon: '👤', label: 'Profile' },
];
