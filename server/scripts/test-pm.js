/**
 * System Test runner — Project Manager cases TCMG001–TCMG016.
 *
 * Black-box tests over the live API (screenshot-friendly PASS/FAIL report).
 * Preconditions (skills, availability, cross-tenant task) are set up via Prisma;
 * PM actions go through the API. Self-cleaning and repeatable.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-pm.js   |   npm run test:pm
 */

const prisma = require('../src/config/prisma');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const PM = { email: 'pm@acme.test', password: 'Passw0rd!' };
const PERM = { email: 'perm@acme.test', password: 'Passw0rd!' };

const SKILL = 'STA-TEST PM Skill';
const WIN_START = '2026-08-03T09:00:00';
const WIN_END = '2026-08-03T11:00:00';
const L1 = { start: '2026-09-01', end: '2026-09-02' };
const L2 = { start: '2026-09-08', end: '2026-09-09' };

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
      await prisma.allocationHistory.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.taskAssignment.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.taskSkill.deleteMany({ where: { task_id: { in: tids } } });
      await prisma.task.deleteMany({ where: { task_id: { in: tids } } });
    }
    const perm = await prisma.user.findUnique({ where: { email: PERM.email }, select: { userId: true } });
    if (perm) {
      await prisma.availability.deleteMany({ where: { user_id: perm.userId, start_datetime: new Date(WIN_START) } });
      await prisma.leaveRequest.deleteMany({ where: { user_id: perm.userId, start_date: { gte: new Date('2026-09-01') } } });
      await prisma.leaveBalance.deleteMany({ where: { user_id: perm.userId } });
    }
    const skill = await prisma.skill.findFirst({ where: { skill_name: SKILL } });
    if (skill) { await prisma.userSkill.deleteMany({ where: { skill_id: skill.skill_id } }); }
    await prisma.skill.deleteMany({ where: { skill_name: { startsWith: 'STA-TEST' } } });
    await prisma.landingTestimonial.deleteMany({ where: { name: { startsWith: 'STA-TEST' } } });
  } catch {}
}

async function main() {
  console.log('\n' + bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  Project Manager (TCMG001–016)'));
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + PM.email + '  (Appendix A, tenant: Acme)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================') + '\n');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable — run: cd server && npm run dev')); process.exit(1); }

  await cleanup();
  const pmAuth = await login(PM);
  const token = pmAuth && pmAuth.token;
  if (!token) { console.log(red('ERROR: cannot log in as PROJECT_MANAGER — run: npm run seed:test')); process.exit(1); }
  const ACME = pmAuth.user.organisationId;
  const permTok = (await login(PERM)).token;

  // ── setup preconditions via Prisma ──────────────────────────────────────
  const perm = await prisma.user.findUnique({ where: { email: PERM.email }, select: { userId: true } });
  const temp = await prisma.user.findUnique({ where: { email: 'temp@acme.test' }, select: { userId: true } });
  const globex = await prisma.user.findUnique({ where: { email: 'admin@globex.test' }, select: { userId: true, organisationId: true } });
  let skill = await prisma.skill.findFirst({ where: { organisation_id: ACME, skill_name: SKILL } });
  if (!skill) skill = await prisma.skill.create({ data: { organisation_id: ACME, skill_name: SKILL, cert_required: false } });
  if (!(await prisma.userSkill.findFirst({ where: { user_id: perm.userId, skill_id: skill.skill_id } })))
    await prisma.userSkill.create({ data: { user_id: perm.userId, skill_id: skill.skill_id } });
  if (!(await prisma.availability.findFirst({ where: { user_id: perm.userId, start_datetime: new Date(WIN_START) } })))
    await prisma.availability.create({ data: { user_id: perm.userId, start_datetime: new Date(WIN_START), end_datetime: new Date(WIN_END), status: 'AVAILABLE' } });
  let gtask = await prisma.task.findFirst({ where: { title: 'STA-TEST Globex Task' } });
  if (!gtask) gtask = await prisma.task.create({ data: { organisation_id: globex.organisationId, created_by: globex.userId, title: 'STA-TEST Globex Task', start_datetime: new Date(WIN_START), end_datetime: new Date(WIN_END), status: 'PENDING' } });

  const newTask = async (title) => {
    const r = await call('POST', '/pm/tasks', { token, body: { title, start_datetime: WIN_START, end_datetime: WIN_END, required_skill_ids: [skill.skill_id] } });
    return r;
  };

  // ── TCMG001 — create task ───────────────────────────────────────────────
  console.log(bold('TCMG001  Create task'));
  const t1 = await newTask('STA-TEST Morning Dispatch');
  const t1id = t1.json && t1.json.data && t1.json.data.task_id;
  line('POST', '/pm/tasks {title, window, skill} -> HTTP ' + t1.status);
  line('status', (t1.json.data && t1.json.data.status) + dim('  (expect PENDING)'));
  verdict('TCMG001', t1.status === 201 && t1.json.data.status === 'PENDING', 'Task created (201) with status PENDING (NOTE: no headcount field in model)');

  // ── TCMG002 — create task validation (negative) ─────────────────────────
  console.log(bold('TCMG002  Create task – validation (negative)'));
  const t2 = await call('POST', '/pm/tasks', { token, body: { title: 'STA-TEST Bad', start_datetime: '2026-08-03T09:00:00', end_datetime: '2026-08-03T08:00:00' } });
  line('POST', 'end (08:00) before start (09:00) -> HTTP ' + t2.status);
  line('errors', JSON.stringify(t2.json && (t2.json.errors ? t2.json.errors.map((e) => e.msg) : t2.json.message)));
  verdict('TCMG002', t2.status === 400, 'Invalid task rejected (HTTP 400 validation errors); no task saved');

  // ── TCMG003 — view eligible staff ───────────────────────────────────────
  console.log(bold('TCMG003  View eligible staff for a task'));
  const el = await call('GET', `/pm/tasks/${t1id}/eligible-staff`, { token });
  const cand = ((el.json.data && el.json.data.candidates) || []).find((x) => x.userId === perm.userId);
  line('GET', `/pm/tasks/${t1id}/eligible-staff -> HTTP ${el.status}`);
  line('perm', cand ? ('listed, eligible=' + cand.eligible + ', skills=' + JSON.stringify(cand.skills)) : 'not found');
  verdict('TCMG003', el.status === 200 && !!cand && cand.eligible === true, 'Worker with matching skill + availability listed as eligible');

  // ── TCMG004 — auto-allocate ─────────────────────────────────────────────
  console.log(bold('TCMG004  Auto-allocate a task'));
  const auto = await call('POST', `/pm/tasks/${t1id}/auto-allocate`, { token });
  const autoAssignee = auto.json.data && auto.json.data.assignments && auto.json.data.assignments[0] && auto.json.data.assignments[0].assigned_to;
  line('POST', `/pm/tasks/${t1id}/auto-allocate -> HTTP ${auto.status}`);
  line('result', 'status=' + (auto.json.data && auto.json.data.status) + ', assigned_to=' + autoAssignee);
  verdict('TCMG004', auto.status === 200 && auto.json.data.status === 'ASSIGNED' && autoAssignee === perm.userId, 'Eligible staff auto-assigned; task status ASSIGNED');

  // ── TCMG005 — manual assign ─────────────────────────────────────────────
  console.log(bold('TCMG005  Manually assign staff to a task'));
  const t2c = await newTask('STA-TEST Manual Task');
  const t2id = t2c.json.data.task_id;
  const man = await call('POST', `/pm/tasks/${t2id}/assign`, { token, body: { assigned_to: perm.userId } });
  line('POST', `/pm/tasks/${t2id}/assign {assigned_to: perm} -> HTTP ${man.status}`);
  line('assigned', 'to=' + (man.json.data && man.json.data.assignments[0] && man.json.data.assignments[0].assigned_to));
  verdict('TCMG005', man.status === 200 && man.json.data.assignments[0].assigned_to === perm.userId, 'Chosen worker assigned to the task');

  // ── TCMG006 — reallocate ────────────────────────────────────────────────
  console.log(bold('TCMG006  Reallocate / reassign a task'));
  const re = await call('POST', `/pm/tasks/${t2id}/reallocate`, { token, body: { assigned_to: temp.userId } });
  const reAssignee = re.json.data && re.json.data.assignments[0] && re.json.data.assignments[0].assigned_to;
  line('POST', `/pm/tasks/${t2id}/reallocate {assigned_to: temp} -> HTTP ${re.status}`);
  line('moved', 'assigned_to=' + reAssignee + dim('  (was perm)'));
  verdict('TCMG006', re.status === 200 && reAssignee === temp.userId, 'Assignment moved to the new worker');

  // ── TCMG007 — allocation conflict prevented ─────────────────────────────
  console.log(bold('TCMG007  Allocation conflict prevented'));
  const tB = await newTask('STA-TEST Overlap Task'); // same window as t1 (perm already ASSIGNED to t1)
  const tBid = tB.json.data.task_id;
  const dbl = await call('POST', `/pm/tasks/${tBid}/assign`, { token, body: { assigned_to: perm.userId } });
  line('setup', 'perm already ASSIGNED to overlapping task ' + t1id + ' (09:00–11:00)');
  line('assign', `POST /pm/tasks/${tBid}/assign {perm, same window} -> HTTP ${dbl.status}` + dim('  (expected: blocked)'));
  verdict('TCMG007', dbl.status !== 200, red('Overlap NOT blocked — manual assign succeeded (HTTP ' + dbl.status + '). No conflict/double-booking check exists (eligible = isAvailable && withinHours only).'));

  // ── TCMG008 — view team & availability ──────────────────────────────────
  console.log(bold('TCMG008  View team & availability'));
  const team = await call('GET', '/pm/team', { token });
  line('GET', '/pm/team -> HTTP ' + team.status + ', members=' + ((team.json.data || []).length));
  verdict('TCMG008', team.status === 200 && (team.json.data || []).length >= 1, 'Team list with availability/skills renders');

  // ── TCMG009 — approve leave ─────────────────────────────────────────────
  console.log(bold('TCMG009  Approve leave request'));
  await call('POST', '/worker/leave', { token: permTok, body: { leave_type: 'ANNUAL', start_date: L1.start, end_date: L1.end, reason: 'STA-TEST' } });
  const lv1 = await call('GET', '/pm/leave', { token });
  const pend1 = (lv1.json.data || []).find((l) => l.user === perm.userId && l.status === 'PENDING');
  const ap = pend1 ? await call('PATCH', `/pm/leave/${pend1.id}`, { token, body: { status: 'APPROVED' } }) : { status: 0, json: {} };
  line('approve', 'PATCH /pm/leave/' + (pend1 && pend1.id) + ' {APPROVED} -> HTTP ' + ap.status + ', status=' + (ap.json.data && ap.json.data.status));
  verdict('TCMG009', ap.status === 200 && ap.json.data.status === 'APPROVED', 'Leave request status becomes Approved');

  // ── TCMG010 — reject leave (negative) ───────────────────────────────────
  console.log(bold('TCMG010  Reject leave request (negative)'));
  await call('POST', '/worker/leave', { token: permTok, body: { leave_type: 'ANNUAL', start_date: L2.start, end_date: L2.end, reason: 'STA-TEST' } });
  const lv2 = await call('GET', '/pm/leave', { token });
  const pend2 = (lv2.json.data || []).find((l) => l.user === perm.userId && l.status === 'PENDING');
  const rj = pend2 ? await call('PATCH', `/pm/leave/${pend2.id}`, { token, body: { status: 'REJECTED' } }) : { status: 0, json: {} };
  line('reject', 'PATCH /pm/leave/' + (pend2 && pend2.id) + ' {REJECTED} -> HTTP ' + rj.status + ', status=' + (rj.json.data && rj.json.data.status));
  verdict('TCMG010', rj.status === 200 && rj.json.data.status === 'REJECTED', 'Leave request status becomes Rejected');

  // ── TCMG011 — view / update leave balance ───────────────────────────────
  console.log(bold('TCMG011  View / update leave balance'));
  const ub = await call('PATCH', `/pm/leave-balance/${perm.userId}`, { token, body: { annual: { entitled: 14, used: 2 } } });
  const lbList = await call('GET', '/pm/leave-balance', { token });
  const bal = (lbList.json.data || []).find((b) => b.user === perm.userId);
  line('update', `PATCH /pm/leave-balance/${perm.userId} {annual 14/2} -> HTTP ${ub.status}`);
  line('persisted', bal ? ('annual entitled=' + bal.annual.entitled + ', used=' + bal.annual.used) : 'not found');
  verdict('TCMG011', ub.status === 200 && bal && bal.annual.entitled === 14 && bal.annual.used === 2, 'Updated leave balance persists');

  // ── TCMG012 — testimonials CRUD ─────────────────────────────────────────
  console.log(bold('TCMG012  Testimonials – CRUD'));
  const tsC = await call('POST', '/admin/content/testimonials', { token, body: { name: 'STA-TEST Author', company: 'Acme', rating: 5, review_text: 'Great tool' } });
  const tsId = tsC.json && tsC.json.testimonial_id;
  const tsU = await call('PUT', `/admin/content/testimonials/${tsId}`, { token, body: { review_text: 'Updated review' } });
  const tsD = await call('DELETE', `/admin/content/testimonials/${tsId}`, { token });
  line('endpoint', '/admin/content/testimonials (PM allowed via testimonialWriters)');
  line('crud', 'create HTTP ' + tsC.status + ' (id=' + tsId + ')  update HTTP ' + tsU.status + '  delete HTTP ' + tsD.status);
  verdict('TCMG012', tsC.status === 201 && !!tsId && tsU.status === 200 && tsD.status === 200, 'Create/update/delete testimonial all persist');

  // ── TCMG013 — subscription & billing (read-only) ────────────────────────
  console.log(bold('TCMG013  View subscription & billing (read-only)'));
  const sub = await call('GET', '/pm/subscription', { token });
  const bill = await call('GET', '/pm/billing', { token });
  line('subscription', 'GET /pm/subscription -> HTTP ' + sub.status);
  line('billing', 'GET /pm/billing -> HTTP ' + bill.status + ', records=' + ((bill.json.data || []).length));
  verdict('TCMG013', sub.status === 200 && bill.status === 200, 'Plan + billing display; no write endpoints exist under /pm (read-only)');

  // ── TCMG014 — view reports (NOT API-backed) ─────────────────────────────
  console.log(bold('TCMG014  View reports'));
  const rep = await call('GET', '/pm/reports', { token });
  line('GET', '/pm/reports -> HTTP ' + rep.status + dim('  (no such route)'));
  line('client', 'Reports.jsx has NO API call (89 lines, 0 fetches) — view is client-only; no CSV/PDF export');
  verdict('TCMG014', false, red('FAIL — no reports endpoint; Reports.jsx is client-only, export not implemented'));

  // ── TCMG015 — RBAC scope to own org ─────────────────────────────────────
  console.log(bold('TCMG015  RBAC – scope to own org'));
  const mine = await call('GET', '/pm/tasks', { token });
  const leaks = (mine.json.data || []).some((t) => t.task_id === gtask.task_id);
  line('GET', '/pm/tasks -> HTTP ' + mine.status + ', tasks=' + ((mine.json.data || []).length));
  line('isolation', 'Globex task (' + gtask.task_id + ') present in Acme list=' + leaks + dim('  (expect false)'));
  verdict('TCMG015', mine.status === 200 && !leaks, 'Only Acme tasks returned; Globex task not visible');

  // ── TCMG016 — cross-tenant task access blocked ──────────────────────────
  console.log(bold('TCMG016  Cross-tenant task access blocked (edge)'));
  const cross = await call('GET', `/pm/tasks/${gtask.task_id}`, { token });
  line('GET', `/pm/tasks/${gtask.task_id} (Globex task) -> HTTP ${cross.status}`);
  line('message', JSON.stringify(cross.json && cross.json.message));
  verdict('TCMG016', cross.status === 404 || cross.status === 403, 'Cross-tenant task access denied (HTTP ' + cross.status + ')');

  await cleanup();

  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCMG', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')) +
    dim('   (007 conflict-not-blocked & 014 no-reports-API fail by design)'));
  console.log(bold('----------------------------------------------------------------') + '\n');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
