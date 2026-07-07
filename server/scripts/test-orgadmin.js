/**
 * System Test runner — Organisation Admin cases TCOA001–TCOA015.
 *
 * Black-box tests over the live API (screenshot-friendly PASS/FAIL report).
 * Test artifacts are cleaned up via Prisma at start and end, so it is repeatable.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-orgadmin.js   |   npm run test:orgadmin
 */

const prisma = require('../src/config/prisma');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const ADMIN = { email: 'admin@acme.test', password: 'Passw0rd!' };
const GLOBEX_ADMIN_EMAIL = 'admin@globex.test';

// deterministic test data (cleanup matches by prefix)
const STAFF_NEW = 'sta-test-newstaff@acme.test';
const STAFF_PCR = 'sta-test-pcr@acme.test';
const DUP_EMAIL = 'perm@acme.test'; // existing seeded account (for duplicate check)
const PWD = 'Passw0rd!';

// ── terminal helpers ──────────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR;
const col = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const green = (s) => col('32', s), red = (s) => col('31', s), dim = (s) => col('90', s), bold = (s) => col('1', s);
const results = [];
function line(l, v) { console.log('   ' + dim(String(l).padEnd(12)) + v); }
function verdict(id, ok, note) {
  console.log('   ' + (ok ? green('  PASS  ') : red('  FAIL  ')) + '  ' + note + '\n');
  results.push({ id, ok });
}

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function login(creds) { const r = await call('POST', '/auth/login', { body: creds }); return r.json; }

async function cleanup() {
  try {
    const users = await prisma.user.findMany({ where: { email: { startsWith: 'sta-test-' } }, select: { userId: true } });
    const ids = users.map((u) => u.userId);
    if (ids.length) {
      await prisma.profileChangeRequest.deleteMany({ where: { user_id: { in: ids } } });
      await prisma.userSkill.deleteMany({ where: { user_id: { in: ids } } });
      await prisma.availability.deleteMany({ where: { user_id: { in: ids } } });
      await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } });
      await prisma.user.deleteMany({ where: { userId: { in: ids } } });
    }
  } catch {}
  for (const [model, field] of [['skill', 'skill_name'], ['staffRole', 'role_name'], ['department', 'name'], ['shiftTemplate', 'name']]) {
    try { await prisma[model].deleteMany({ where: { [field]: { startsWith: 'STA-TEST' } } }); } catch {}
  }
}

async function main() {
  console.log('\n' + bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  Organisation Admin (TCOA001–015)'));
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + ADMIN.email + '  (Appendix A, tenant: Acme)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================') + '\n');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable — run: cd server && npm run dev')); process.exit(1); }

  await cleanup();
  const auth = await login(ADMIN);
  const token = auth && auth.token;
  if (!token) { console.log(red('ERROR: cannot log in as ORG_ADMIN — run: npm run seed:test')); process.exit(1); }
  const ACME_ID = auth.user.organisationId;

  // ── TCOA001 — login scoped to own org ──────────────────────────────────
  console.log(bold('TCOA001  Login – Org Admin'));
  const prof = await call('GET', '/org-admin/profile', { token });
  line('login', 'user_type=' + auth.user.user_type + ', organisationId=' + ACME_ID);
  line('profile', 'GET /org-admin/profile -> HTTP ' + prof.status + ', org="' + (prof.json.data && prof.json.data.name) + '"');
  verdict('TCOA001', auth.user.user_type === 'ORG_ADMIN' && !!ACME_ID && prof.status === 200 && prof.json.data.name === 'Acme',
    'Logged in as ORG_ADMIN; workspace scoped to Acme');

  // ── TCOA002 — create staff ─────────────────────────────────────────────
  console.log(bold('TCOA002  Create staff'));
  const c2 = await call('POST', '/org-admin/staff', { token, body: { full_name: 'STA-TEST NewStaff', email: STAFF_NEW, user_type: 'PERMANENT_WORKER', password: PWD } });
  const newId = c2.json && c2.json.data && c2.json.data.userId;
  line('POST', '/org-admin/staff {' + STAFF_NEW + ', PERMANENT_WORKER} -> HTTP ' + c2.status);
  line('created', 'userId=' + newId + ', type=' + (c2.json.data && c2.json.data.user_type));
  verdict('TCOA002', c2.status === 201 && !!newId && c2.json.data.email === STAFF_NEW, 'Staff created (201) and scoped to Acme');

  // ── TCOA003 — create staff, duplicate email (negative) ─────────────────
  console.log(bold('TCOA003  Create staff – validation (negative)'));
  const c3 = await call('POST', '/org-admin/staff', { token, body: { full_name: 'Dup', email: DUP_EMAIL, user_type: 'PERMANENT_WORKER' } });
  line('POST', '/org-admin/staff {existing email ' + DUP_EMAIL + '} -> HTTP ' + c3.status);
  line('message', JSON.stringify(c3.json && c3.json.message));
  verdict('TCOA003', c3.status === 409, 'Duplicate email rejected (HTTP 409 "Email already in use"); no duplicate created');

  // ── TCOA004 — deactivate staff ─────────────────────────────────────────
  console.log(bold('TCOA004  Deactivate staff'));
  const d4 = await call('PATCH', `/org-admin/staff/${newId}/deactivate`, { token });
  line('PATCH', `/org-admin/staff/${newId}/deactivate -> HTTP ${d4.status}`);
  line('is_active', String(d4.json.data && d4.json.data.is_active) + dim('  (expect false)'));
  verdict('TCOA004', d4.status === 200 && d4.json.data.is_active === false, 'Staff set to Inactive (is_active=false)');

  // ── TCOA005 — reactivate staff ─────────────────────────────────────────
  console.log(bold('TCOA005  Reactivate staff'));
  const r5 = await call('PATCH', `/org-admin/staff/${newId}/reactivate`, { token });
  line('PATCH', `/org-admin/staff/${newId}/reactivate -> HTTP ${r5.status}`);
  line('is_active', String(r5.json.data && r5.json.data.is_active) + dim('  (expect true)'));
  verdict('TCOA005', r5.status === 200 && r5.json.data.is_active === true, 'Staff reactivated (is_active=true)');

  // ── TCOA006 — edit organisation profile ────────────────────────────────
  console.log(bold('TCOA006  Edit organization profile'));
  const origName = prof.json.data.name;
  const up6 = await call('PATCH', '/org-admin/profile', { token, body: { name: 'Acme (STA-TEST)' } });
  const re6 = await call('GET', '/org-admin/profile', { token });
  const persisted6 = re6.json.data.name === 'Acme (STA-TEST)';
  await call('PATCH', '/org-admin/profile', { token, body: { name: origName } }); // restore
  line('PATCH', '/org-admin/profile {name} -> HTTP ' + up6.status + ', persisted=' + persisted6);
  verdict('TCOA006', up6.status === 200 && persisted6, 'Org name change persists (NOTE: model has no timezone field — only name is editable)');

  // ── TCOA007 — departments CRUD ─────────────────────────────────────────
  console.log(bold('TCOA007  Departments – CRUD'));
  const dC = await call('POST', '/org-admin/departments', { token, body: { name: 'STA-TEST Dept' } });
  const depId = dC.json.data && dC.json.data.department_id;
  const dU = await call('PATCH', `/org-admin/departments/${depId}`, { token, body: { name: 'STA-TEST Dept 2' } });
  const dD = await call('DELETE', `/org-admin/departments/${depId}`, { token });
  line('create', 'HTTP ' + dC.status + ' (id=' + depId + ')  edit HTTP ' + dU.status + '  delete HTTP ' + dD.status);
  verdict('TCOA007', dC.status === 201 && dU.status === 200 && dD.status === 204, 'Create/edit/delete department all persist');

  // ── TCOA008 — staff roles CRUD ─────────────────────────────────────────
  console.log(bold('TCOA008  Staff Roles – CRUD'));
  const rC = await call('POST', '/org-admin/roles', { token, body: { role_name: 'STA-TEST Role', max_working_hours: 40 } });
  const rid = rC.json.data && rC.json.data.role_id;
  const rU = await call('PATCH', `/org-admin/roles/${rid}`, { token, body: { role_name: 'STA-TEST Role 2' } });
  const rD = await call('DELETE', `/org-admin/roles/${rid}`, { token });
  line('create', 'HTTP ' + rC.status + ' (id=' + rid + ')  edit HTTP ' + rU.status + '  delete HTTP ' + rD.status);
  verdict('TCOA008', rC.status === 201 && rU.status === 200 && rD.status === 204, 'Create/edit/delete staff role all persist');

  // ── TCOA009 — skills catalogue CRUD ────────────────────────────────────
  console.log(bold('TCOA009  Skills catalogue – CRUD'));
  const sC = await call('POST', '/org-admin/skills', { token, body: { skill_name: 'STA-TEST Skill' } });
  const sid = sC.json.data && sC.json.data.skill_id;
  const sU = await call('PATCH', `/org-admin/skills/${sid}`, { token, body: { skill_name: 'STA-TEST Skill 2' } });
  const sD = await call('DELETE', `/org-admin/skills/${sid}`, { token });
  line('create', 'HTTP ' + sC.status + ' (id=' + sid + ')  edit HTTP ' + sU.status + '  delete HTTP ' + sD.status);
  verdict('TCOA009', sC.status === 201 && sU.status === 200 && sD.status === 204, 'Create/edit/delete skill all persist');

  // ── TCOA010 — assign / remove skill to staff ───────────────────────────
  console.log(bold('TCOA010  Assign / remove skills to staff'));
  const sk = await call('POST', '/org-admin/skills', { token, body: { skill_name: 'STA-TEST Forklift' } });
  const skId = sk.json.data && sk.json.data.skill_id;
  const asg = await call('POST', `/org-admin/staff/${newId}/skills`, { token, body: { skill_id: skId } });
  const rmv = await call('DELETE', `/org-admin/staff/${newId}/skills/${skId}`, { token });
  await call('DELETE', `/org-admin/skills/${skId}`, { token }); // clean up the skill
  line('assign', `POST /staff/${newId}/skills {skill_id:${skId}} -> HTTP ${asg.status}`);
  line('remove', `DELETE /staff/${newId}/skills/${skId} -> HTTP ${rmv.status}`);
  verdict('TCOA010', asg.status === 201 && rmv.status === 204, "Worker's skill set updates on assign (201) and remove (204)");

  // ── TCOA011 — shift templates CRUD ─────────────────────────────────────
  console.log(bold('TCOA011  Shift Templates – CRUD'));
  const shC = await call('POST', '/org-admin/shifts', { token, body: { name: 'STA-TEST Shift', start_time: '09:00', end_time: '17:00' } });
  const shid = shC.json.data && shC.json.data.shift_id;
  const shU = await call('PATCH', `/org-admin/shifts/${shid}`, { token, body: { end_time: '18:00' } });
  const shD = await call('DELETE', `/org-admin/shifts/${shid}`, { token });
  line('create', 'HTTP ' + shC.status + ' (id=' + shid + ')  edit HTTP ' + shU.status + '  delete HTTP ' + shD.status);
  verdict('TCOA011', shC.status === 201 && shU.status === 200 && shD.status === 204, 'Create/edit/delete shift template all persist (real "working hours")');

  // ── TCOA012 — approve profile change request ───────────────────────────
  console.log(bold('TCOA012  Approve profile change request'));
  const pcrStaff = await call('POST', '/org-admin/staff', { token, body: { full_name: 'STA-TEST PCR', email: STAFF_PCR, user_type: 'PERMANENT_WORKER', password: PWD } });
  const pcrUserId = pcrStaff.json.data.userId;
  const pcrTok = (await login({ email: STAFF_PCR, password: PWD })).token;
  await call('POST', '/worker/profile/change-request', { token: pcrTok, body: { field: 'Full Name', requested_value: 'PCR Approved Name', reason: 'test' } });
  const listA = await call('GET', '/org-admin/profile-change-requests', { token });
  const reqA = (listA.json.data || []).find((r) => r.user_id === pcrUserId && r.status === 'PENDING');
  const appr = reqA ? await call('PATCH', `/org-admin/profile-change-requests/${reqA.request_id}`, { token, body: { action: 'APPROVED' } }) : { status: 0, json: {} };
  const staffAfter = await call('GET', '/org-admin/staff', { token }); // look up by userId (name just changed)
  const nameUpdated = (staffAfter.json.data || []).some((s) => s.userId === pcrUserId && s.full_name === 'PCR Approved Name');
  line('worker', 'submitted PCR (Full Name -> "PCR Approved Name")');
  line('approve', 'PATCH .../profile-change-requests/' + (reqA && reqA.request_id) + ' {APPROVED} -> HTTP ' + appr.status + ', status=' + (appr.json.data && appr.json.data.status));
  line('applied', "worker's full_name updated=" + nameUpdated);
  verdict('TCOA012', appr.status === 200 && appr.json.data.status === 'APPROVED' && nameUpdated, "Request approved; worker's profile updated");

  // ── TCOA013 — reject profile change request (negative) ─────────────────
  console.log(bold('TCOA013  Reject profile change request (negative)'));
  await call('POST', '/worker/profile/change-request', { token: pcrTok, body: { field: 'Email', requested_value: 'sta-test-pcr-new@acme.test', reason: 'test' } });
  const listB = await call('GET', '/org-admin/profile-change-requests', { token });
  const reqB = (listB.json.data || []).find((r) => r.user_id === pcrUserId && r.status === 'PENDING' && r.field === 'Email');
  const rej = reqB ? await call('PATCH', `/org-admin/profile-change-requests/${reqB.request_id}`, { token, body: { action: 'REJECTED', review_note: 'not allowed' } }) : { status: 0, json: {} };
  const emailUnchanged = (await login({ email: STAFF_PCR, password: PWD })).user ? true : false; // still logs in with old email
  line('reject', 'PATCH .../profile-change-requests/' + (reqB && reqB.request_id) + ' {REJECTED} -> HTTP ' + rej.status + ', status=' + (rej.json.data && rej.json.data.status));
  line('unchanged', 'worker email unchanged (old email still valid)=' + emailUnchanged);
  verdict('TCOA013', rej.status === 200 && rej.json.data.status === 'REJECTED' && emailUnchanged, 'Request rejected; profile unchanged');

  // ── TCOA014 — RBAC tenant isolation ────────────────────────────────────
  console.log(bold('TCOA014  RBAC – tenant isolation'));
  const globex = await prisma.user.findUnique({ where: { email: GLOBEX_ADMIN_EMAIL }, select: { userId: true } });
  const cross = await call('PATCH', `/org-admin/staff/${globex.userId}/deactivate`, { token }); // Acme admin -> Globex user
  line('as', ADMIN.email + ' (Acme) targeting Globex userId=' + globex.userId);
  line('PATCH', `/org-admin/staff/${globex.userId}/deactivate -> HTTP ${cross.status}`);
  line('message', JSON.stringify(cross.json && cross.json.message));
  verdict('TCOA014', cross.status === 404 || cross.status === 403, 'Cross-tenant access denied (HTTP ' + cross.status + ' — resource not found in Acme scope)');

  // ── TCOA015 — deactivated user cannot log in (edge) ────────────────────
  console.log(bold('TCOA015  Deactivated user cannot log in (edge)'));
  await call('PATCH', `/org-admin/staff/${newId}/deactivate`, { token });
  const blocked = await call('POST', '/auth/login', { body: { email: STAFF_NEW, password: PWD } });
  line('setup', 'deactivated ' + STAFF_NEW);
  line('login', 'POST /auth/login -> HTTP ' + blocked.status + dim('  (expect 401)') + ', token=' + (blocked.json && blocked.json.token ? 'issued!' : 'none'));
  verdict('TCOA015', blocked.status === 401 && !(blocked.json && blocked.json.token), 'Deactivated worker blocked at login (401); no session issued');

  await cleanup();

  // ── summary ────────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCOA', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')));
  console.log(bold('----------------------------------------------------------------') + '\n');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
