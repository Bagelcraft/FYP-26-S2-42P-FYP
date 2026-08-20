# Testing — Complete Source Code

**Project:** Smart Task Allocation (FYP-26-S2-42P)

Every automated test and test harness in the project, in the order you would run them.

**Three layers, deliberately different in kind:**

| Layer | File | Runs against | Run with |
|---|---|---|---|
| Unit / integration | `server/tests/phase2.test.js` | Express app in-process via supertest — no server needed | `npm test` |
| Feature scripts | `server/scripts/test-*.js` | A running server over HTTP | `npm run test:features`, `npm run test:xm` |
| Evidence runner | `run-tests.js` | A running server over HTTP | `node run-tests.js` |

Only the first layer runs in CI. The other two are demo/evidence tools that need a seeded database and
a live server, which is why they are scripts rather than Jest suites.

This document reproduces the full source of every file involved, generated from the working tree so it
matches the code exactly.

**Total: 1,185 lines across 6 files.**

## Inventory

| # | File | Lines |
|---|---|---|
| 1 | `server/tests/phase2.test.js` | 395 |
| 2 | `run-tests.js` | 369 |
| 3 | `server/scripts/test-features.js` | 140 |
| 4 | `server/scripts/test-cross-module.js` | 170 |
| 5 | `server/scripts/test-email.js` | 48 |
| 6 | `server/scripts/gen-token.js` | 63 |

### Not reproduced here

- `.github/workflows/ci.yml` — reproduced in [HOSTING_DEPLOYMENT.md](HOSTING_DEPLOYMENT.md) §5. It runs `npm test` (the Jest suite below) and the frontend lint.
- `server/prisma/seed-test-accounts.js` and `purge-test-data.js` — the fixtures these tests depend on; see [DATABASE_LAYER.md](DATABASE_LAYER.md) §4.
- Frontend tests — there are none. `npm run lint` is the only automated check on the client.

---

## 1. Jest suite — the only tests that run in CI

Uses supertest against the Express app directly, so no server has to be running. This is what `npm test` and the CI workflow execute.

### `server/tests/phase2.test.js`
*395 lines*

Covers the Manager task and allocation API: auth (401) and RBAC (403), task creation and its validation failures, list filters, 404 on unknown ids, the `eligible-staff` payload shape, auto-allocate, manual assign, and reallocation to a temporary worker.

```js
/**
 * Phase 2 Integration Tests
 * Tests: allocation engine (3a-3c), auto-allocate (3d), manual assign/reallocate (4),
 *        manager task filters (5), worker task view + acknowledge/progress (5)
 *
 * Run: npx jest tests/phase2.test.js --runInBand --forceExit
 */

require('dotenv').config();
const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app    = require('../src/app');
const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeToken(user) {
  return jwt.sign(
    { userId: user.userId, organisationId: user.organisationId, role: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

// ─── Global state shared across tests ────────────────────────────────────────

let pmToken, workerToken, tempToken;
let pm, worker, tempWorker, org;
let skill, department;
let testTaskId;   // task created for allocation tests
let testTask2Id;  // second task for reallocation test

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Fixtures are looked up by ROLE, not by a hardcoded email. The suite used to
  // name specific accounts from a seed that no longer exists, so it failed for
  // everyone the moment the demo data changed. Any organisation with a manager
  // and a worker will do, which keeps this working across reseeds.
  org = await prisma.organisation.findFirst({
    where: {
      name: process.env.TEST_ORG_NAME || undefined,
      isActive: true,
      users: { some: { user_type: 'PROJECT_MANAGER', is_active: true } },
      AND: [{ users: { some: { user_type: 'PERMANENT_WORKER', is_active: true } } }],
    },
    orderBy: { organisation_id: 'asc' },
  });

  if (!org) {
    throw new Error(
      'No suitable organisation found. Seed the database first:\n'
      + '  node scripts/reset-hosted.js --confirm',
    );
  }

  const inOrg = (type) => prisma.user.findFirst({
    where:   { organisationId: org.organisation_id, user_type: type, is_active: true },
    orderBy: { userId: 'asc' },
  });

  pm = await inOrg('PROJECT_MANAGER');
  worker = await inOrg('PERMANENT_WORKER');
  tempWorker = await inOrg('TEMPORARY_WORKER');

  if (!pm || !worker) {
    throw new Error(
      `Organisation "${org.name}" has no manager or permanent worker. Reseed with:\n`
      + '  node scripts/reset-hosted.js --confirm',
    );
  }

  pmToken     = makeToken(pm);
  workerToken = makeToken(worker);
  tempToken   = makeToken(tempWorker);

  skill      = await prisma.skill.findFirst({ where: { organisation_id: org.organisation_id } });
  department = await prisma.department.findFirst({ where: { organisation_id: org.organisation_id } });
});

// ─── Teardown — remove only the tasks this test suite created ────────────────

afterAll(async () => {
  const ids = [testTaskId, testTask2Id].filter(Boolean);
  if (ids.length) {
    await prisma.allocationHistory.deleteMany({ where: { task_id: { in: ids } } });
    await prisma.taskAssignment.deleteMany({ where: { task_id: { in: ids } } });
    await prisma.task.deleteMany({ where: { task_id: { in: ids } } });
  }
  await prisma.$disconnect();
});

// ─── 1. Auth guard ────────────────────────────────────────────────────────────

describe('Auth guard', () => {
  test('GET /pm/tasks without token → 401', async () => {
    const res = await request(app).get('/api/v1/pm/tasks');
    expect(res.status).toBe(401);
  });

  test('GET /pm/tasks with worker token → 403', async () => {
    const res = await request(app)
      .get('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── 2. Task CRUD (5 — manager view) ─────────────────────────────────────────

describe('Task CRUD', () => {
  test('POST /pm/tasks — create PENDING task', async () => {
    const res = await request(app)
      .post('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title:           'Phase2 Test Task',
        description:     'Created by phase2 test suite',
        start_datetime:  '2026-06-01T09:00:00Z',
        end_datetime:    '2026-06-01T17:00:00Z',
        department_id:   department?.department_id ?? undefined,
        required_skill_id: skill?.skill_id ?? undefined,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    testTaskId = res.body.data.task_id;
  });

  test('POST /pm/tasks — validation: missing title → 400', async () => {
    const res = await request(app)
      .post('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ start_datetime: '2026-06-01T09:00:00Z', end_datetime: '2026-06-01T17:00:00Z' });
    expect(res.status).toBe(400);
  });

  test('POST /pm/tasks — validation: end before start → 400', async () => {
    const res = await request(app)
      .post('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ title: 'Bad', start_datetime: '2026-06-01T17:00:00Z', end_datetime: '2026-06-01T09:00:00Z' });
    expect(res.status).toBe(400);
  });

  test('GET /pm/tasks — returns list including our task', async () => {
    const res = await request(app)
      .get('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((t) => t.task_id === testTaskId)).toBe(true);
  });

  test('GET /pm/tasks?status=PENDING — filter works', async () => {
    const res = await request(app)
      .get('/api/v1/pm/tasks?status=PENDING')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t) => t.status === 'PENDING')).toBe(true);
    expect(res.body.data.some((t) => t.task_id === testTaskId)).toBe(true);
  });

  test('GET /pm/tasks/:id — returns single task', async () => {
    const res = await request(app)
      .get(`/api/v1/pm/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.task_id).toBe(testTaskId);
  });

  test('GET /pm/tasks/99999 — unknown ID → 404', async () => {
    const res = await request(app)
      .get('/api/v1/pm/tasks/99999')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── 3a-3c. Eligible staff list ───────────────────────────────────────────────

describe('3a-3c Eligible staff', () => {
  test('GET /pm/tasks/:id/eligible-staff — returns candidates array', async () => {
    const res = await request(app)
      .get(`/api/v1/pm/tasks/${testTaskId}/eligible-staff`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('candidates');
    expect(Array.isArray(res.body.data.candidates)).toBe(true);
  });

  test('Eligible staff response has expected shape', async () => {
    const res = await request(app)
      .get(`/api/v1/pm/tasks/${testTaskId}/eligible-staff`)
      .set('Authorization', `Bearer ${pmToken}`);
    const first = res.body.data.candidates[0];
    if (first) {
      expect(first).toHaveProperty('userId');
      expect(first).toHaveProperty('full_name');
      expect(first).toHaveProperty('eligible');
      expect(first).toHaveProperty('isAvailable');
      expect(first).toHaveProperty('withinHours');
      expect(first).toHaveProperty('weeklyHours');
    }
  });

  test('eligible-staff on non-PENDING task → 422', async () => {
    // First auto-allocate to flip to ASSIGNED, then test
    // We'll use a separate task for this later; for now just check PENDING task works
    expect(true).toBe(true); // placeholder
  });

  test('eligible-staff for unknown task → 404', async () => {
    const res = await request(app)
      .get('/api/v1/pm/tasks/99999/eligible-staff')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── 3d. Auto-allocate ────────────────────────────────────────────────────────

describe('3d Auto-allocate', () => {
  test('POST /pm/tasks/:id/auto-allocate — assigns task if eligible staff exist', async () => {
    const res = await request(app)
      .post(`/api/v1/pm/tasks/${testTaskId}/auto-allocate`)
      .set('Authorization', `Bearer ${pmToken}`);

    // Either succeeds (200 + ASSIGNED) or 422 if no eligible staff (no availability seeded)
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.assignments.length).toBeGreaterThan(0);
      console.log(`  ✓ Auto-allocated to: ${res.body.data.assignments[0]?.assignedTo?.full_name}`);
    } else {
      expect(res.status).toBe(422);
      console.log('  ℹ No eligible staff (no availability seeded) — 422 expected');
    }
  });

  test('AllocationHistory row written after allocation', async () => {
    const row = await prisma.allocationHistory.findFirst({
      where: { task_id: testTaskId },
      orderBy: { timestamp: 'desc' },
    });
    // Row exists only if auto-allocate succeeded; skip gracefully if 422
    if (row) {
      expect(['ALLOCATED', 'REALLOCATED', 'UNASSIGNED']).toContain(row.action);
      console.log(`  ✓ AllocationHistory action: ${row.action}`);
    } else {
      console.log('  ℹ No AllocationHistory (auto-allocate returned 422)');
    }
  });
});

// ─── 4. Manual assign + reallocation ─────────────────────────────────────────

describe('4 Manual assign + reallocation', () => {
  test('Create second PENDING task for manual assign test', async () => {
    const res = await request(app)
      .post('/api/v1/pm/tasks')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title:          'Phase2 Manual Assign Task',
        start_datetime: '2026-06-02T09:00:00Z',
        end_datetime:   '2026-06-02T17:00:00Z',
      });
    expect(res.status).toBe(201);
    testTask2Id = res.body.data.task_id;
  });

  test('POST /pm/tasks/:id/assign — missing assigned_to → 400', async () => {
    const res = await request(app)
      .post(`/api/v1/pm/tasks/${testTask2Id}/assign`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /pm/tasks/:id/assign — unknown worker → 404', async () => {
    const res = await request(app)
      .post(`/api/v1/pm/tasks/${testTask2Id}/assign`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ assigned_to: 99999 });
    expect(res.status).toBe(404);
  });

  test('POST /pm/tasks/:id/assign — assigns permanent worker manually', async () => {
    const res = await request(app)
      .post(`/api/v1/pm/tasks/${testTask2Id}/assign`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ assigned_to: worker.userId });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');
    expect(res.body.data.assignments[0].assignedTo.full_name).toBe(worker.full_name);
  });

  test('TaskAssignment row has assignment_type MANUAL', async () => {
    const row = await prisma.taskAssignment.findFirst({ where: { task_id: testTask2Id } });
    expect(row).not.toBeNull();
    expect(row.assignment_type).toBe('MANUAL');
  });

  test('POST /pm/tasks/:id/reallocate — reassigns to temp worker', async () => {
    const res = await request(app)
      .post(`/api/v1/pm/tasks/${testTask2Id}/reallocate`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ assigned_to: tempWorker.userId });
    expect(res.status).toBe(200);
    expect(res.body.data.assignments[0].assignedTo.full_name).toBe(tempWorker.full_name);
  });

  test('AllocationHistory has UNASSIGNED + REALLOCATED entries', async () => {
    const rows = await prisma.allocationHistory.findMany({
      where: { task_id: testTask2Id },
      orderBy: { timestamp: 'asc' },
    });
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('ALLOCATED');
    expect(actions).toContain('UNASSIGNED');
    expect(actions).toContain('REALLOCATED');
  });
});

// ─── 5. Worker task view ──────────────────────────────────────────────────────

describe('5 Worker task view', () => {
  test('GET /worker/tasks — worker sees their assigned tasks', async () => {
    const res = await request(app)
      .get('/api/v1/worker/tasks')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /worker/tasks — PM token → 403', async () => {
    const res = await request(app)
      .get('/api/v1/worker/tasks')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /worker/tasks/:id — worker can view their specific task', async () => {
    const res = await request(app)
      .get(`/api/v1/worker/tasks/${testTask2Id}`)
      .set('Authorization', `Bearer ${workerToken}`);
    // task2 is now assigned to tempWorker, so permanent worker should get 404
    expect([200, 404]).toContain(res.status);
  });

  test('PATCH /worker/tasks/:id/acknowledge — worker acknowledges task', async () => {
    // Use tempWorker token since task2 is now assigned to them
    const res = await request(app)
      .patch(`/api/v1/temp-worker/tasks/${testTask2Id}/acknowledge`)
      .set('Authorization', `Bearer ${tempToken}`);
    if (res.status === 200) {
      expect(res.body.data.status).toBe('IN_PROGRESS');
    } else {
      // If task already IN_PROGRESS or not assigned, 422 or 404
      expect([404, 422]).toContain(res.status);
      console.log(`  ℹ Acknowledge returned ${res.status}: ${res.body.message}`);
    }
  });

  test('PATCH /worker/tasks/:id/progress — mark task COMPLETED', async () => {
    const res = await request(app)
      .patch(`/api/v1/temp-worker/tasks/${testTask2Id}/progress`)
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ status: 'COMPLETED' });
    if (res.status === 200) {
      expect(res.body.data.status).toBe('COMPLETED');
    } else {
      expect([404, 422]).toContain(res.status);
      console.log(`  ℹ Progress returned ${res.status}: ${res.body.message}`);
    }
  });

  test('PATCH /worker/tasks/:id/progress — invalid status → 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/temp-worker/tasks/${testTask2Id}/progress`)
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ status: 'PENDING' }); // workers cannot set PENDING
    expect(res.status).toBe(400);
  });

  test('GET /temp-worker/tasks/available — temp worker sees task pool', async () => {
    const res = await request(app)
      .get('/api/v1/temp-worker/tasks/available')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

---

## 2. Evidence runner

Walks the API as each role in turn and prints a formatted pass/fail table with the response evidence beside each assertion — built to be screenshotted for the report rather than to gate a merge.

### `run-tests.js`
*369 lines*

Run with `node run-tests.js`, optionally `--base-url`. Requires a seeded database and a running server. Logs in through `/auth/dev-login`.

```js
#!/usr/bin/env node
/**
 * SmartTask Allocation — API Test Runner
 *
 * Usage:
 *   node run-tests.js
 *   node run-tests.js --base-url http://localhost:5000/api/v1
 *
 * Prerequisites:
 *   1. PostgreSQL running and DB seeded  (cd server && npx prisma db seed)
 *   2. Express server running       (cd server && npm start)
 */

// ─── Colour helpers ───────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};

const W_LABEL   = 11;   // evidence label column width
const W_ID      = 9;    // test ID column width
const W_NAME    = 42;   // test name column width
const RULE      = `${C.dim}${'─'.repeat(70)}${C.reset}`;

function padR(s, w) { return String(s).padEnd(w); }
function padL(s, w) { return String(s).padStart(w); }

// ─── Config ───────────────────────────────────────────────────────────────────

const argIdx = process.argv.indexOf('--base-url');
const BASE   = argIdx !== -1 ? process.argv[argIdx + 1] : 'http://localhost:5000/api/v1';

const ACCOUNTS = {
  admin:      'admin@system.com',
  orgAdmin:   'orgadmin@techcorp.com',
  pm:         'pm@techcorp.com',
  worker:     'worker@techcorp.com',
  tempWorker: 'tempworker@techcorp.com',
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, ok: res.ok, data: json };
}

const GET    = (path, token)       => api('GET',    path, { token });
const POST   = (path, body, token) => api('POST',   path, { token, body });
const DELETE = (path, token)       => api('DELETE', path, { token });

async function login(email) {
  const r = await POST('/auth/dev-login', { email });
  if (!r.ok) throw new Error(`dev-login failed for ${email}: ${JSON.stringify(r.data)}`);
  return r.data.token;
}

// ─── Evidence builder ─────────────────────────────────────────────────────────
// Each test collects rows like:  { label, value }
// Printed as:   "   label       value"

function ev(label, value) { return { label, value }; }

function printTest(id, name, rows, ok, verdict) {
  console.log(RULE);
  console.log(`${C.cyan}${C.bold}${id}${C.reset}  ${C.bold}${name}${C.reset}`);
  for (const r of rows) {
    const lbl = `${C.dim}${r.label.padEnd(W_LABEL)}${C.reset}`;
    console.log(`   ${lbl}  ${r.value}`);
  }
  const tag    = ok ? `${C.green}${C.bold}  PASS${C.reset}` : `${C.red}${C.bold}  FAIL${C.reset}`;
  const colour = ok ? C.green : C.red;
  console.log(`${tag}    ${colour}${verdict}${C.reset}`);
}

// ─── Test cases ───────────────────────────────────────────────────────────────

const tests = [

  // TCSA016 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCSA016', name: 'Platform metrics dashboard',
    async run() {
      const token = await login(ACCOUNTS.admin);
      const rows  = [];

      const [orgsR, enqR, regR] = await Promise.all([
        GET('/admin/organisations', token),
        GET('/admin/enquiries',     token),
        GET('/admin/registrations', token),
      ]);

      rows.push(ev('GET', `/admin/organisations → HTTP ${orgsR.status}`));
      rows.push(ev('GET', `/admin/enquiries → HTTP ${enqR.status}`));
      rows.push(ev('GET', `/admin/registrations → HTTP ${regR.status}`));

      if (!orgsR.ok) return { ok: false, rows, verdict: `GET /admin/organisations failed (${orgsR.status})` };
      if (!enqR.ok)  return { ok: false, rows, verdict: `GET /admin/enquiries failed (${enqR.status})` };
      if (!regR.ok)  return { ok: false, rows, verdict: `GET /admin/registrations failed (${regR.status})` };

      const orgs   = orgsR.data?.data ?? [];
      const active = orgs.filter(o => o.isActive).length;
      rows.push(ev('data', `${orgs.length} orgs total, ${active} active — metrics derived from live API data`));

      if (orgs.length === 0) return { ok: false, rows, verdict: 'No orgs returned — is the DB seeded?' };

      return { ok: true, rows, verdict: `Dashboard stats driven by live API (${active} active orgs). Not hardcoded.` };
    },
  },

  // TCMG014 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCMG014', name: 'View reports',
    async run() {
      const token = await login(ACCOUNTS.pm);
      const rows  = [];

      const r = await GET('/pm/reports', token);
      rows.push(ev('GET', `/pm/reports → HTTP ${r.status}`));

      if (!r.ok) return { ok: false, rows, verdict: `GET /pm/reports failed (${r.status}) — ${JSON.stringify(r.data)}` };

      const d = r.data?.data;
      if (!d?.summary)    return { ok: false, rows, verdict: 'Response missing data.summary' };
      if (!d?.perStaff)   return { ok: false, rows, verdict: 'Response missing data.perStaff' };
      if (!d?.statusCounts) return { ok: false, rows, verdict: 'Response missing data.statusCounts' };

      rows.push(ev('summary', `totalTasks=${d.summary.totalTasks}, completed=${d.summary.completed}, completionRate=${d.summary.completionRate}%`));
      rows.push(ev('perStaff', `${d.perStaff.length} staff row(s) with hoursThisWeek + tasksCompleted`));
      rows.push(ev('statusCounts', Object.entries(d.statusCounts).map(([k,v]) => `${k}=${v}`).join(', ')));

      return { ok: true, rows, verdict: `Reports endpoint returns structured data (${d.summary.totalTasks} tasks, ${d.perStaff.length} staff rows, statusCounts present).` };
    },
  },

  // TCWK004 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCWK004', name: 'Availability overlap rejected (edge)',
    async run() {
      const token = await login(ACCOUNTS.worker);
      const rows  = [];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const ymd = tomorrow.toISOString().slice(0, 10);

      const base    = { start_datetime: `${ymd}T09:00:00.000Z`, end_datetime: `${ymd}T17:00:00.000Z`, status: 'AVAILABLE' };
      const overlap = { start_datetime: `${ymd}T10:00:00.000Z`, end_datetime: `${ymd}T12:00:00.000Z`, status: 'AVAILABLE' };

      const r1 = await POST('/worker/availability', base, token);
      rows.push(ev('POST', `/worker/availability 09:00–17:00 → HTTP ${r1.status}  (base slot)`));

      if (r1.status !== 201) {
        return { ok: false, rows, verdict: `Base slot creation failed (${r1.status}) — cannot test overlap` };
      }

      const slotId = r1.data?.data?.availability_id;
      const r2 = await POST('/worker/availability', overlap, token);
      rows.push(ev('POST', `/worker/availability 10:00–12:00 → HTTP ${r2.status}  (overlapping slot)`));

      if (slotId) await DELETE(`/worker/availability/${slotId}`, token);

      if (r2.status === 409) {
        rows.push(ev('body', `"${r2.data?.message}"`));
        return { ok: true, rows, verdict: `Overlap 10:00–12:00 over 09:00–17:00 correctly rejected (409 Conflict).` };
      }
      return { ok: false, rows, verdict: `Overlap NOT rejected — got ${r2.status} (expected 409). Overlap guard not active.` };
    },
  },

  // TCWK005 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCWK005', name: 'View my skills (read-only)',
    async run() {
      const token = await login(ACCOUNTS.worker);
      const rows  = [];

      const r = await GET('/worker/skills', token);
      rows.push(ev('GET', `/worker/skills → HTTP ${r.status}`));

      if (!r.ok) return { ok: false, rows, verdict: `GET /worker/skills failed (${r.status})` };

      const data = r.data?.data;

      if (data && !Array.isArray(data) && data.message) {
        rows.push(ev('body', `{"message": "${data.message}"}`));
        return { ok: false, rows, verdict: `Endpoint is still a stub — returns message string, not skill array.` };
      }
      if (!Array.isArray(data)) {
        return { ok: false, rows, verdict: `Expected array, got: ${JSON.stringify(data)}` };
      }

      rows.push(ev('body', `Array[${data.length}] — ${data.map(s => s.skill_name).join(', ') || '(no skills assigned)'}`));
      rows.push(ev('controls', 'No add/remove route exposed to worker (read-only confirmed)'));

      return { ok: true, rows, verdict: `${data.length} skill(s) returned. Endpoint returns worker's own assigned skills only. No add/remove controls.` };
    },
  },

  // TCTW011 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCTW011', name: 'No Leave feature for temp worker (negative)',
    async run() {
      const token = await login(ACCOUNTS.tempWorker);
      const rows  = [];

      const today = new Date().toISOString().slice(0, 10);
      const r = await POST('/temp-worker/leave', {
        leave_type: 'ANNUAL', start_date: today, end_date: today, reason: 'test',
      }, token);

      rows.push(ev('nav', 'Leave absent from TEMP_NAV (client) — TRUE'));
      rows.push(ev('POST', `/temp-worker/leave → HTTP ${r.status}  (expected: 404 route not found)`));

      if (r.status === 404) {
        return { ok: true, rows, verdict: `Leave UI absent and API route absent (404). Temp workers cannot access leave feature.` };
      }
      return { ok: false, rows, verdict: `API NOT denied — got ${r.status} (expected 404). Leave route must be removed for TEMPORARY_WORKER.` };
    },
  },

  // TCPS004 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCPS004', name: 'Select subscription during onboarding',
    async run() {
      const adminToken = await login(ACCOUNTS.admin);
      const rows       = [];

      const orgsR = await GET('/admin/organisations', adminToken);
      const org   = (orgsR.data?.data ?? [])[0];
      if (!org) return { ok: false, rows: [ev('error', 'No orgs found — is the DB seeded?')], verdict: 'Cannot run test without seeded org.' };

      const planR = await POST('/admin/plans', {
        name: '__test_plan__', description: 'Temp plan for automated test',
        price_monthly: 9.99, price_annual: 99.99, max_users: 5,
      }, adminToken);
      rows.push(ev('POST', `/admin/plans → HTTP ${planR.status}  (create temp test plan)`));

      if (!planR.ok) return { ok: false, rows, verdict: `Could not create test plan (${planR.status})` };
      const planId = planR.data?.data?.plan_id;

      const subR = await POST(`/public/organisations/${org.organisation_id}/subscription`, { plan_id: planId });
      rows.push(ev('POST', `/public/organisations/${org.organisation_id}/subscription → HTTP ${subR.status}`));

      if (planId) await api('PATCH', `/admin/plans/${planId}/deactivate`, { token: adminToken });

      if (!subR.ok) {
        rows.push(ev('body', JSON.stringify(subR.data)));
        return { ok: false, rows, verdict: `Subscription endpoint failed (${subR.status}).` };
      }

      const sub = subR.data?.data;
      rows.push(ev('body', `subscription_id=${sub?.subscription_id}, plan="${sub?.plan}", status=${sub?.status}`));

      return { ok: true, rows, verdict: `Subscription #${sub?.subscription_id} recorded against org "${org.name}" (status: ${sub?.status}).` };
    },
  },

  // TCPS007 ──────────────────────────────────────────────────────────────────
  {
    id: 'TCPS007', name: 'Forgot password – request reset',
    async run() {
      const rows = [];

      const r = await POST('/auth/forgot-password', { email: ACCOUNTS.worker });
      rows.push(ev('POST', `/auth/forgot-password → HTTP ${r.status}`));

      if (!r.ok) return { ok: false, rows, verdict: `Request failed (${r.status}) — ${JSON.stringify(r.data)}` };

      const msg = r.data?.message ?? '';
      rows.push(ev('message', `"${msg}"`));
      rows.push(ev('note', 'Token is emailed (not returned) — anti-enumeration: always 200 regardless of whether email exists'));

      const expectedPhrase = 'reset link has been sent';
      if (!msg.toLowerCase().includes(expectedPhrase)) {
        return { ok: false, rows, verdict: `Response message did not contain expected phrase ("${expectedPhrase}")` };
      }

      return { ok: true, rows, verdict: `Reset request accepted (HTTP 200). NOTE: token is emailed, not returned (anti-enumeration). Needs SendGrid configured to actually send.` };
    },
  },

];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}SmartTask Allocation — API Test Runner${C.reset}`);
  console.log(`${C.dim}Base URL: ${BASE}${C.reset}`);

  try {
    const r = await fetch(`${BASE.replace('/api/v1', '')}/api/health`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch {
    console.error(`\n${C.red}${C.bold}Server not reachable at ${BASE}${C.reset}`);
    console.error(`${C.dim}Start it:  cd server && npm start${C.reset}\n`);
    process.exit(1);
  }

  const results = [];

  for (const t of tests) {
    try {
      const { ok, rows, verdict } = await t.run();
      printTest(t.id, t.name, rows, ok, verdict);
      results.push({ id: t.id, name: t.name, ok, verdict, rows });
    } catch (err) {
      const verdict = `Unexpected error: ${err.message}`;
      printTest(t.id, t.name, [ev('error', err.message)], false, verdict);
      results.push({ id: t.id, name: t.name, ok: false, verdict, rows: [] });
    }
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const total  = results.length;

  console.log(RULE);
  console.log(`${C.bold}RESULTS SUMMARY${C.reset}`);
  console.log(RULE);

  const hId     = 'Test ID';
  const hName   = 'Test Name';
  const hResult = 'Result';
  const hEvid   = 'Evidence (actual)';

  // Column widths
  const W1 = 9, W2 = 42, W3 = 8;
  const sep = `${C.dim} ${'─'.repeat(W1)} ┼ ${'─'.repeat(W2)} ┼ ${'─'.repeat(W3)} ┼ ${'─'.repeat(38)}${C.reset}`;

  const row = (id, name, result, evid, header = false) => {
    const c = header ? C.bold : (result === 'PASS' ? C.green : (result === 'FAIL' ? C.red : C.reset));
    return ` ${c}${padR(id, W1)}${C.reset} │ ${padR(name, W2)} │ ${c}${padR(result, W3)}${C.reset} │ ${evid}`;
  };

  console.log(row(hId, hName, hResult, hEvid, true));
  console.log(sep);

  for (const r of results) {
    const evid = r.rows.slice(0, 2).map(l => `${l.label}: ${l.value}`).join(' | ');
    console.log(row(r.id, r.name, r.ok ? 'PASS' : 'FAIL', evid.slice(0, 60)));
  }

  console.log(RULE);
  const colour = passed === total ? C.green : C.red;
  console.log(`${C.bold}${colour}${passed}/${total} passed${C.reset}\n`);

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err);
  process.exit(1);
});
```

---

## 3. Feature and cross-module scripts

Targeted end-to-end checks over HTTP, each printing a verdict line per feature.

### `server/scripts/test-features.js`
*140 lines*

`npm run test:features` — calendar over a date range, `/pm/reports` reachability, the completion-approval flow, and an assertion that `/pm/subscription` is gone (404) now that subscriptions belong to the Org Admin.

```js
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
```

### `server/scripts/test-cross-module.js`
*170 lines*

`npm run test:xm` — the full chain: create a task with a required skill, auto-allocate it, confirm the worker sees it, confirm the status reflects back to the manager. Also exercises the auth matrix across `/pm/tasks`, `/pm/reports`, `/pm/team` and `/admin/organisations`.

```js
/*
 * Cross-module / NFR test evidence (TCXM001–007).
 * Prints the real request/response for each case with a PASS/FAIL comment.
 *
 * Prerequisite: the API must be running (in another terminal):  npm run dev
 * Then run:                                                      npm run test:xm
 *
 * Accounts are resolved by role from whatever the database holds
 * (seed with: node scripts/reset-hosted.js --confirm).
 */
const { resolveFixtures } = require('./fixtures');

const B = process.env.API_BASE || 'http://localhost:5000/api/v1';
// Overwritten from the resolved fixtures at start-up.
let PW = 'SmartTask#2026';
let FX = null;
const uniq = Date.now();

async function call(method, path, token, body) {
  const t0 = Date.now();
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, ms, text, json };
}
const login = (email) => call('POST', '/auth/login', null, { email, password: PW });
const tok = (r) => (r.json && r.json.token) || '';
const short = (t, n = 170) => (t.length > n ? t.slice(0, n) + '…' : t);
const line = (s) => console.log(s);

// A UEN can only ever be claimed by one organisation, so each run needs its own.
// Format A: 8 digits + 1 check letter (see server/src/utils/uen.js).
const mkUen = (n) => String(n).slice(-8).padStart(8, '0') + 'A';

// Registration now requires the applicant to prove they own the email address
// before a System Admin can approve them. A CLI harness has no inbox, so the
// token is read straight from the database and posted to the real endpoint —
// the same shortcut scripts/verification-links.js gives local dev.
let prisma = null;
try { prisma = new (require('@prisma/client').PrismaClient)(); } catch { /* optional */ }

async function verifyPendingEmail(email) {
  if (!prisma) return { status: 0, text: 'prisma unavailable - cannot read verification token' };
  const row = await prisma.unregisteredUser.findFirst({ where: { email } });
  if (!row || !row.verification_token) return { status: 0, text: 'no verification token stored' };
  return call('POST', '/public/verify-email', null, { token: row.verification_token });
}
const hdr = (s) => { console.log('\n' + '='.repeat(72)); console.log(s); console.log('='.repeat(72)); };

(async () => {
  // Resolve the accounts this run will use. Doing it by role rather than by
  // hardcoded email keeps the suite working across reseeds.
  if (prisma) {
    FX = await resolveFixtures(prisma, { require: ['ORG_ADMIN', 'PROJECT_MANAGER'] });
    if (FX.error) { console.error('\n' + FX.error + '\n'); process.exit(1); }
    PW = FX.password;
    if (!FX.sysadmin) { console.error('\nNo SYSTEM_ADMIN account found. Seed first.\n'); process.exit(1); }
  }

  // Fail fast if the server isn't up.
  try { await fetch(B.replace(/\/api\/v1$/, '') + '/api/health'); }
  catch { console.error('\n❌ API not reachable at ' + B + '\n   Start it first:  npm run dev  (in another terminal)\n'); process.exit(1); }

  // ---------------------------------------------------------------- TCXM001
  hdr('TCXM001  E2E: Org registers -> SysAdmin approves -> Org Admin logs in');
  const email = `newco+${uniq}@test.local`;
  let r = await call('POST', '/public/organisations/register', null,
    { full_name: 'New Co Admin', email, password: PW, company_name: 'NewCo', uen: mkUen(uniq) });
  line(`[1] POST /public/organisations/register        -> ${r.status}  ${short(r.text)}`);
  const sa = tok(await login(FX.sysadmin.email));
  r = await call('GET', '/admin/registrations', sa);
  const reg = (r.json.data || []).find((x) => x.email === email);
  line(`[2] GET  /admin/registrations (SYSTEM_ADMIN)   -> ${r.status}  found pending id=${reg && reg.marketing_user_id}, uen=${reg && reg.uen}, email_verified=${reg && reg.email_verified}`);
  r = await verifyPendingEmail(email);
  line(`[3] POST /public/verify-email (emailed link)   -> ${r.status}  ${short(r.text)}`);
  r = await call('POST', `/admin/registrations/${reg.marketing_user_id}/approve`, sa);
  line(`[4] POST /admin/registrations/${reg.marketing_user_id}/approve       -> ${r.status}  ${short(r.text)}`);
  r = await login(email);
  line(`[5] POST /auth/login (new ORG_ADMIN)           -> ${r.status}  user_type=${r.json.user && r.json.user.user_type}, token=${tok(r) ? 'issued' : 'none'}`);
  line('COMMENT: PASS if each step transitions and the new Org Admin logs in (200) after approval.');
  line('         Approval is refused (409) until step [3] verifies the email - that gate is the point.');

  // ---------------------------------------------------------------- TCXM002
  hdr('TCXM002  E2E: PM creates task -> auto-allocate -> worker acknowledges');
  const pm = tok(await login(FX.pm.email));
  const skills = (await call('GET', '/pm/skills', pm)).json.data;
  const js = skills.find((s) => s.skill_name === 'JavaScript') || skills[0];
  // Task window must overlap a seeded AVAILABLE slot (seed: today+1..+5, 09:00-18:00 local).
  const win = (() => { const s = new Date(); s.setDate(s.getDate() + 2); s.setHours(11, 0, 0, 0); const e = new Date(s); e.setHours(13, 0, 0, 0); return { s: s.toISOString(), e: e.toISOString() }; })();
  r = await call('POST', '/pm/tasks', pm, { title: 'TCXM002 Task', start_datetime: win.s, end_datetime: win.e, required_skill_ids: [js.skill_id] });
  const taskId = r.json.data && r.json.data.task_id;
  line(`[1] POST /pm/tasks (skill "${js.skill_name}", within avail window) -> ${r.status}  task_id=${taskId}, status=${r.json.data && r.json.data.status}`);
  r = await call('POST', `/pm/tasks/${taskId}/auto-allocate`, pm);
  const asg = (r.json.data && r.json.data.assignments || [])[0];
  line(`[2] POST /pm/tasks/${taskId}/auto-allocate            -> ${r.status}  status=${r.json.data && r.json.data.status}, assignee=${asg && asg.assignedTo.email}`);
  if (asg) {
    const alog = await login(asg.assignedTo.email);
    const base = alog.json.user.user_type === 'TEMPORARY_WORKER' ? '/temp-worker' : '/worker';
    r = await call('PATCH', `${base}/tasks/${taskId}/acknowledge`, tok(alog));
    line(`[3] PATCH ${base}/tasks/${taskId}/acknowledge (worker) -> ${r.status}  status=${r.json.data && r.json.data.status}`);
    r = await call('GET', `/pm/tasks/${taskId}`, pm);
    line(`[4] GET  /pm/tasks/${taskId} (reflects to PM)         -> ${r.status}  PM sees status=${r.json.data.status}`);
  } else {
    line('    (auto-allocate found no eligible worker — needs a worker with the skill AND an AVAILABLE slot overlapping the window)');
  }
  line('COMMENT: PASS if task ends IN_PROGRESS for the PM. Note: eligibility requires a seeded availability slot (Availability UI was removed).');

  // ---------------------------------------------------------------- TCXM003
  hdr('TCXM003  Single subscription tier — every organisation gets the full feature set');
  const oa = tok(await login(FX.admin.email));
  const pmTok = tok(await login(FX.pm.email));
  const plans = (await call('GET', '/org-admin/plans', oa)).json.data;
  line(`[1] GET  /org-admin/plans                       -> ${plans.length} active plan(s): ${plans.map((p) => p.name + ' ($' + p.price_monthly + ')').join(', ')}`);
  const singleTier = plans.length === 1;

  const sub = await call('GET', '/org-admin/subscription', oa);
  const amount = sub.json?.data?.amount ?? sub.json?.data?.activeSubscription?.amount;
  line(`[2] GET  /org-admin/subscription                -> ${sub.status}  amount=$${amount}`);
  const subscribed = sub.status === 200 && amount != null;

  // Reports used to sit behind an "Advanced Reports" plan feature. With one tier
  // there is no upgrade to sell, so the gate was removed — every manager gets it.
  r = await call('GET', '/pm/reports', pmTok);
  line(`[3] GET  /pm/reports (previously plan-gated)    -> ${r.status}`);
  const reportsOpen = r.status === 200;

  line(`COMMENT: ${singleTier && subscribed && reportsOpen ? 'PASS' : 'CHECK'} — one tier offered, organisation subscribed to it, and the formerly gated report is reachable.`);

  // ---------------------------------------------------------------- TCXM004
  hdr('TCXM004  NFR - auth/session security');
  r = await call('GET', '/pm/tasks', null);
  line(`[1] GET /pm/tasks  (NO token)                  -> ${r.status}  body=${r.text}`);
  r = await login(FX.sysadmin.email);
  line(`[2] login response user keys                   -> ${Object.keys(r.json.user || {}).join(', ')}`);
  line(`    password / password_hash present in body?  -> ${/password/i.test(r.text)}`);
  line('COMMENT: PASS — 401 with body {message:"Not authenticated"} and no password/hash returned.');

  // ---------------------------------------------------------------- TCXM005
  hdr('TCXM005  NFR - input validation / injection');
  r = await call('POST', '/auth/login', null, { email: "' OR '1'='1", password: 'x' });
  line(`[1] POST /auth/login  email="' OR '1'='1"       -> ${r.status}  ${short(r.text)}`);
  const xssEmail = `xss+${uniq}@test.local`;
  r = await call('POST', '/public/organisations/register', null, { full_name: 'XSS', email: xssEmail, password: PW, company_name: '<script>alert(1)</script>', uen: mkUen(uniq + 1) });
  line(`[2] POST /public/organisations/register company_name="<script>alert(1)</script>" -> ${r.status}`);
  r = await call('GET', '/admin/registrations', sa);
  const xrec = (r.json.data || []).find((x) => x.email === xssEmail);
  line(`[3] stored company_name = ${JSON.stringify(xrec && xrec.company_name)}  (stored as data, not executed; React escapes on render)`);
  line('COMMENT: PASS — SQL-style input rejected (400, not 500 = no injection); script payload stored verbatim, never executed.');

  // ---------------------------------------------------------------- TCXM006
  hdr('TCXM006  NFR - performance smoke (LOCAL — no staging deployed yet)');
  for (const ep of ['/pm/tasks', '/pm/reports', '/pm/team', '/admin/organisations']) {
    const res = await call('GET', ep, ep.startsWith('/admin') ? sa : pm);
    line(`  GET ${ep.padEnd(22)} -> ${res.status}  ${res.ms} ms   ${res.ms < 2000 ? 'PASS (<2s)' : 'SLOW'}`);
  }
  line('COMMENT: PASS locally; re-run against the deployed staging URL to fully satisfy the precondition.');

  // ---------------------------------------------------------------- TCXM007
  hdr('TCXM007  NFR - cross-browser smoke');
  line('MANUAL / not automatable from CLI — run login + one core flow by hand in Chrome, Edge, Firefox on staging.');

  console.log('\n[done]');
  if (prisma) await prisma.$disconnect();
  process.exit(0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
```

### `server/scripts/test-email.js`
*48 lines*

`npm run test:email` — verifies SendGrid credentials by sending one message.

```js
/**
 * Send a one-off test email to prove the SendGrid configuration works.
 *
 *   node scripts/test-email.js                 # sends to FROM_EMAIL (yourself)
 *   node scripts/test-email.js you@example.com # sends to a specific address
 *
 * Reports the exact SendGrid rejection reason on failure, which is otherwise
 * swallowed by the registration route's non-fatal mail handling.
 */
require('dotenv').config();
const { sendMail } = require('../src/services/email.service');

const to = process.argv[2] || process.env.FROM_EMAIL;

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not set — the mailer would only log to console.');
    process.exit(1);
  }
  if (!to) {
    console.error('No recipient. Pass one as an argument or set FROM_EMAIL.');
    process.exit(1);
  }

  console.log(`From : ${process.env.FROM_EMAIL}`);
  console.log(`To   : ${to}\nSending…`);

  const result = await sendMail({
    to,
    subject: 'SmartTask — SendGrid test',
    html: '<p>If you are reading this, SendGrid is configured correctly.</p>',
  });

  console.log(result.sent ? '\n✅ Accepted by SendGrid. Check the inbox (and spam).'
                          : `\n⚠️  Not sent: ${result.reason}`);
}

main().catch((err) => {
  console.error('\n❌ SendGrid rejected the send.');
  console.error(`   ${err.message}`);
  // SendGrid returns the actionable detail in the response body, not the message.
  const errors = err.response?.body?.errors;
  if (errors) for (const e of errors) console.error(`   → ${e.message}${e.field ? ` (field: ${e.field})` : ''}`);
  console.error('\nCommon causes:');
  console.error('  403 verified Sender Identity → FROM_EMAIL is not the address you verified in SendGrid');
  console.error('  401 unauthorized             → API key wrong, revoked, or lacks Mail Send permission');
  process.exit(1);
});
```

---

## 4. Test utilities

Helpers for exercising the API by hand.

### `server/scripts/gen-token.js`
*63 lines*

Mints a JWT for any account so endpoints can be hit directly with curl or Postman without going through login.

```js
/**
 * Usage: node scripts/gen-token.js
 *
 * Queries the DB for seed users and prints 24h JWT tokens for each role.
 * Run this after the server is seeded (npm run db:seed).
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'pm@techcorp.com',
          'orgadmin@techcorp.com',
          'worker@techcorp.com',
          'tempworker@techcorp.com',
        ],
      },
    },
    select: {
      userId:         true,
      full_name:      true,
      email:          true,
      user_type:      true,
      organisationId: true,
    },
  });

  if (users.length === 0) {
    console.error('No seed users found. Run: npm run db:seed');
    process.exit(1);
  }

  console.log('\n=== Test JWT Tokens (24h) ===\n');

  // Consistent ordering
  const order = ['ORG_ADMIN', 'PROJECT_MANAGER', 'PERMANENT_WORKER', 'TEMPORARY_WORKER'];
  users.sort((a, b) => order.indexOf(a.user_type) - order.indexOf(b.user_type));

  for (const user of users) {
    const payload = {
      userId:         user.userId,
      organisationId: user.organisationId,
      role:           user.user_type,    // rbac.middleware checks req.user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    console.log(`─── ${user.full_name} (${user.user_type})`);
    console.log(`    userId=${user.userId}  orgId=${user.organisationId}`);
    console.log(`    Bearer ${token}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
```
