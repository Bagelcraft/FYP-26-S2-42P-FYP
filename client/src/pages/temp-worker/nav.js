// Schedule is the shift-change panel — a project-based company runs no roster,
// so a temporary worker there has no shifts to see or swap. They stay dormant
// until a task activates them, which shows up under My Tasks.
export const TEMP_NAV = [
  { path: '/temp-worker', icon: '🏠', label: 'My Day' },
  { path: '/temp-worker/tasks', icon: '📋', label: 'My Tasks' },
  { path: '/temp-worker/schedule', icon: '📅', label: 'Schedule', orgTypes: ['NON_PROJECT'] },
  { path: '/temp-worker/profile', icon: '👤', label: 'Profile' },
];
