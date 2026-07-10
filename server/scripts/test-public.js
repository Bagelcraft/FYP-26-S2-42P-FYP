/**
 * System Test runner — Public Site cases TCPS001–TCPS009.
 *
 * Black-box tests over the live API (no auth for public routes). Reset tokens
 * are minted with the server's JWT_SECRET (the real token is emailed, not
 * returned). Self-cleaning and repeatable; restores perm@acme.test password.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-public.js   |   npm run test:public
 */

require('dotenv').config();
const prisma = require('../src/config/prisma');
const jwt = require('jsonwebtoken');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const PLAN = 'STA-TEST Public Plan';
const NEWCO = { email: 'admin@newco.test', company: 'STA-TEST NewCo' };
const ENQ_EMAIL = 'jane@x.test';
const RESET_PW = 'Passw0rd!3';
const ORIG_PW = 'Passw0rd!';

// ── terminal helpers ──────────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR;
const c = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const green = (s) => c('32', s), red = (s) => c('31', s), dim = (s) => c('90', s), bold = (s) => c('1', s);
const results = [];
function line(l, v) { console.log('   ' + dim(String(l).padEnd(12)) + v); }
function verdict(id, ok, note) { console.log('   ' + (ok ? green('  PASS  ') : red('  FAIL  ')) + '  ' + note + '\n'); results.push({ id, ok }); }

async function call(method, path, { body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const resetToken = (userId, opts) => jwt.sign({ userId, type: 'password_reset' }, process.env.JWT_SECRET, opts);

async function cleanup() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { name: { startsWith: 'STA-TEST' } }, select: { plan_id: true } });
    for (const p of plans) { await prisma.planFeature.deleteMany({ where: { plan_id: p.plan_id } }); await prisma.subscriptionPlan.delete({ where: { plan_id: p.plan_id } }); }
    await prisma.unregisteredUser.deleteMany({ where: { email: NEWCO.email } });
    await prisma.contactEnquiry.deleteMany({ where: { email: ENQ_EMAIL } });
  } catch {}
}

async function main() {
  console.log('\n' + bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  Public Site (TCPS001–009)'));
  console.log(' Target  : ' + BASE);
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================') + '\n');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable — run: cd server && npm run dev')); process.exit(1); }
  if (!process.env.JWT_SECRET) { console.log(red('ERROR: JWT_SECRET not loaded from server/.env')); process.exit(1); }

  await cleanup();
  // setup: an active plan so /public/pricing has data; perm id for reset tests
  await prisma.subscriptionPlan.create({ data: { name: PLAN, price_monthly: 29, price_annual: 290, features: { create: [{ feature_name: 'Basic Reports' }] } } });
  const perm = await prisma.user.findUnique({ where: { email: 'perm@acme.test' }, select: { userId: true } });

  // ── TCPS001 — view landing / features ───────────────────────────────────
  console.log(bold('TCPS001  View landing / features'));
  const feat = await call('GET', '/public/features');
  line('GET', '/public/features (no auth) -> HTTP ' + feat.status + ', items=' + ((feat.json && feat.json.data || []).length));
  verdict('TCPS001', feat.status === 200 && Array.isArray(feat.json && feat.json.data), 'Public features load without a session (no protected data)');

  // ── TCPS002 — view pricing / plans ──────────────────────────────────────
  console.log(bold('TCPS002  View pricing / plans'));
  const pr = await call('GET', '/public/pricing');
  const plan = (pr.json && pr.json.data || []).find((p) => p.name === PLAN);
  line('GET', '/public/pricing -> HTTP ' + pr.status + ', plans=' + ((pr.json && pr.json.data || []).length));
  line('plan', plan ? ('"' + plan.name + '" $' + plan.price_monthly + '/mo, features=' + (plan.features || []).length) : 'seeded plan not found');
  verdict('TCPS002', pr.status === 200 && !!plan && (plan.features || []).length >= 1, 'Published plans display with prices and features');

  // ── TCPS003 — organisation self-registration ────────────────────────────
  console.log(bold('TCPS003  Organization self-registration'));
  const reg = await call('POST', '/public/organisations/register', { body: { full_name: 'STA NewCo Admin', email: NEWCO.email, password: ORIG_PW, company_name: NEWCO.company, position: 'Owner' } });
  const pending = await prisma.unregisteredUser.findFirst({ where: { email: NEWCO.email } });
  line('POST', '/public/organisations/register -> HTTP ' + reg.status);
  line('pending', 'unregisteredUser row created=' + !!pending + (pending ? ' (role=' + pending.role + ')' : ''));
  verdict('TCPS003', reg.status === 201 && !!pending, 'Registration submitted; enters pending-approval state (approved at TCSA009)');

  // ── TCPS004 — select subscription during onboarding (STUB) ──────────────
  console.log(bold('TCPS004  Select subscription during onboarding'));
  const sub = await call('POST', '/public/organisations/1/subscription', { body: { plan: 'Starter' } });
  line('POST', '/public/organisations/1/subscription -> HTTP ' + sub.status);
  line('body', JSON.stringify(sub.json));
  verdict('TCPS004', false, red('FAIL — endpoint is a stub ("to be implemented"); no subscription is recorded against the org.'));

  // ── TCPS005 — duplicate email rejected (negative) ───────────────────────
  console.log(bold('TCPS005  Registration – duplicate email rejected (negative)'));
  const dup = await call('POST', '/public/organisations/register', { body: { full_name: 'Dup', email: 'admin@acme.test', password: ORIG_PW, company_name: 'Dup Co' } });
  line('POST', '/public/organisations/register {existing admin@acme.test} -> HTTP ' + dup.status);
  line('message', JSON.stringify(dup.json && dup.json.message));
  verdict('TCPS005', dup.status === 409, 'Duplicate email rejected (HTTP 409); no duplicate account created');

  // ── TCPS006 — submit enquiry ────────────────────────────────────────────
  console.log(bold('TCPS006  Submit enquiry / contact form'));
  const enq = await call('POST', '/public/enquiry', { body: { name: 'Jane', email: ENQ_EMAIL, subject: 'STA-TEST Enquiry', message: 'Demo please' } });
  line('POST', '/public/enquiry -> HTTP ' + enq.status + ', enquiry_id=' + (enq.json && enq.json.enquiry_id));
  verdict('TCPS006', enq.status === 201 && !!(enq.json && enq.json.enquiry_id), 'Enquiry captured (created for admin — see TCSA019)');

  // ── TCPS007 — forgot password (request reset) ───────────────────────────
  console.log(bold('TCPS007  Forgot password – request reset'));
  const fp = await call('POST', '/auth/forgot-password', { body: { email: 'perm@acme.test' } });
  line('POST', '/auth/forgot-password -> HTTP ' + fp.status);
  line('message', JSON.stringify(fp.json && fp.json.message));
  verdict('TCPS007', fp.status === 200, 'Reset request accepted (HTTP 200). NOTE: token is emailed, not returned (anti-enumeration).');

  // ── TCPS008 — reset password with valid token ───────────────────────────
  console.log(bold('TCPS008  Reset password with valid token'));
  const validTok = resetToken(perm.userId, { expiresIn: '15m' });
  const rp = await call('POST', '/auth/reset-password', { body: { token: validTok, newPassword: RESET_PW } });
  const loginNew = await call('POST', '/auth/login', { body: { email: 'perm@acme.test', password: RESET_PW } });
  line('reset', 'POST /auth/reset-password (valid token) -> HTTP ' + rp.status);
  line('login', 'login with new password -> HTTP ' + loginNew.status);
  verdict('TCPS008', rp.status === 200 && loginNew.status === 200, 'Password reset; login succeeds with the new password');
  // restore original password
  const restoreTok = resetToken(perm.userId, { expiresIn: '15m' });
  await call('POST', '/auth/reset-password', { body: { token: restoreTok, newPassword: ORIG_PW } });
  const restored = await call('POST', '/auth/login', { body: { email: 'perm@acme.test', password: ORIG_PW } });
  console.log('   ' + dim('fixture restored: perm password back to Passw0rd! -> login HTTP ' + restored.status));
  console.log('');

  // ── TCPS009 — reset with expired token rejected (edge) ──────────────────
  console.log(bold('TCPS009  Reset password with expired token rejected (edge)'));
  const expTok = resetToken(perm.userId, { expiresIn: '-1m' }); // already expired
  const badReset = await call('POST', '/auth/reset-password', { body: { token: expTok, newPassword: 'Passw0rd!9' } });
  const stillOrig = await call('POST', '/auth/login', { body: { email: 'perm@acme.test', password: ORIG_PW } });
  line('reset', 'POST /auth/reset-password (expired token) -> HTTP ' + badReset.status + dim('  (expect 400)'));
  line('message', JSON.stringify(badReset.json && badReset.json.message));
  line('unchanged', 'login with original password still works -> HTTP ' + stillOrig.status);
  verdict('TCPS009', badReset.status === 400 && stillOrig.status === 200, 'Expired token rejected (HTTP 400); password unchanged');

  await cleanup();

  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCPS', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')) +
    dim('   (004 onboarding-subscription stub fails by design)'));
  console.log(bold('----------------------------------------------------------------') + '\n');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
