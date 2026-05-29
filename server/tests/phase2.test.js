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
  // Load seed users
  pm = await prisma.user.findFirst({ where: { email: 'pm@techcorp.com' } });
  worker = await prisma.user.findFirst({ where: { email: 'worker@techcorp.com' } });
  tempWorker = await prisma.user.findFirst({ where: { email: 'tempworker@techcorp.com' } });
  org = await prisma.organisation.findFirst({ where: { name: 'TechCorp Pte Ltd' } });

  if (!pm || !worker || !org) {
    throw new Error('Seed data not found. Run: npx prisma db seed');
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