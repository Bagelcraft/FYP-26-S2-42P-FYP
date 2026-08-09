// Core operational features (top of sidebar)
//
// `orgTypes` restricts an item to one kind of organisation — DashboardLayout
// filters on it. Projects only make sense for project-based companies; the rest
// of the portal serves both.
export const PM_NAV = [
  { path: '/pm', icon: '🏠', label: 'Dashboard' },
  { path: '/pm/projects', icon: '🗂️', label: 'Projects', orgTypes: ['PROJECT'] },
  { path: '/pm/tasks', icon: '📋', label: 'Tasks' },
  { path: '/pm/team', icon: '👥', label: 'Team' },
  { path: '/pm/allocate', icon: '🤖', label: 'Allocate' },
  { path: '/pm/calendar', icon: '📅', label: 'Calendar' },
  { path: '/pm/leave', icon: '🌴', label: 'Leave' },
  { path: '/pm/reports', icon: '📊', label: 'Reports' },
];

// Account / peripheral — rendered as a subordinate "Account" group at the
// bottom of the sidebar (see DashboardLayout `secondaryNav` prop).
// NOTE: Subscription removed — it does not belong under the Manager portal.
export const PM_SECONDARY = [
  { path: '/pm/testimonials', icon: '⭐', label: 'Testimonials' },
];
