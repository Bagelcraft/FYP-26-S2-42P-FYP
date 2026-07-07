/**
 * System Test runner — Permanent Worker cases TCWK001–TCWK016.
 *
 * Black-box tests over the live API. Preconditions (assigned task, update-request)
 * are seeded via Prisma; worker actions go through the API. Self-cleaning/repeatable.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-permworker.js   |   npm run test:permworker
 */

const prisma = require('../src/config/prisma');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const WK = { email: 'perm@acme.test', password: 'Passw0rd!' };

const AVAIL_A = { start: '2026-10-05T09:00:00', end: '2026-10-05T17:00:00' };
const OVERLAP_B = { start: '2026-10-05T10:00:00', end: '2026-10-05T12:00:00' };
const LEAVE = { start: '2026-11-02', end: '2026-11-03' };

// ── terminal helpers ──────────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR;
const c = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const green = (s) => c('32', s), red = (s) => c('31', s), dim = (s) => c('90', s), bold = (s) => c('1', s);
const results = [];
function line(l, v) { console.log('   ' + dim(String(l).padEnd(12)) + v); }
function verdict(id, ok, note) { console.log('   ' + (ok ? green('  PASS  ') : red('  FAIL  ')) + '  ' + note + '\n'); results.push({ id, ok }); }

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function login(cr) { return (await call('POST', '/auth/login', { body: cr })).json; }

async function cleanup() {
  try {
    const tasks = await prisma.task.findMany({ where: { title: { startsWith: 'STA-TEST' } }, select: { task_id: true } });
    const tids = tasks.map((t) => t.task_id);
    if (tids.length) {
      await prisma.taskUpdateRequest.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.allocationHistory.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.taskAssignment.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.taskSkill.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.task.deleteMany({ where: { task_id: { in: tids } } });
    }
    const perm = await prisma.user.findUnique({ where: { email: WK.email }, select: { userId: true } });
    if (perm) {
      const id = perm.userId;
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      await prisma.availability.deleteMany({ where: { user_id: id, start_datetime: { gte: new Date('2026-10-01'), lt: new Date('2026-11-01') } } });
      await prisma.leaveRequest.deleteMany({ where: { user_id: id, start_date: { gte: new Date('2026-11-01'), lt: new Date('2026-12-01') } } });
      await prisma.profileChangeRequest.deleteMany({ where: { user_id: id, field: 'Phone' } });
      await prisma.attendance.deleteMany({ where: { user_id: id, clock_in: { gte: todayStart } } });
    }
  } catch {}
}

async function main() {
  console.log('\n' + bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  Permanent Worker (TCWK001–016)'));
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + WK.email + '  (Appendix A, tenant: Acme)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================') + '\n');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable — run: cd server && npm run dev')); process.exit(1); }

  await cleanup();
  const auth = await login(WK);
  const token = auth && auth.token;
  if (!token) { console.log(red('ERROR: cannot log in as PERMANENT_WORKER — run: npm run seed:test')); process.exit(1); }
  const ACME = auth.user.organisationId;
  const permId = auth.user.userId;

  // ── setup: an ASSIGNED task for the worker + a pending update-request ────
  const pm = await prisma.user.findUnique({ where: { email: 'pm@acme.test' }, select: { userId: true } });
  const task = await prisma.task.create({ data: { organisation_id: ACME, created_by: pm.userId, title: 'STA-TEST Worker Task', start_datetime: new Date('2026-10-06T09:00:00'), end_datetime: new Date('2026-10-06T11:00:00'), status: 'ASSIGNED' } });
  await prisma.taskAssignment.create({ data: { task_id: task.task_id, assigned_to: permId, assigned_by: pm.userId, assignment_type: 'MANUAL' } });
  const ur = await prisma.taskUpdateRequest.create({ data: { task_id: task.task_id, requested_by: pm.userId, message: 'Please confirm progress', status: 'PENDING' } });

  // ── TCWK001 — login ─────────────────────────────────────────────────────
  console.log(bold('TCWK001  Login – Permanent Worker'));
  line('login', 'user_type=' + auth.user.user_type + ', organisationId=' + ACME);
  verdict('TCWK001', auth.user.user_type === 'PERMANENT_WORKER' && !!ACME, 'Logged in as PERMANENT_WORKER; scoped to own org');

  // ── TCWK002 — set availability ──────────────────────────────────────────
  console.log(bold('TCWK002  Set availability'));
  const a2 = await call('POST', '/worker/availability', { token, body: { start_datetime: AVAIL_A.start, end_datetime: AVAIL_A.end, status: 'AVAILABLE' } });
  const slotA = a2.json.data && a2.json.data.availability_id;
  const back = await call('GET', '/worker/availability', { token });
  const persisted = (back.json.data || []).some((s) => s.availability_id === slotA);
  line('POST', '/worker/availability -> HTTP ' + a2.status + ' (id=' + slotA + ')');
  line('reload', 'GET /worker/availability contains slot=' + persisted);
  verdict('TCWK002', a2.status === 201 && persisted, 'Availability slot created (201) and persists on reload');

  // ── TCWK003 — delete availability ───────────────────────────────────────
  console.log(bold('TCWK003  Delete availability'));
  const del = await call('DELETE', `/worker/availability/${slotA}`, { token });
  const after = await call('GET', '/worker/availability', { token });
  const gone = !(after.json.data || []).some((s) => s.availability_id === slotA);
  line('DELETE', `/worker/availability/${slotA} -> HTTP ${del.status}`);
  line('removed', String(gone));
  verdict('TCWK003', del.status === 200 && gone, 'Availability slot removed');

  // ── TCWK004 — overlap rejected (edge) ───────────────────────────────────
  console.log(bold('TCWK004  Availability overlap rejected (edge)'));
  const baseSlot = await call('POST', '/worker/availability', { token, body: { start_datetime: AVAIL_A.start, end_datetime: AVAIL_A.end, status: 'AVAILABLE' } });
  const overlap = await call('POST', '/worker/availability', { token, body: { start_datetime: OVERLAP_B.start, end_datetime: OVERLAP_B.end, status: 'AVAILABLE' } });
  line('base', '09:00–17:00 created (HTTP ' + baseSlot.status + ')');
  line('overlap', '10:00–12:00 over existing -> HTTP ' + overlap.status + dim('  (expected: rejected)'));
  verdict('TCWK004', overlap.status !== 201, red('Overlap NOT rejected — slot created (HTTP ' + overlap.status + '). createAvailability only checks start<end; no overlap detection.'));

  // ── TCWK005 — view my skills (read-only) ────────────────────────────────
  console.log(bold('TCWK005  View my skills (read-only)'));
  const sk = await call('GET', '/worker/skills', { token });
  line('GET', '/worker/skills -> HTTP ' + sk.status);
  line('body', JSON.stringify(sk.json));
  const returnsSkills = Array.isArray(sk.json && sk.json.data);
  verdict('TCWK005', returnsSkills, red('FAIL — GET /worker/skills is a stub ("to be implemented"); assigned skills are NOT returned. (No worker add/remove route — read-only is correct.)'));

  // ── TCWK006 — view assigned tasks ───────────────────────────────────────
  console.log(bold('TCWK006  View assigned tasks'));
  const mine = await call('GET', '/worker/tasks', { token });
  const hasTask = (mine.json.data || []).some((t) => t.task_id === task.task_id);
  line('GET', '/worker/tasks -> HTTP ' + mine.status + ', tasks=' + ((mine.json.data || []).length));
  line('own task', 'assigned task present=' + hasTask);
  verdict('TCWK006', mine.status === 200 && hasTask, "Only the worker's assigned tasks are listed");

  // ── TCWK007 — acknowledge task ──────────────────────────────────────────
  console.log(bold('TCWK007  Acknowledge assigned task'));
  const ack = await call('PATCH', `/worker/tasks/${task.task_id}/acknowledge`, { token });
  line('PATCH', `/worker/tasks/${task.task_id}/acknowledge -> HTTP ${ack.status}`);
  line('status', (ack.json.data && ack.json.data.status) + dim('  (ASSIGNED -> IN_PROGRESS = acknowledged)'));
  verdict('TCWK007', ack.status === 200 && ack.json.data.status === 'IN_PROGRESS', 'Task acknowledged (status -> IN_PROGRESS; there is no decline action)');

  // ── TCWK008 — update task progress ──────────────────────────────────────
  console.log(bold('TCWK008  Update task progress'));
  const prog = await call('PATCH', `/worker/tasks/${task.task_id}/progress`, { token, body: { status: 'COMPLETED' } });
  line('PATCH', `/worker/tasks/${task.task_id}/progress {status: COMPLETED} -> HTTP ${prog.status}`);
  line('status', (prog.json.data && prog.json.data.status));
  verdict('TCWK008', prog.status === 200 && prog.json.data.status === 'COMPLETED', 'Progress update persists (NOTE: progress is a status enum IN_PROGRESS/COMPLETED, not a %)');

  // ── TCWK009 — respond to task update request ────────────────────────────
  console.log(bold('TCWK009  Respond to task update request'));
  const resp = await call('PATCH', `/worker/tasks/${task.task_id}/update-requests/${ur.request_id}/respond`, { token, body: { response: 'On track, 50% done' } });
  line('PATCH', `.../update-requests/${ur.request_id}/respond -> HTTP ${resp.status}`);
  line('status', (resp.json.data && resp.json.data.status) + ', response="' + (resp.json.data && resp.json.data.response) + '"');
  verdict('TCWK009', resp.status === 200 && resp.json.data.status === 'RESPONDED', 'Response recorded against the task (status -> RESPONDED)');

  // ── TCWK010 — clock in ──────────────────────────────────────────────────
  console.log(bold('TCWK010  Clock in'));
  const ci = await call('POST', '/worker/attendance/clock-in', { token });
  line('POST', '/worker/attendance/clock-in -> HTTP ' + ci.status);
  line('clock_in', (ci.json.data && ci.json.data.clock_in));
  verdict('TCWK010', ci.status === 201 && !!(ci.json.data && ci.json.data.clock_in), 'Clock-in recorded with timestamp');

  // ── TCWK011 — clock out ─────────────────────────────────────────────────
  console.log(bold('TCWK011  Clock out'));
  const co = await call('PUT', '/worker/attendance/clock-out', { token });
  line('PUT', '/worker/attendance/clock-out -> HTTP ' + co.status);
  line('duration', 'working_hours=' + (co.json.data && co.json.data.working_hours));
  verdict('TCWK011', co.status === 200 && co.json.data && co.json.data.clock_out != null, 'Clock-out recorded; session duration computed');

  // ── TCWK012 — clock-out without clock-in (edge) ─────────────────────────
  console.log(bold('TCWK012  Clock-out without clock-in rejected (edge)'));
  const co2 = await call('PUT', '/worker/attendance/clock-out', { token });
  line('PUT', '/worker/attendance/clock-out (no open session) -> HTTP ' + co2.status);
  line('message', JSON.stringify(co2.json && co2.json.message));
  verdict('TCWK012', co2.status === 400, 'Clock-out with no open session rejected (HTTP 400 "You are not currently clocked in")');

  // ── TCWK013 — apply for leave ───────────────────────────────────────────
  console.log(bold('TCWK013  Apply for leave (permanent only)'));
  const lv = await call('POST', '/worker/leave', { token, body: { leave_type: 'ANNUAL', start_date: LEAVE.start, end_date: LEAVE.end, reason: 'STA-TEST' } });
  const leaveId = lv.json.data && lv.json.data.leave_id;
  line('POST', '/worker/leave {2 days} -> HTTP ' + lv.status + ' (leave_id=' + leaveId + ')');
  line('status', (lv.json.data && lv.json.data.status) + dim('  (expect PENDING)'));
  verdict('TCWK013', lv.status === 201 && lv.json.data.status === 'PENDING', 'Leave request created (Pending) for PM approval');

  // ── TCWK014 — cancel leave ──────────────────────────────────────────────
  console.log(bold('TCWK014  Cancel leave request'));
  const cancel = await call('DELETE', `/worker/leave/${leaveId}`, { token });
  const lvAfter = await call('GET', '/worker/leave', { token });
  const cancelled = !(lvAfter.json.data || []).some((l) => l.leave_id === leaveId);
  line('DELETE', `/worker/leave/${leaveId} -> HTTP ${cancel.status}`);
  line('removed', String(cancelled));
  verdict('TCWK014', cancel.status === 204 && cancelled, 'Pending leave request cancelled');

  // ── TCWK015 — submit profile change request ─────────────────────────────
  console.log(bold('TCWK015  Submit profile change request'));
  const pcr = await call('POST', '/worker/profile/change-request', { token, body: { field: 'Phone', requested_value: '+65 9000 0000', reason: 'new number' } });
  line('POST', '/worker/profile/change-request {Phone} -> HTTP ' + pcr.status);
  line('status', (pcr.json.data && pcr.json.data.status) + dim('  (expect PENDING)'));
  verdict('TCWK015', pcr.status === 201 && pcr.json.data.status === 'PENDING', 'Profile change request created (Pending) for Org Admin approval');

  // ── TCWK016 — RBAC: no PM/admin access ──────────────────────────────────
  console.log(bold('TCWK016  RBAC – no PM/admin access'));
  const rbac = await call('POST', '/pm/tasks', { token, body: {} });
  line('POST', '/pm/tasks (as worker) -> HTTP ' + rbac.status + dim('  (expect 403)'));
  line('message', JSON.stringify(rbac.json && rbac.json.message));
  verdict('TCWK016', rbac.status === 403 && /insufficient permissions/i.test((rbac.json && rbac.json.message) || ''), 'Worker denied PM route (HTTP 403 "Access denied: insufficient permissions")');

  await cleanup();

  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCWK', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')) +
    dim('   (004 no-overlap-check & 005 skills-stub fail by design)'));
  console.log(bold('----------------------------------------------------------------') + '\n');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
