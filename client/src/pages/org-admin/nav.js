// `orgTypes` restricts an item to one kind of organisation — DashboardLayout
// filters on it. Shift templates, rostering and shift-change requests only
// exist for shift-based companies; a project-based company schedules by task.
export const ORG_ADMIN_NAV = [
  { path: '/org-admin', icon: '🏠', label: 'Dashboard' },
  { path: '/org-admin/profile', icon: '🏢', label: 'Organisation Profile' },
  { path: '/org-admin/staff', icon: '👥', label: 'Employee Management' },
  { path: '/org-admin/departments', icon: '📂', label: 'Department Management' },
  { path: '/org-admin/skills', icon: '🎯', label: 'Skills Management' },
  { path: '/org-admin/roles', icon: '🏷️', label: 'Role Management' },
  { path: '/org-admin/shifts', icon: '🕐', label: 'Shift Templates', orgTypes: ['NON_PROJECT'] },
  { path: '/org-admin/subscription', icon: '💳', label: 'Subscription' },
  { path: '/org-admin/profile-change-requests', icon: '📝', label: 'Profile Requests' },
  { path: '/org-admin/shift-change-requests', icon: '🔄', label: 'Shift Requests', orgTypes: ['NON_PROJECT'] },
  { path: '/org-admin/audit-logs', icon: '📋', label: 'Audit Logs' },
];
