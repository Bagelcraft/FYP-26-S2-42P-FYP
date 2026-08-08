// The features advertised on the marketing page mirror what the product actually
// ships — each entry below maps to a real portal page. Seeded on first read of the
// landing content so a fresh install never shows an empty Features section.
//
//   Auto-allocation      → /pm/allocate
//   Task management      → /pm/tasks, /worker/tasks
//   Shift scheduling     → /org-admin/shifts, /worker/schedule
//   Shift change requests→ /org-admin/shift-change-requests
//   Leave management     → /pm/leave, /worker/leave
//   Attendance           → /worker/attendance
//   Skills & roles       → /org-admin/skills, /org-admin/roles
//   Reports              → /pm/reports
//   Role-based portals   → the five dashboards
const DEFAULT_LANDING_FEATURES = [
  {
    icon: '🤖',
    title: 'Automated Task Allocation',
    description: 'Match every task to the right person automatically, based on required skills, current availability, and workload — no more manual rostering.',
    sort_order: 1,
  },
  {
    icon: '📋',
    title: 'Task Management',
    description: 'Create tasks, set start and end times, attach required skills, and follow each one from Pending through to Completed in real time.',
    sort_order: 2,
  },
  {
    icon: '🕐',
    title: 'Shift Scheduling',
    description: 'Build reusable shift templates and roster staff onto them by date. Everyone sees their own schedule the moment it is published.',
    sort_order: 3,
  },
  {
    icon: '🔄',
    title: 'Shift Change Requests',
    description: 'Staff request a swap, managers approve or reject it in one click, and the roster updates itself — with a full record of who decided what.',
    sort_order: 4,
  },
  {
    icon: '🌴',
    title: 'Leave Management',
    description: 'Annual, medical, and unpaid leave with balances that prorate automatically for staff who join mid financial year, plus a manager approval flow.',
    sort_order: 5,
  },
  {
    icon: '⏱️',
    title: 'Attendance & Time Sheets',
    description: 'Clock in and out from any device. Working hours are totalled for you and feed straight into reporting.',
    sort_order: 6,
  },
  {
    icon: '🎯',
    title: 'Skills & Role Management',
    description: 'Maintain a skills register with certification tracking, define the skills each role requires, and have them applied to new staff on day one.',
    sort_order: 7,
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    description: 'Track completion rates, workload distribution, and attendance across your team, and export the results when you need them.',
    sort_order: 8,
  },
  {
    icon: '🔐',
    title: 'Role-Based Portals',
    description: 'Separate, purpose-built views for organisation admins, project managers, permanent staff, and temporary staff — each seeing only what they should.',
    sort_order: 9,
  },
];

module.exports = { DEFAULT_LANDING_FEATURES };
