/**
 * System Test runner — System Admin cases TCSA005–TCSA020.
 *
 * Black-box tests over the live API (screenshot-friendly PASS/FAIL report).
 * Test artifacts that have no delete endpoint (approved org+admin, fixture org)
 * are cleaned up via Prisma at start and end, so the runner is repeatable.
 *
 * Prereqs: API server running (npm run dev) + App. A accounts (npm run seed:test).
 * Usage:   node scripts/test-admin.js   |   npm run test:admin
 */

const prisma = require('../src/config/prisma');

const HOST = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = HOST + '/api/v1';
const ADMIN = { email: 'sysadmin@sta.test', password: 'Passw0rd!' };
const WORKER = { email: 'perm@acme.test', password: 'Passw0rd!' };

// deterministic names so cleanup can find them
const FIXTURE_ORG = 'STA-TEST-FixtureOrg';
const PLAN_MAIN = 'STA-TEST-Plan';
const PLAN_TEMP = 'STA-TEST-TempPlan';
const REG_OK = { email: 'sta-test-approve@reg.test', company: 'STA-TEST-NewCo' };
const REG_NO = { email: 'sta-test-reject@reg.test', company: 'STA-TEST-SpamCo' };
const ENQ_EMAIL = 'sta-test-enq@enq.test';

// ── terminal helpers ──────────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR;
const col = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const green = (s) => col('32', s), red = (s) => col('31', s), yellow = (s) => col('33', s);
const dim = (s) => col('90', s), bold = (s) => col('1', s);
const results = [];
function line(l, v) { console.log('   ' + dim(String(l).padEnd(12)) + v); }
function verdict(id, ok, note) {
  const tag = ok ? green('  PASS  ') : red('  FAIL  ');
  console.log('   ' + tag + '  ' + note);
  console.log('');
  results.push({ id, ok });
}

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function loginToken(creds) {
  const r = await call('POST', '/auth/login', { body: creds });
  return r.json && r.json.token;
}

async function cleanup() {
  try { await prisma.contactEnquiry.deleteMany({ where: { email: ENQ_EMAIL } }); } catch {}
  try { await prisma.unregisteredUser.deleteMany({ where: { email: { in: [REG_OK.email, REG_NO.email] } } }); } catch {}
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { name: { startsWith: 'STA-TEST-' } }, select: { plan_id: true } });
    for (const p of plans) {
      await prisma.planFeature.deleteMany({ where: { plan_id: p.plan_id } });
      await prisma.subscriptionPlan.delete({ where: { plan_id: p.plan_id } });
    }
  } catch {}
  try {
    const orgs = await prisma.organisation.findMany({ where: { name: { startsWith: 'STA-TEST-' } }, select: { organisation_id: true } });
    for (const o of orgs) {
      await prisma.user.deleteMany({ where: { organisationId: o.organisation_id } });
      await prisma.organisation.delete({ where: { organisation_id: o.organisation_id } });
    }
  } catch {}
}

async function main() {
  console.log('');
  console.log(bold('================================================================'));
  console.log(bold(' FYP-26-S2-42P  System Test Execution  —  System Admin (TCSA005–020)'));
  console.log(' Target  : ' + BASE);
  console.log(' Account : ' + ADMIN.email + '  (Appendix A)');
  console.log(' Run at  : ' + new Date().toLocaleString());
  console.log(bold('================================================================'));
  console.log('');

  try { await fetch(HOST + '/api/health'); }
  catch { console.log(red('ERROR: API not reachable at ' + BASE + ' — start it with: cd server && npm run dev')); process.exit(1); }

  await cleanup(); // clear leftovers from any previous run
  const token = await loginToken(ADMIN);
  if (!token) { console.log(red('ERROR: could not log in as SYSTEM_ADMIN — run: npm run seed:test')); process.exit(1); }

  // ── TCSA005 — list organisations ─────────────────────────────────────────
  console.log(bold('TCSA005  View all organizations'));
  const r5 = await call('GET', '/admin/organisations', { token });
  const orgs = (r5.json && r5.json.data) || [];
  line('GET', '/admin/organisations -> HTTP ' + r5.status);
  line('count', orgs.length + ' orgs: ' + orgs.map((o) => o.name).join(', '));
  verdict('TCSA005', r5.status === 200 && orgs.length >= 2, 'HTTP 200; ' + orgs.length + ' organisations listed');

  // ── TCSA006 — search / filter (client-side) ─────────────────────────────
  console.log(bold('TCSA006  Search / filter organizations') + dim('   (client-side filter)'));
  const term = 'Acme';
  const filtered = orgs.filter((o) => o.name.toLowerCase().includes(term.toLowerCase()));
  line('filter', 'search="' + term + '" applied to API data (UI logic)');
  line('result', filtered.length + ' match: ' + filtered.map((o) => o.name).join(', '));
  const ok6 = filtered.length >= 1 && filtered.every((o) => o.name.toLowerCase().includes('acme'));
  verdict('TCSA006', ok6, 'Filter returns only matching orgs (NOTE: filtering is client-side; API has no search param)');

  // ── TCSA007 / 008 — suspend & reactivate ────────────────────────────────
  let fixture = orgs.find((o) => o.name === FIXTURE_ORG);
  if (!fixture) {
    const c = await call('POST', '/admin/organisations', { token, body: { name: FIXTURE_ORG } });
    fixture = c.json && c.json.data;
  }
  const fid = fixture.organisation_id;
  console.log(bold('TCSA007  Suspend an organization'));
  const r7 = await call('PUT', `/admin/organisations/${fid}/suspend`, { token });
  line('PUT', `/admin/organisations/${fid}/suspend -> HTTP ${r7.status}`);
  line('isActive', String(r7.json && r7.json.data && r7.json.data.isActive) + dim('  (expect false)'));
  verdict('TCSA007', r7.status === 200 && r7.json.data.isActive === false, 'Org status set to Suspended (isActive=false)');

  console.log(bold('TCSA008  Reactivate a suspended organization'));
  const r8 = await call('PUT', `/admin/organisations/${fid}/reactivate`, { token });
  line('PUT', `/admin/organisations/${fid}/reactivate -> HTTP ${r8.status}`);
  line('isActive', String(r8.json && r8.json.data && r8.json.data.isActive) + dim('  (expect true)'));
  verdict('TCSA008', r8.status === 200 && r8.json.data.isActive === true, 'Org reactivated (isActive=true). NOTE: login does not check org.isActive');

  // ── TCSA009 — approve registration ──────────────────────────────────────
  console.log(bold('TCSA009  Approve organization registration'));
  await call('POST', '/public/organisations/register', { body: { full_name: 'STA Approve', email: REG_OK.email, password: 'Passw0rd!', company_name: REG_OK.company, position: 'Owner' } });
  const regs1 = await call('GET', '/admin/registrations', { token });
  const pend = (regs1.json.data || []).find((r) => r.email === REG_OK.email);
  const ap = pend ? await call('POST', `/admin/registrations/${pend.marketing_user_id}/approve`, { token }) : { status: 0, json: {} };
  line('register', 'pending created for ' + REG_OK.email);
  line('approve', `POST /admin/registrations/${pend ? pend.marketing_user_id : '?'}/approve -> HTTP ${ap.status}`);
  line('provisioned', 'user_type=' + (ap.json.data && ap.json.data.user_type) + ', org set=' + !!(ap.json.data && ap.json.data.organisationId));
  verdict('TCSA009', ap.status === 201 && ap.json.data.user_type === 'ORG_ADMIN' && !!ap.json.data.organisationId, 'Registration approved; ORG_ADMIN + organisation provisioned');

  // ── TCSA010 — reject registration ───────────────────────────────────────
  console.log(bold('TCSA010  Reject organization registration'));
  await call('POST', '/public/organisations/register', { body: { full_name: 'STA Reject', email: REG_NO.email, password: 'Passw0rd!', company_name: REG_NO.company } });
  const regs2 = await call('GET', '/admin/registrations', { token });
  const pend2 = (regs2.json.data || []).find((r) => r.email === REG_NO.email);
  const rj = pend2 ? await call('POST', `/admin/registrations/${pend2.marketing_user_id}/reject`, { token }) : { status: 0 };
  const regs3 = await call('GET', '/admin/registrations', { token });
  const stillThere = (regs3.json.data || []).some((r) => r.email === REG_NO.email);
  line('reject', `POST /admin/registrations/${pend2 ? pend2.marketing_user_id : '?'}/reject -> HTTP ${rj.status}`);
  line('removed', String(!stillThere) + dim('  (expect true)'));
  verdict('TCSA010', rj.status === 204 && !stillThere, 'Registration rejected (204); removed from pending list; no org created');

  // ── TCSA011 — create plan ───────────────────────────────────────────────
  console.log(bold('TCSA011  Create subscription plan'));
  const r11 = await call('POST', '/admin/plans', { token, body: { name: PLAN_MAIN, price_monthly: 99, price_annual: 990, description: 'evidence', max_users: 50 } });
  const planId = r11.json && r11.json.data && r11.json.data.plan_id;
  line('POST', '/admin/plans {name:' + PLAN_MAIN + ', price_monthly:99} -> HTTP ' + r11.status);
  line('plan_id', String(planId));
  verdict('TCSA011', r11.status === 201 && !!planId && r11.json.data.name === PLAN_MAIN, 'Plan created (HTTP 201) and returned with plan_id');

  // ── TCSA012 — update plan ───────────────────────────────────────────────
  console.log(bold('TCSA012  Update subscription plan'));
  const r12 = await call('PATCH', `/admin/plans/${planId}`, { token, body: { price_monthly: 89 } });
  const newPrice = Number(r12.json && r12.json.data && r12.json.data.price_monthly);
  line('PATCH', `/admin/plans/${planId} {price_monthly: 89} -> HTTP ${r12.status}`);
  line('price', '99 -> ' + newPrice);
  verdict('TCSA012', r12.status === 200 && newPrice === 89, 'Plan updated; price_monthly is now 89');

  // ── TCSA013 — deactivate & reactivate plan ──────────────────────────────
  console.log(bold('TCSA013  Deactivate & reactivate plan'));
  const d13 = await call('PATCH', `/admin/plans/${planId}/deactivate`, { token });
  const pricingOff = await call('GET', '/public/pricing');
  const hiddenWhenOff = !(pricingOff.json.data || []).some((p) => p.plan_id === planId);
  const a13 = await call('PATCH', `/admin/plans/${planId}/reactivate`, { token });
  const pricingOn = await call('GET', '/public/pricing');
  const shownWhenOn = (pricingOn.json.data || []).some((p) => p.plan_id === planId);
  line('deactivate', 'HTTP ' + d13.status + ', is_active=' + (d13.json.data && d13.json.data.is_active) + ', hidden from pricing=' + hiddenWhenOff);
  line('reactivate', 'HTTP ' + a13.status + ', is_active=' + (a13.json.data && a13.json.data.is_active) + ', shown in pricing=' + shownWhenOn);
  verdict('TCSA013', d13.status === 200 && d13.json.data.is_active === false && hiddenWhenOff && a13.status === 200 && a13.json.data.is_active === true && shownWhenOn, 'Deactivated plan hidden from public pricing; reactivation restores it');

  // ── TCSA014 — add & remove feature ──────────────────────────────────────
  console.log(bold('TCSA014  Add & remove plan feature'));
  const addF = await call('POST', `/admin/plans/${planId}/features`, { token, body: { feature_name: 'Advanced Reports' } });
  const featId = addF.json && addF.json.data && addF.json.data.feature_id;
  const afterAdd = await call('GET', `/admin/plans/${planId}`, { token });
  const hasFeat = (afterAdd.json.data.features || []).some((f) => f.feature_id === featId);
  const delF = await call('DELETE', `/admin/plans/${planId}/features/${featId}`, { token });
  const afterDel = await call('GET', `/admin/plans/${planId}`, { token });
  const goneFeat = !(afterDel.json.data.features || []).some((f) => f.feature_id === featId);
  line('add', 'HTTP ' + addF.status + ', feature_id=' + featId + ', present after add=' + hasFeat);
  line('remove', 'HTTP ' + delF.status + ', absent after remove=' + goneFeat);
  verdict('TCSA014', addF.status === 201 && hasFeat && delF.status === 204 && goneFeat, 'Feature added (201, listed) then removed (204, gone)');

  // ── TCSA015 — delete plan ───────────────────────────────────────────────
  console.log(bold('TCSA015  Delete plan'));
  const tmp = await call('POST', '/admin/plans', { token, body: { name: PLAN_TEMP, price_monthly: 0, price_annual: 0 } });
  const tmpId = tmp.json.data.plan_id;
  const del = await call('DELETE', `/admin/plans/${tmpId}`, { token });
  const getGone = await call('GET', `/admin/plans/${tmpId}`, { token });
  line('create temp', 'plan_id=' + tmpId);
  line('delete', 'HTTP ' + del.status + '; GET after delete -> HTTP ' + getGone.status + dim('  (expect 404)'));
  verdict('TCSA015', del.status === 204 && getGone.status === 404, 'Plan deleted (204); subsequent GET returns 404');

  // ── TCSA016 — metrics dashboard (NOT IMPLEMENTED) ───────────────────────
  console.log(bold('TCSA016  Platform metrics dashboard'));
  const activeOrgs = orgs.filter((o) => o.isActive).length;
  line('data avail', 'API /admin/organisations shows ' + activeOrgs + ' active orgs (real data exists)');
  line('dashboard', 'AdminDashboard.jsx has NO API call — stat cards are hardcoded (ACTIVE ORGS "3", etc.)');
  verdict('TCSA016', false, red('FAIL — no metrics endpoint; dashboard shows static mock data, not seeded totals'));

  // ── TCSA017 — RBAC admin route blocked for non-admin ────────────────────
  console.log(bold('TCSA017  RBAC – admin routes blocked for non-admin'));
  const wTok = await loginToken(WORKER);
  const r17 = await call('GET', '/admin/organisations', { token: wTok });
  line('as', WORKER.email + ' (PERMANENT_WORKER)');
  line('GET', '/admin/organisations -> HTTP ' + r17.status + dim('  (expect 403)'));
  line('message', JSON.stringify(r17.json && r17.json.message));
  verdict('TCSA017', r17.status === 403 && /insufficient permissions/i.test((r17.json && r17.json.message) || ''), 'HTTP 403 "Access denied: insufficient permissions"');

  // ── TCSA018 — manage landing content ────────────────────────────────────
  console.log(bold('TCSA018  Manage landing content'));
  const c0 = await call('GET', '/admin/content', { token });
  const orig = c0.json.content || {};
  const newTitle = 'STA-TEST Hero ' + Date.now();
  const up = await call('PUT', '/admin/content/hero', { token, body: { hero_title: newTitle, hero_subtitle: orig.hero_subtitle, hero_image_url: orig.hero_image_url } });
  const c1 = await call('GET', '/admin/content', { token });
  const persisted = c1.json.content && c1.json.content.hero_title === newTitle;
  // restore original hero
  await call('PUT', '/admin/content/hero', { token, body: { hero_title: orig.hero_title, hero_subtitle: orig.hero_subtitle, hero_image_url: orig.hero_image_url } });
  line('PUT', '/admin/content/hero {hero_title:"' + newTitle + '"} -> HTTP ' + up.status);
  line('persisted', String(persisted) + dim('  (re-fetched hero_title matches; original restored after)'));
  verdict('TCSA018', up.status === 200 && persisted, 'Hero content updated and persisted (change reflected on re-fetch)');

  // ── TCSA019 — view & update enquiries ───────────────────────────────────
  console.log(bold('TCSA019  View & update enquiries'));
  const enq = await call('POST', '/public/enquiry', { body: { email: ENQ_EMAIL, subject: 'STA Test Enquiry', message: 'evidence run' } });
  const enqId = enq.json && enq.json.enquiry_id;
  const listE = await call('GET', '/admin/enquiries', { token });
  const inList = Array.isArray(listE.json) && listE.json.some((e) => e.enquiry_id === enqId);
  const resp = await call('PATCH', `/admin/enquiries/${enqId}/respond`, { token, body: { response_message: 'Handled by test' } });
  line('create', 'POST /public/enquiry -> HTTP ' + enq.status + ', enquiry_id=' + enqId);
  line('list', 'GET /admin/enquiries -> HTTP ' + listE.status + ', contains new enquiry=' + inList);
  line('respond', 'PATCH .../respond -> HTTP ' + resp.status + ', status=' + (resp.json && resp.json.status));
  verdict('TCSA019', enq.status === 201 && inList && resp.status === 200 && resp.json.status === 'RESPONDED', 'Enquiry listed; status update persisted (RESPONDED)');

  // ── TCSA020 — view audit logs ───────────────────────────────────────────
  console.log(bold('TCSA020  View audit logs'));
  const r20 = await call('GET', '/admin/logs', { token });
  const entries = (r20.json && r20.json.data) || [];
  line('GET', '/admin/logs -> HTTP ' + r20.status);
  line('entries', entries.length + ' log entries; sample: ' + (entries[0] ? '"' + entries[0].action + '"' : 'none'));
  verdict('TCSA020', r20.status === 200 && entries.length >= 1, 'Audit log returns ' + entries.length + ' recent entries');

  await cleanup(); // tidy up test artifacts

  // ── summary ──────────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(bold('----------------------------------------------------------------'));
  console.log(' SUMMARY:  ' + results.map((r) => r.id.replace('TCSA', '') + (r.ok ? green('✓') : red('✗'))).join(' '));
  console.log('           ' + green(pass + ' PASS') + '   ' + (fail ? red(fail + ' FAIL') : dim('0 FAIL')) +
    dim('   (TCSA016 fails by design — metrics dashboard not implemented)'));
  console.log(bold('----------------------------------------------------------------'));
  console.log('');
}

main()
  .catch((e) => { console.error(red('Runner error: ' + e.message)); process.exitCode = 1; })
  .finally(async () => { try { await cleanup(); } catch {} await prisma.$disconnect(); });
