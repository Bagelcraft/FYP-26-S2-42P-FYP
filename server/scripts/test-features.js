/**
 * Feature test runner — verifies the Phase 1–5 additions end-to-end over the live API.
 * Black-box (HTTP) assertions; Prisma is used only for setup/cleanup of test artifacts.
 *
 * Prereqs: API running (npm run dev) and a seeded database
 *          (node scripts/reset-hosted.js --confirm).
 * Usage:   npm run test:features   |   node scripts/test-features.js
 */
const { PrismaClient } = require('@prisma/client');
const { resolveFixtures } = require('./fixtures');
const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';

const useColor = !process.env.NO_COLOR;
const c = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const green = (s) => c('32', s), red = (s) => c('31', s), dim = (s) => c('90', s), bold = (s) => c('1', s);
const results = [];
// Accounts this suite creates itself. `ft-` prefix is what clean() looks for.
const FT_STAFF_EMAIL = 'ft-perm@fixture.test';
const line = (l, v) => console.log('   ' + dim(String(l).padEnd(11)) + v);
const verdict = (id, ok, note) => { console.log('   ' + (ok ? green(' PASS ') : red(' FAIL ')) + ' ' + note + '\n'); results.push({ id, ok }); };

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { s: res.status, d: json };
}
let FIXTURE_PASSWORD = 'SmartTask#2026';
const login = async (email, password = FIXTURE_PASSWORD) =>
  (await call('POST', '/auth/login', { body: { email, password } })).d?.token;

async function main() {
  const p = new PrismaClient();
  const clean = async () => {
    try {
      const us = await p.user.findMany({ where: { email: { startsWith: 'ft-' } }, select: { userId: true } });
      const ids = us.map((u) => u.userId);
      if (ids.length) { await p.userSkill.deleteMany({ where: { user_id: { in: ids } } }); await p.leaveBalance.deleteMany({ where: { user_id: { in: ids } } }); await p.user.deleteMany({ where: { userId: { in: ids } } }); }
      const tasks = await p.task.findMany({ where: { title: { startsWith: 'FT-' } }, select: { task_id: true } });
      const tids = tasks.map((t) => t.task_id);
      if (tids.length) { await p.taskAssignment.deleteMany({ where: { task_id: { in: tids } } }); await p.allocationHistory.deleteMany({ where: { task_id: { in: tids } } }); await p.taskSkill.deleteMany({ where: { task_id: { in: tids } } }); await p.task.deleteMany({ where: { task_id: { in: tids } } }); }
      const roles = await p.staffRole.findMany({ where: { role_name: { startsWith: 'FT-' } }, select: { role_id: true } });
      for (const r of roles) { await p.roleSkill.deleteMany({ where: { role_id: r.role_id } }); await p.staffRole.delete({ where: { role_id: r.role_id } }); }
      await p.skill.deleteMany({ where: { skill_name: { startsWith: 'FT-' } } });
      const ds = await p.department.findMany({ where: { name: { startsWith: 'FT-' } }, select: { department_id: true } });
      for (const d of ds) await p.department.delete({ where: { department_id: d.department_id } });
    } catch {}
  };

  try {
    console.log('\n' + bold('==============================================================='));
    console.log(bold(' FYP-26-S2-42P  Feature verification  (Phases 1–5)'));
    console.log(' Target: ' + BASE + '   Run: ' + new Date().toLocaleString());
    console.log(bold('===============================================================') + '\n');
    try { await fetch(HOST + '/api/health'); } catch { console.log(red('API not reachable — run: cd server && npm run dev')); process.exit(1); }

    await clean();

    // Accounts are resolved by role from whatever the database holds, so this
    // survives reseeds instead of depending on one retired fixture set.
    const fx = await resolveFixtures(p, { require: ['ORG_ADMIN', 'PROJECT_MANAGER', 'TEMPORARY_WORKER'] });
    if (fx.error) { console.log(red(fx.error)); process.exit(1); }
    FIXTURE_PASSWORD = fx.password;
    console.log(dim(`   fixtures: ${fx.org.name} — ${fx.admin.email} / ${fx.pm.email} / ${fx.temporary.email}\n`));

    const admin = await login(fx.admin.email);
    const pm = await login(fx.pm.email);
    if (!admin || !pm) {
      console.log(red(`Cannot log in as ${fx.admin.email} / ${fx.pm.email}.`));
      console.log(red('Check TEST_PASSWORD, or reseed: node scripts/reset-hosted.js --confirm'));
      process.exit(1);
    }

    // ── Phase 1: roles↔dept↔skills, registration auto-skills + leave balance ──
    console.log(bold('Phase 1  Org Admin: roles, skills, departments, registration'));
    const skill = (await call('POST', '/org-admin/skills', { token: admin, body: { skill_name: 'FT-Welding', cert_required: true } })).d.data;
    const dept = (await call('POST', '/org-admin/departments', { token: admin, body: { name: 'FT-Ops' } })).d.data;
    const role = await call('POST', '/org-admin/roles', { token: admin, body: { role_name: 'FT-Tech', department_id: dept.department_id, skill_ids: [skill.skill_id] } });
    verdict('P1-role', role.s === 201 && role.d.data.department?.name === 'FT-Ops' && role.d.data.requiredSkills?.[0]?.skill.skill_name === 'FT-Welding', 'Role has a department + required skills');
    const reg = await call('POST', '/org-admin/staff', { token: admin, body: { full_name: 'FT Perm', email: FT_STAFF_EMAIL, user_type: 'PERMANENT_WORKER', password: 'Passw0rd!', role_id: role.d.data.role_id, skill_ids: [], annual_entitled: 12, medical_entitled: 8 } });
    const gotRoleSkill = (reg.d.data?.skills ?? []).some((s) => s.skill.skill_name === 'FT-Welding');
    verdict('P1-register', reg.s === 201 && gotRoleSkill, "Registering with a role auto-adds the role's skills");
    const depts = (await call('GET', '/org-admin/departments', { token: admin })).d.data;
    verdict('P1-dept-roles', (depts.find((d) => d.name === 'FT-Ops')?.roles ?? []).some((r) => r.role_name === 'FT-Tech'), 'Department lists its roles (no head_user_id)');

    // ── Phase 2: worker leave balance ────────────────────────────────────────
    console.log(bold('Phase 2  Worker leave balance'));
    const permTok = await login(FT_STAFF_EMAIL, 'Passw0rd!');
    const lb = await call('GET', '/worker/leave-balance', { token: permTok });
    line('GET', '/worker/leave-balance -> HTTP ' + lb.s);
    verdict('P2-balance', lb.s === 200 && lb.d.data.annual.entitled === 12 && lb.d.data.medical.entitled === 8, 'Worker sees the leave balance set at registration (12 / 8)');

    // ── Phase 3: calendar + task date range ──────────────────────────────────
    console.log(bold('Phase 3  Calendar + task date range'));
    const mkTask = await call('POST', '/pm/tasks', { token: pm, body: { title: 'FT-RangeTask', start_datetime: '2026-08-10T09:00:00', end_datetime: '2026-08-13T18:00:00', required_skill_ids: [] } });
    const pmCal = await call('GET', '/pm/calendar?from=2026-08-01&to=2026-08-31', { token: pm });
    const spanned = (pmCal.d.data?.tasks ?? []).find((t) => t.title === 'FT-RangeTask');
    line('task span', spanned ? `${spanned.start} -> ${spanned.end}` : 'not found');
    verdict('P3-pm-cal', pmCal.s === 200 && Array.isArray(pmCal.d.data.shifts) && spanned?.start === '2026-08-10' && spanned?.end === '2026-08-13', 'Manager calendar returns shifts/tasks/unavailable; multi-day task spans start→deadline');
    const wCal = await call('GET', '/worker/calendar', { token: permTok });
    verdict('P3-worker-cal', wCal.s === 200 && Array.isArray(wCal.d.data.tasks), 'Worker calendar returns 200 (own shifts/tasks/leave)');

    // ── Phase 4/5: reports exists, subscription moved off PM ─────────────────
    console.log(bold('Phase 4/5  PM endpoints (reports added, subscription moved)'));
    verdict('P4-reports', (await call('GET', '/pm/reports', { token: pm })).s === 200, 'GET /pm/reports exists (200)');
    verdict('P5-sub-moved', (await call('GET', '/pm/subscription', { token: pm })).s === 404, 'GET /pm/subscription removed from PM (404 — moved to Org Admin)');

    // ── Phase 5: freelancer temp-worker flow ─────────────────────────────────
    console.log(bold('Phase 5  Temporary worker = freelancer'));
    const temp = { userId: fx.temporary.userId };
    const pmU = { userId: fx.pm.userId };
    const org = { organisation_id: fx.org.organisation_id };
    const task = await p.task.create({ data: { organisation_id: org.organisation_id, created_by: pmU.userId, title: 'FT-FreelanceTask', status: 'ASSIGNED', start_datetime: new Date('2026-08-10T09:00:00'), end_datetime: new Date('2026-08-10T13:00:00') } });
    await p.taskAssignment.create({ data: { task_id: task.task_id, assigned_to: temp.userId, assigned_by: pmU.userId, assignment_type: 'MANUAL' } });
    const tempTok = await login(fx.temporary.email);
    const acc = await call('PATCH', `/temp-worker/tasks/${task.task_id}/acknowledge`, { token: tempTok });
    const blocked = await call('PATCH', `/temp-worker/tasks/${task.task_id}/progress`, { token: tempTok, body: { status: 'COMPLETED' } });
    const sub = await call('PATCH', `/temp-worker/tasks/${task.task_id}/submit`, { token: tempTok });
    const appr = await call('PATCH', `/pm/tasks/${task.task_id}/approve-completion`, { token: pm });
    const hrs = await call('GET', '/temp-worker/hours', { token: tempTok });
    const clockGone = await call('POST', '/temp-worker/attendance/clock-in', { token: tempTok });
    line('flow', `accept=${acc.d.data?.status} · blockDirect=${blocked.s} · submit=${sub.d.data?.status} · approve=${appr.d.data?.status}`);
    line('hours', `total=${hrs.d.data?.totalHours}h · clock-in=${clockGone.s}`);
    verdict('P5-flow', acc.d.data?.status === 'IN_PROGRESS' && blocked.s === 422 && sub.d.data?.status === 'SUBMITTED' && appr.d.data?.status === 'COMPLETED', 'Accept→submit→approve; temp cannot self-complete (422)');
    verdict('P5-hours', hrs.s === 200 && hrs.d.data.totalHours >= 4, 'Approved hours logged from task duration (4h)');
    verdict('P5-noclock', clockGone.s === 404, 'Temp clock-in removed (404)');

    await clean();
    const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
    console.log(bold('---------------------------------------------------------------'));
    console.log(' SUMMARY:  ' + results.map((r) => r.id + (r.ok ? green('✓') : red('✗'))).join('  '));
    console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')));
    console.log(bold('---------------------------------------------------------------') + '\n');
    process.exitCode = fail ? 1 : 0;
  } catch (e) { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; }
  finally { try { await clean(); } catch {} await p.$disconnect(); }
}
main();
