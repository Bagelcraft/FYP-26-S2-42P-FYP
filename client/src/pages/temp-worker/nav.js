// Calendar carries the roster for a temporary worker too — the month grid, plus
// an agenda of rostered shifts in a shift-based organisation. It stays unfiltered
// because task deadlines and unavailability exist under either model; the page
// itself drops the shift half for a project-based company.
//
// There is no shift-change entry: a swap is negotiated against a roster the
// employee is committed to, and a temporary worker is engaged per task instead.
export const TEMP_NAV = [
  { path: '/temp-worker', icon: '🏠', label: 'My Day' },
  { path: '/temp-worker/tasks', icon: '📋', label: 'My Tasks' },
  { path: '/temp-worker/calendar', icon: '🗓️', label: 'Calendar' },
  // No orgTypes filter: a freelancer is paid per task under either model, so the
  // timesheet applies to shift-based and project-based organisations alike.
  { path: '/temp-worker/timesheet', icon: '🕐', label: 'Time Sheet' },
  { path: '/temp-worker/profile', icon: '👤', label: 'Profile' },
];
