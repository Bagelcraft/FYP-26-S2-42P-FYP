// The features advertised on the marketing page mirror what the product actually
// ships — each entry below maps to a real portal page. Seeded on first read of the
// landing content so a fresh install never shows an empty Features section.
//
//   Two scheduling models → chosen at /register, enforced org-wide
//   Projects & resources  → /pm/projects
//   Temporary activation  → /pm/allocate, /temp-worker/tasks
//   Auto-allocation       → /pm/allocate
//   Task management       → /pm/tasks, /worker/tasks
//   Shift scheduling      → /org-admin/shifts, /worker/schedule
//   Shift change requests → /org-admin/shift-change-requests
//   Leave management      → /pm/leave, /worker/leave
//   Attendance            → /worker/attendance
//   Skills & roles        → /org-admin/skills, /org-admin/roles
//   Reports               → /pm/reports
//   Role-based portals    → the five dashboards
//
// Keep this list and FALLBACK_FEATURES in client/src/pages/public/Home.jsx in
// step — the client copy is what renders when the API cannot be reached.
const DEFAULT_LANDING_FEATURES = [
  {
    icon: '🔀',
    title: 'Two Ways to Schedule',
    description: 'Tell us how you work when you sign up. Project-based companies get projects, resource pools and task-driven allocation; shift-based companies get shift templates and a roster. Every portal adapts to the model you chose.',
    sort_order: 1,
  },
  {
    icon: '🗂️',
    title: 'Projects, Resources & Duration',
    description: 'Group work into projects with a fixed start and end date, then name the pool of people allowed to work on them. Every task is checked against both before it can be scheduled or allocated.',
    sort_order: 2,
  },
  {
    icon: '⚡',
    title: 'On-Demand Temporary Staff',
    description: 'Temporary workers carry no roster at all. They stay dormant until a task activates them — so you only draw on freelance cover for the days you actually need it.',
    sort_order: 3,
  },
  {
    icon: '🤖',
    title: 'Automated Task Allocation',
    description: 'Match every task to the right person by required skills, availability and current workload. Permanent staff are always offered the work first, and the engine falls through to temporary cover only on the days nobody permanent is free.',
    sort_order: 4,
  },
  {
    icon: '📋',
    title: 'Task Management',
    description: 'Create tasks, set start and end times, attach the skills they require, and follow each one from Pending through to Completed — including a submit-and-approve step for freelance work.',
    sort_order: 5,
  },
  {
    icon: '🕐',
    title: 'Shift Scheduling',
    description: 'For shift-based teams: build reusable shift templates and roster staff onto them in bulk across any date range. Everyone sees their own schedule the moment it is published.',
    sort_order: 6,
  },
  {
    icon: '🔄',
    title: 'Shift Change Requests',
    description: 'Staff request a swap, managers approve or reject it in one click, and the roster updates itself — with a full record of who decided what.',
    sort_order: 7,
  },
  {
    icon: '🌴',
    title: 'Leave Management',
    description: 'Annual, medical, and unpaid leave with balances that prorate automatically for staff who join mid financial year. Approved leave takes someone out of the allocation pool for those days without anyone having to remember.',
    sort_order: 8,
  },
  {
    icon: '⏱️',
    title: 'Attendance & Time Sheets',
    description: 'Clock in and out from any device. Working hours are totalled for you and feed straight into reporting and workload limits.',
    sort_order: 9,
  },
  {
    icon: '🎯',
    title: 'Skills & Role Management',
    description: 'Maintain a skills register with certification tracking, define the skills each role requires, and have them applied to new staff on day one.',
    sort_order: 10,
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    description: 'Track completion rates, workload distribution, and attendance across your team, and export the results when you need them.',
    sort_order: 11,
  },
  {
    icon: '🔐',
    title: 'Role-Based Portals',
    description: 'Separate, purpose-built views for organisation admins, project managers, permanent staff, and temporary staff — each seeing only what they should.',
    sort_order: 12,
  },
];

module.exports = { DEFAULT_LANDING_FEATURES };
