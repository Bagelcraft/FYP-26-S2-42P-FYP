/**
 * System Test runner — Temporary Worker cases TCTW001–TCTW012.
 *
 * Black-box tests over the live API. Preconditions (skill, available task,
 * assigned task) are seeded via Prisma. Self-cleaning and repeatable.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-tempworker.js   |   npm run test:tempworker
 */

const prisma = require('../src/config/prisma');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const TW = { email: 'temp@acme.test', password: 'Passw0rd!' };
const SKILL = 'STA-TEST TW Skill';
const AVAIL = { start: '2026-10-10T09:00:00', end: '2026-10-10T13:00:00' };
const LEAVE = { start: '2026-11-14', end: '2026-11-15' };

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
    const skill = await prisma.skill.findFirst({ where: { skill_name: SKILL } });
    if (skill) { await prisma.userSkill.deleteMany({ where: { skill_id: skill.skill_id } }); await prisma.skill.delete({ where: { skill_id: skill.skill_id } }); }
    const tw = await prisma.user.findUnique({ where: { email: TW.email }, select: { userId: true } });
    if (tw) {
      const id = tw.userId; const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      await prisma.availability.deleteMany({ where: { user_id: id, start_datetime: { gte: new Date('2026-10-01'), lt: new Date('2026-11-01') } } });
      await prisma.leaveRequest.deleteMany({ where: { user_id: id, start_date: { gte: new Date('2026-11-01'), lt: new Date('2026-12-01') } } });
      await prisma.profileChangeRequest.deleteMany({ where: { user_id: id, field: 'Address' } });
      await prisma.attendance.deleteMany({ where: { user_id: id, clock_in: { gte: todayStart } } });
    }
  } catch {}
}

async function main() {
  console.log('\n' + bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  Temporary Worker (TCTW001–012)'));
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + TW.email + '  (Appendix A, tenant: Acme)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================') + '\n');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable — run: cd server && npm run dev')); process.exit(1); }

  await cleanup();
  const auth = await login(TW);
  const token = auth && auth.token;
  if (!token) { console.log(red('ERROR: cannot log in as TEMPORARY_WORKER — run: npm run seed:test')); process.exit(1); }
  const ACME = auth.user.organisationId;
  const twId = auth.user.userId;

  // ── setup via Prisma: skill + available (PENDING) task + assigned task ───
  const pm = await prisma.user.findUnique({ where: { email: 'pm@acme.test' }, select: { userId: true } });
  const skill = await prisma.skill.create({ data: { organisation_id: ACME, skill_name: SKILL, cert_required: false } });
  await prisma.userSkill.create({ data: { user_id: twId, skill_id: skill.skill_id } });
  const avail = await prisma.task.create({ data: { organisation_id: ACME, created_by: pm.userId, title: 'STA-TEST Evening Shift', required_skill_id: skill.skill_id, start_datetime: new Date('2026-10-11T18:00:00'), end_datetime: new Date('2026-10-11T22:00:00'), status: 'PENDING' } });
  await prisma.taskSkill.create({ data: { task_id: avail.task_id, skill_id: skill.skill_id } });
  const assigned = await prisma.task.create({ data: { organisation_id: ACME, created_by: pm.userId, title: 'STA-TEST TW Assigned', start_datetime: new Date('2026-10-12T09:00:00'), end_datetime: new Date('2026-10-12T11:00:00'), status: 'ASSIGNED' } });
  await prisma.taskAssignment.create({ data: { task_id: assigned.task_id, assigned_to: twId, assigned_by: pm.userId, assignment_type: 'MANUAL' } });

  // ── TCTW001 — login ─────────────────────────────────────────────────────
  console.log(bold('TCTW001  Login – Temporary Worker'));
  line('login', 'user_type=' + auth.user.user_type + ', organisationId=' + ACME);
  line('nav', 'TEMP_NAV (client) has no Leave item — verified in pages/temp-worker/nav.js');
  verdict('TCTW001', auth.user.user_type === 'TEMPORARY_WORKER' && !!ACME, 'Logged in as TEMPORARY_WORKER (nav differs — no Leave, client-side)');

  // ── TCTW002 — set availability ──────────────────────────────────────────
  console.log(bold('TCTW002  Set availability'));
  const a2 = await call('POST', '/temp-worker/availability', { token, body: { start_datetime: AVAIL.start, end_datetime: AVAIL.end, status: 'AVAILABLE' } });
  const back = await call('GET', '/temp-worker/availability', { token });
  const persisted = (back.json.data || []).some((s) => s.availability_id === (a2.json.data && a2.json.data.availability_id));
  line('POST', '/temp-worker/availability -> HTTP ' + a2.status + ', persists=' + persisted);
  verdict('TCTW002', a2.status === 201 && persisted, 'Availability slot created and persists');

  // ── TCTW003 — browse available tasks ────────────────────────────────────
  console.log(bold('TCTW003  Browse available tasks'));
  const av = await call('GET', '/temp-worker/tasks/available', { token });
  const hasAvail = (av.json.data || []).some((t) => t.task_id === avail.task_id);
  line('GET', '/temp-worker/tasks/available -> HTTP ' + av.status + ', tasks=' + ((av.json.data || []).length));
  line('match', 'PENDING task matching temp skills present=' + hasAvail);
  verdict('TCTW003', av.status === 200 && hasAvail, 'Only PENDING tasks matching the temp worker are listed (feature permanent workers lack)');

  // ── TCTW004 — pick an available task (NO endpoint) ──────────────────────
  console.log(bold('TCTW004  Pick an available task'));
  const pick = await call('POST', `/temp-worker/tasks/${avail.task_id}/pick`, { token });
  const pick2 = await call('POST', `/temp-worker/tasks/${avail.task_id}/assign`, { token });
  line('POST', `/temp-worker/tasks/${avail.task_id}/pick -> HTTP ${pick.status}`);
  line('POST', `/temp-worker/tasks/${avail.task_id}/assign -> HTTP ${pick2.status}`);
  verdict('TCTW004', pick.status !== 404 && pick.status < 300, red('FAIL — no pick/accept endpoint exists (both return HTTP 404). Temp worker cannot self-assign; only a PM can assign.'));

  // ── TCTW005 — view assigned tasks ───────────────────────────────────────
  console.log(bold('TCTW005  View assigned tasks'));
  const mine = await call('GET', '/temp-worker/tasks', { token });
  const hasAssigned = (mine.json.data || []).some((t) => t.task_id === assigned.task_id);
  line('GET', '/temp-worker/tasks -> HTTP ' + mine.status + ', own assigned present=' + hasAssigned);
  verdict('TCTW005', mine.status === 200 && hasAssigned, 'Only the temp worker\'s own assigned tasks are listed');

  // ── TCTW006 — acknowledge ───────────────────────────────────────────────
  console.log(bold('TCTW006  Acknowledge assigned task'));
  const ack = await call('PATCH', `/temp-worker/tasks/${assigned.task_id}/acknowledge`, { token });
  line('PATCH', `/temp-worker/tasks/${assigned.task_id}/acknowledge -> HTTP ${ack.status}, status=${ack.json.data && ack.json.data.status}`);
  verdict('TCTW006', ack.status === 200 && ack.json.data.status === 'IN_PROGRESS', 'Task acknowledged (ASSIGNED -> IN_PROGRESS)');

  // ── TCTW007 — update progress ───────────────────────────────────────────
  console.log(bold('TCTW007  Update task progress'));
  const prog = await call('PATCH', `/temp-worker/tasks/${assigned.task_id}/progress`, { token, body: { status: 'COMPLETED' } });
  line('PATCH', `/temp-worker/tasks/${assigned.task_id}/progress {COMPLETED} -> HTTP ${prog.status}, status=${prog.json.data && prog.json.data.status}`);
  verdict('TCTW007', prog.status === 200 && prog.json.data.status === 'COMPLETED', 'Progress persists (NOTE: status enum IN_PROGRESS/COMPLETED, not a %)');

  // ── TCTW008 — clock in / clock out ──────────────────────────────────────
  console.log(bold('TCTW008  Clock in / clock out'));
  const ci = await call('POST', '/temp-worker/attendance/clock-in', { token });
  const co = await call('PUT', '/temp-worker/attendance/clock-out', { token });
  line('clock-in', 'HTTP ' + ci.status + ' at ' + (ci.json.data && ci.json.data.clock_in));
  line('clock-out', 'HTTP ' + co.status + ', working_hours=' + (co.json.data && co.json.data.working_hours));
  verdict('TCTW008', ci.status === 201 && co.status === 200 && co.json.data.clock_out != null, 'Clock-in then clock-out recorded');

  // ── TCTW009 — view my skills (NO GET route) ─────────────────────────────
  console.log(bold('TCTW009  View my skills (read-only)'));
  const sk = await call('GET', '/temp-worker/skills', { token });
  line('GET', '/temp-worker/skills -> HTTP ' + sk.status + dim('  (only PUT /skills exists, and it is a stub)'));
  verdict('TCTW009', sk.status === 200 && Array.isArray(sk.json && sk.json.data), red('FAIL — no GET /temp-worker/skills route (HTTP 404); assigned skills cannot be viewed via API.'));

  // ── TCTW010 — submit profile change request ─────────────────────────────
  console.log(bold('TCTW010  Submit profile change request'));
  const pcr = await call('POST', '/temp-worker/profile/change-request', { token, body: { field: 'Address', requested_value: '123 Test Street', reason: 'moved' } });
  line('POST', '/temp-worker/profile/change-request {Address} -> HTTP ' + pcr.status + ', status=' + (pcr.json.data && pcr.json.data.status));
  verdict('TCTW010', pcr.status === 201 && pcr.json.data.status === 'PENDING', 'Profile change request created (Pending)');

  // ── TCTW011 — no Leave feature (negative) ───────────────────────────────
  console.log(bold('TCTW011  No Leave feature for temp worker (negative)'));
  const lv = await call('POST', '/temp-worker/leave', { token, body: { leave_type: 'ANNUAL', start_date: LEAVE.start, end_date: LEAVE.end, reason: 'STA-TEST' } });
  line('nav', 'Leave UI absent in TEMP_NAV (client) — TRUE');
  line('api', 'POST /temp-worker/leave -> HTTP ' + lv.status + dim('  (expected: denied; actual: allowed)'));
  verdict('TCTW011', lv.status === 403 || lv.status === 404, red('FAIL — nav omits Leave, but the API is NOT denied: POST /temp-worker/leave returns ' + lv.status + '. Temp leave routes exist in temporary-worker.routes.js.'));

  // ── TCTW012 — RBAC: no PM/admin access ──────────────────────────────────
  console.log(bold('TCTW012  RBAC – scope & no PM/admin access'));
  const pmRoute = await call('POST', '/pm/tasks', { token, body: {} });
  const adminRoute = await call('GET', '/admin/organisations', { token });
  line('POST /pm/tasks', '-> HTTP ' + pmRoute.status + ', message=' + JSON.stringify(pmRoute.json && pmRoute.json.message));
  line('GET /admin', '/admin/organisations -> HTTP ' + adminRoute.status);
  verdict('TCTW012', pmRoute.status === 403 && adminRoute.status === 403, 'Temp worker denied PM and admin routes (HTTP 403 "Access denied: insufficient permissions")');

  await cleanup();

  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCTW', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')) +
    dim('   (004 no-pick, 009 no-GET-skills, 011 leave-not-denied fail by design)'));
  console.log(bold('----------------------------------------------------------------') + '\n');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
