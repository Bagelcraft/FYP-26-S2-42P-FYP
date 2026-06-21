// Core operational features (top of sidebar)
export const PM_NAV = [
  { path: '/pm', icon: '🏠', label: 'Dashboard' },
  { path: '/pm/tasks', icon: '📋', label: 'Tasks' },
  { path: '/pm/team', icon: '👥', label: 'Team' },
  { path: '/pm/allocate', icon: '🤖', label: 'Allocate' },
  { path: '/pm/leave', icon: '🌴', label: 'Leave' },
  { path: '/pm/reports', icon: '📊', label: 'Reports' },
  { path: '/pm/notifications', icon: '🔔', label: 'Notifications' },
];

// Account / peripheral — rendered as a subordinate "Account" group at the
// bottom of the sidebar (see DashboardLayout `secondaryNav` prop).
export const PM_SECONDARY = [
  { path: '/pm/testimonials', icon: '⭐', label: 'Testimonials' },
];
