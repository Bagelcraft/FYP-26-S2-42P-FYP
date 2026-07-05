/**
 * System Test runner — System Admin / Auth cases TCSA001–TCSA004.
 *
 * Prints a clean, screenshot-friendly PASS/FAIL report to the terminal for
 * use as execution evidence (FYP-26-S2-42P).
 *
 * Prereqs: the API server must be running (npm run dev) and the Appendix A
 * seed account must exist (node prisma/seed-test-accounts.js).
 *
 * Usage:
 *   node scripts/test-auth.js
 *   npm run test:auth
 *   API_URL=http://localhost:5000 node scripts/test-auth.js   (override target)
 */

const BASE = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api/v1';
const EMAIL = 'sysadmin@sta.test';
const PASS = 'Passw0rd!';
const NEWPASS = 'Passw0rd!2';

// ── tiny terminal helpers ────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => c('32', s);
const red = (s) => c('31', s);
const dim = (s) => c('90', s);
const bold = (s) => c('1', s);
const PASS_TAG = () => green('  PASS  ');
const FAIL_TAG = () => red('  FAIL  ');

let allPass = true;
const results = [];

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

function line(label, value) {
  console.log('   ' + dim(label.padEnd(14)) + value);
}

function verdict(id, ok, checks) {
  const tag = ok ? PASS_TAG() : FAIL_TAG();
  console.log('   ' + tag + '  ' + checks);
  console.log('');
  results.push({ id, ok });
  if (!ok) allPass = false;
}

async function main() {
  console.log('');
  console.log(bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  System Admin / Auth'));
  console.log(' Cases   : TCSA001, TCSA002, TCSA003, TCSA004');
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + EMAIL + '  (Appendix A)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================'));
  console.log('');

  // reachability check
  try {
    await fetch((process.env.API_URL || 'http://localhost:5000') + '/api/health');
  } catch {
    console.log(red('ERROR: cannot reach the API server at ' + BASE));
    console.log('Start it first:  cd server && npm run dev');
    process.exit(1);
  }

  // ── TCSA001 — valid login ──────────────────────────────────────────────
  console.log(bold('TCSA001  Login – System Admin') + dim('   (expect 200 + token)'));
  const r1 = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASS } });
  const t1 = r1.json || {};
  const hashLeaked = !!(t1.user && 'password_hash' in t1.user);
  line('POST', '/auth/login  {password: Passw0rd!}');
  line('HTTP', r1.status + (r1.status === 200 ? ' OK' : ''));
  line('token', t1.token ? green('issued') : red('missing'));
  line('role', (t1.user && t1.user.user_type) || '-');
  line('hash leak', hashLeaked ? red('YES') : green('no'));
  const ok1 = r1.status === 200 && !!t1.token && t1.user?.user_type === 'SYSTEM_ADMIN' && !hashLeaked;
  const token = t1.token;
  verdict('TCSA001', ok1, 'HTTP 200, JWT issued, role SYSTEM_ADMIN, no password hash returned');

  // ── TCSA002 — invalid credentials ──────────────────────────────────────
  console.log(bold('TCSA002  Login – invalid credentials') + dim('   (expect 401, no token)'));
  const r2 = await call('POST', '/auth/login', { body: { email: EMAIL, password: 'WrongPass!' } });
  const t2 = r2.json || {};
  line('POST', '/auth/login  {password: WrongPass!}');
  line('HTTP', r2.status + (r2.status === 401 ? ' Unauthorized' : ''));
  line('message', JSON.stringify(t2.message));
  line('token', t2.token ? red('issued!') : green('none'));
  const ok2 = r2.status === 401 && !t2.token && /invalid email or password/i.test(t2.message || '');
  verdict('TCSA002', ok2, 'HTTP 401, "Invalid email or password", no token issued');

  // ── TCSA003 — logout ───────────────────────────────────────────────────
  console.log(bold('TCSA003  Logout') + dim('   (expect logout 200; protected route 401 without token)'));
  const r3a = await call('POST', '/auth/logout', { token });
  const r3b = await call('GET', '/admin/organisations'); // no token
  line('POST', '/auth/logout            -> HTTP ' + r3a.status);
  line('GET', '/admin/organisations    -> HTTP ' + r3b.status + '  (no token)');
  line('message', JSON.stringify(r3b.json && r3b.json.message));
  const ok3 = r3a.status === 200 && r3b.status === 401;
  verdict('TCSA003', ok3, 'Logout 200; unauthenticated request blocked with 401');
  console.log('   ' + dim('note: token is a stateless JWT — server does not invalidate it on logout;'));
  console.log('   ' + dim('      session ends because the client discards the token.'));
  console.log('');

  // ── TCSA004 — change password ──────────────────────────────────────────
  console.log(bold('TCSA004  Change password (authenticated)') + dim('   (expect new works, old rejected)'));
  const login4 = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASS } });
  const tok4 = (login4.json || {}).token;
  const chg = await call('POST', '/auth/change-password', { token: tok4, body: { currentPassword: PASS, newPassword: NEWPASS } });
  const oldTry = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASS } });
  const newTry = await call('POST', '/auth/login', { body: { email: EMAIL, password: NEWPASS } });
  line('change pwd', 'HTTP ' + chg.status + '  (' + PASS + ' -> ' + NEWPASS + ')');
  line('login old', 'HTTP ' + oldTry.status + dim('  (expect 401)'));
  line('login new', 'HTTP ' + newTry.status + dim('  (expect 200)'));
  const ok4 = chg.status === 200 && oldTry.status === 401 && newTry.status === 200;
  verdict('TCSA004', ok4, 'Password changed; old rejected (401); new accepted (200)');

  // ── fixture cleanup: restore password to Passw0rd! ─────────────────────
  const tokNew = (newTry.json || {}).token;
  if (tokNew) {
    await call('POST', '/auth/change-password', { token: tokNew, body: { currentPassword: NEWPASS, newPassword: PASS } });
  }
  const restored = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASS } });
  console.log('   ' + dim('fixture restored: login with ' + PASS + ' -> HTTP ' + restored.status + (restored.status === 200 ? ' (OK)' : ' (!!)')));
  console.log('');

  // ── summary ────────────────────────────────────────────────────────────
  console.log(bold('----------------------------------------------------------------'));
  const summary = results.map((r) => r.id + ' ' + (r.ok ? green('PASS') : red('FAIL'))).join('   ');
  console.log(' SUMMARY:  ' + summary);
  console.log(bold('----------------------------------------------------------------'));
  console.log('');

  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(red('Runner error: ' + e.message));
  process.exit(1);
});
