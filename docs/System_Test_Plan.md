# System Test Plan — Smart Task Allocation
**FYP-26-S2-42P**

*Companion to [SRS_Draft.md](SRS_Draft.md) and [API_Notes.md](API_Notes.md). Update as features evolve.*

---

## 1. Introduction

### 1.1 Purpose
This document defines the **system-level (black-box) test plan** for the Smart Task Allocation platform. It describes the test strategy, environment, entry/exit criteria, and a **module-by-module set of test cases** covering all five roles plus the public site. Each test case is traceable to a use case (UC-*) in the SRS.

### 1.2 Scope
**In scope:** end-to-end functional testing of every module via the UI and REST API; role-based access control (RBAC); input validation / negative paths; cross-module workflows (e.g. register → approve → login); and a non-functional smoke pass (auth, performance, security basics).

**Out of scope (covered elsewhere or deferred):** unit tests of individual functions; load/stress testing; penetration testing; the intentional stubs (audit logs, worker profile read, public org-details/subscription onboarding).

### 1.3 References
- Software Requirements Specification — `docs/SRS_Draft.md`
- API reference — `docs/API_Notes.md`
- Seed data — `server/prisma/seed.js`

### 1.4 Definitions
| Term | Meaning |
|------|---------|
| STC | System Test Case (this document's IDs, e.g. `STC-AUTH-01`) |
| UC | Use Case from the SRS (e.g. `UC-PM-01`) |
| RBAC | Role-Based Access Control |
| SUT | System Under Test |
| Positive / Negative | Valid-input (happy path) vs invalid-input/forbidden test |

---

## 2. Test Strategy

### 2.1 Test level
This plan covers **System Testing** — the fully integrated application (React client + Express/Prisma API + MySQL). Component/unit testing is assumed to be performed separately by each developer.

### 2.2 Test types
| Type | Goal |
|------|------|
| Functional | Each feature produces the correct result for valid input |
| RBAC / Authorization | Each endpoint is reachable only by permitted roles (others get 401/403) |
| Validation / Negative | Invalid, missing, or malformed input is rejected with a clear 4xx error |
| Boundary | Limits and edge values (date ranges, empty lists, max lengths, duplicates) |
| Workflow / Integration | Multi-step cross-module journeys behave correctly end-to-end |
| Non-functional (smoke) | Response time, JWT expiry, password hashing, validation coverage |

### 2.3 Entry criteria
- Code merged to `main` and builds clean (`server` boots, `client` `vite build` passes).
- `npx prisma validate` passes; DB synced via `npx prisma db push`; `npx prisma db seed` run.
- Server reachable at `http://localhost:5000`, client at `http://localhost:5173`.

### 2.4 Exit criteria
- 100% of **High** priority test cases executed and passed.
- ≥ 95% of all test cases passed; no open **Critical/High** severity defects.
- All RBAC-matrix cells verified.
- Requirements traceability shows every UC covered by ≥ 1 passed test.

### 2.5 Pass / Fail criteria
A test **passes** when the actual result matches the expected result (status code, payload shape, and persisted state). Otherwise it **fails** and a defect is logged (§9).

### 2.6 Suspension / resumption
Testing of a module is **suspended** if a blocking defect (server crash, DB unreachable, auth broken) prevents execution, and **resumed** once a fix is verified by re-running the affected module plus a regression of dependent modules.

---

## 3. Test Environment

| Item | Value |
|------|-------|
| OS | Windows 11 |
| Database | MySQL (XAMPP / MariaDB 10.4) on `localhost:3306`, DB `smart_task_allocation` |
| Backend | Node.js + Express + Prisma 5, `http://localhost:5000` |
| Frontend | React + Vite, `http://localhost:5173` |
| API base | `/api/v1` |
| Tools | Browser (Chrome), curl / Postman, browser DevTools, Prisma Studio (optional) |

### 3.1 Setup steps
```bash
# 1. DB (XAMPP MySQL must be running)
cd server
npx prisma db push        # sync schema (team uses db push, NOT migrate)
npx prisma db seed        # load test accounts & sample data
npm run dev               # start API on :5000

# 2. Client
cd client && npm run dev  # start UI on :5173
```

### 3.2 Test accounts (from seed — password for all: `Password123!`)
| Role | Email | Notes |
|------|-------|-------|
| System Admin | `admin@system.com` | platform-wide |
| Org Admin | `orgadmin@techcorp.com` | org "TechCorp Pte Ltd" |
| Project Manager | `pm@techcorp.com` | TechCorp |
| Permanent Worker | `worker@techcorp.com` | TechCorp |
| Temporary Worker | `tempworker@techcorp.com` | TechCorp |

Sample data: 3 organisations (1 suspended), 25 org users, 5 skills, 5 active tasks, subscriptions/billing for TechCorp.

---

## 4. Roles & Responsibilities
| Activity | Owner |
|----------|-------|
| Maintain this plan & traceability | Test lead |
| Execute module test cases | Module owner / assigned tester |
| Log & triage defects | Tester → module owner |
| Verify fixes & regression | Tester |
| Sign-off against exit criteria | Test lead / supervisor |

---

## 5. Module Overview & Traceability Map

| ID | Module | Primary role | UC coverage |
|----|--------|--------------|-------------|
| M01 | Authentication & Authorization | All | (cross-cutting, NFR) |
| M02 | Public site & Registration | Unregistered | UC-UU-01..04 |
| M03 | Registration Approval | System Admin | UC-SA-02/03, UC-UU-02 |
| M04 | Organisation Management | System Admin | UC-SA-01..04 |
| M05 | Subscription Plans | System Admin | (plans) |
| M06 | Enquiries | System Admin | UC-UU-04 |
| M07 | Marketing / Landing Content | System Admin + PM | UC-UU-01 |
| M08 | Staff Management | Org Admin | UC-OA-01/02 |
| M09 | Departments | Org Admin | UC-OA-03 |
| M10 | Staff Roles | Org Admin | UC-OA-03 |
| M11 | Skills & User-Skills | Org Admin | UC-OA-04/05 |
| M12 | Profile Change Requests | Org Admin + Worker | (new) |
| M13 | Task Management (multi-skill) | Project Manager | UC-PM-01..03 |
| M14 | Allocation Engine | Project Manager | UC-PM-04..06 |
| M15 | Team & Leave Approval | Project Manager | UC-PM-07, UC-PW-05 |
| M16 | Task Update Requests | PM + Worker | (new) |
| M17 | Subscription & Billing (view) | Project Manager | (billing) |
| M18 | Availability | Workers | UC-PW-04, UC-TW-04 |
| M19 | Leave (self-service) | Workers | UC-PW-05 |
| M20 | Attendance | Workers | UC-PW-06/07, UC-TW-05 |
| M21 | Worker Tasks | Workers | UC-PW-01..03, UC-TW-02/03 |
| M22 | Notifications | All | (cross-cutting) |

---

## 6. Module Test Cases

> Legend — **Pri** = Priority (H/M/L). **Type**: F=Functional, R=RBAC, N=Negative/Validation, B=Boundary, W=Workflow.
> "Result" column left blank for execution. API paths are under `/api/v1`.

### M01 — Authentication & Authorization
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-AUTH-01 | — | Valid login | POST `/auth/login` with seeded admin creds | 200, returns JWT + sanitized user (no `password_hash`) | F | H |
| STC-AUTH-02 | — | Wrong password | POST `/auth/login` valid email, bad password | 401 "Invalid email or password" | N | H |
| STC-AUTH-03 | — | Unknown email | POST `/auth/login` non-existent email | 401 (same generic message — no user enumeration) | N | H |
| STC-AUTH-04 | — | Inactive user blocked | Login as a deactivated user | 401 | N | M |
| STC-AUTH-05 | — | Role redirect | Login via UI as each role | Lands on correct dashboard (`/admin`,`/org-admin`,`/pm`,`/worker`,`/temp-worker`) | F | H |
| STC-AUTH-06 | NFR | Protected route w/o token | GET `/admin/registrations` with no `Authorization` | 401 "Access token required" | R | H |
| STC-AUTH-07 | NFR | Wrong-role access | Worker token → GET `/admin/organisations` | 403 "insufficient permissions" | R | H |
| STC-AUTH-08 | NFR | JWT expiry | Use a token older than its expiry | 401 "Invalid or expired token" | N | M |
| STC-AUTH-09 | NFR | Password hashing | Inspect `User.password_hash` in DB | bcrypt hash, never plaintext | F | H |

### M02 — Public Site & Registration
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-PUB-01 | UC-UU-01 | View pricing | GET `/public/pricing` (no auth) | 200, list of plans | F | M |
| STC-PUB-02 | UC-UU-01 | View features | GET `/public/features` (no auth) | 200, active landing features | F | M |
| STC-PUB-03 | UC-UU-02 | Register org (valid) | POST `/public/organisations/register` full_name/email/password/company | 201 "Registration submitted"; row in `UnregisteredUser` with `full_name` | F | H |
| STC-PUB-04 | UC-UU-02 | Missing fields | Register w/o company_name | 400 required-fields error | N | H |
| STC-PUB-05 | UC-UU-02 | Email normalization | Register `Jane.Doe@X.com` | Stored lowercased/trimmed; later login with normalized email works | B | H |
| STC-PUB-06 | UC-UU-02 | Duplicate email | Register an email that already exists (user or pending) | 409 "already exists" | N | H |
| STC-PUB-07 | UC-UU-02 | Login before approval | Login with a just-registered (pending) email | 401 — cannot log in until approved | W | H |
| STC-PUB-08 | UC-UU-04 | Submit enquiry | POST `/public/enquiry` subject+message | 201, enquiry persisted | F | M |
| STC-PUB-09 | UC-UU-04 | Enquiry validation | POST `/public/enquiry` empty message | 400 | N | M |
| STC-PUB-10 | UC-UU-01 | Back-to-home links | From `/login` and `/register`, click "Back to home" | Navigates to `/` | F | L |

### M03 — Registration Approval (System Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-REG-01 | UC-SA-02 | List pending | GET `/admin/registrations` | 200, includes the pending applicant with `full_name` | F | H |
| STC-REG-02 | UC-SA-03 | Approve | POST `/admin/registrations/:id/approve` | 201; creates `Organisation` + active `ORG_ADMIN` user; pending row removed | W | H |
| STC-REG-03 | — | Approved user can log in | Login with approved email + chosen password | 200, redirects to `/org-admin` | W | H |
| STC-REG-04 | — | Reject | POST `/admin/registrations/:id/reject` | 204; pending row removed; no user created | F | M |
| STC-REG-05 | — | Approve duplicate email | Approve when a user with that email already exists | 409 | N | M |
| STC-REG-06 | — | Approve unknown id | Approve non-existent id | 404 | N | L |
| STC-REG-07 | R | Non-admin access | Org-admin token → GET `/admin/registrations` | 403 | R | H |

### M04 — Organisation Management (System Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-ORG-01 | UC-SA-02 | List orgs | GET `/admin/organisations` | 200, orgs with staff counts & status | F | H |
| STC-ORG-02 | UC-SA-03 | Create org | POST `/admin/organisations` `{name}` | 201, org created | F | M |
| STC-ORG-03 | UC-SA-03 | Create w/o name | POST `/admin/organisations` `{}` | 400 | N | M |
| STC-ORG-04 | UC-SA-04 | Suspend org | PUT `/admin/organisations/:id/suspend` | 200, `isActive=false` | F | H |
| STC-ORG-05 | — | Reactivate org | PUT `/admin/organisations/:id/reactivate` | 200, `isActive=true` | F | M |
| STC-ORG-06 | UC-SA-01 | System health | GET `/admin/health` | 200 OK | F | L |

### M05 — Subscription Plans (System Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-PLAN-01 | — | List / get plan | GET `/admin/plans`, `/admin/plans/:id` | 200 | F | M |
| STC-PLAN-02 | — | Create plan | POST `/admin/plans` valid body | 201 | F | M |
| STC-PLAN-03 | — | Create invalid | POST `/admin/plans` missing price | 400 validation error | N | M |
| STC-PLAN-04 | — | Update plan | PATCH `/admin/plans/:id` | 200 | F | M |
| STC-PLAN-05 | — | Deactivate / reactivate | PATCH `/admin/plans/:id/deactivate` then `/reactivate` | 200; `is_active` toggles; deactivated hidden from public pricing | F | M |
| STC-PLAN-06 | — | Plan features | POST `/admin/plans/:id/features`, DELETE `.../features/:fid` | 201 / 200 | F | L |
| STC-PLAN-07 | — | Delete plan | DELETE `/admin/plans/:id` | 200 | F | L |

### M06 — Enquiries (System Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-ENQ-01 | UC-UU-04 | List enquiries | GET `/admin/enquiries` | 200, newest first | F | M |
| STC-ENQ-02 | — | View one | GET `/admin/enquiries/:id` | 200 | F | L |
| STC-ENQ-03 | — | Respond | PATCH `/admin/enquiries/:id/respond` | 200 | F | L |
| STC-ENQ-04 | — | Delete | DELETE `/admin/enquiries/:id` | 204/200; removed | F | L |
| STC-ENQ-05 | R | Non-admin | PM token → GET `/admin/enquiries` | 403 | R | M |

### M07 — Marketing / Landing Content
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-CMS-01 | UC-UU-01 | Public read | GET `/admin/content` (no auth) | 200, `{content, features, testimonials}` (active only) | F | H |
| STC-CMS-02 | — | Admin edit hero | PUT `/admin/content/hero` | 200; change appears on `/` | F | M |
| STC-CMS-03 | — | Admin edit video/pricing | PUT `/admin/content/video`, `/pricing` | 200 | F | L |
| STC-CMS-04 | — | Feature CRUD (icon) | POST/PUT/DELETE `/admin/content/features` with `icon` | 201/200; visible on landing | F | M |
| STC-CMS-05 | — | Manager creates testimonial | PM token → POST `/admin/content/testimonials` | 201 (PM allowed) | F | H |
| STC-CMS-06 | — | Manager edits/deletes own | PM token → PUT/DELETE `/admin/content/testimonials/:id` | 200 | F | M |
| STC-CMS-07 | R | Worker cannot write testimonial | Worker token → POST testimonial | 403 | R | H |
| STC-CMS-08 | R | Manager cannot edit hero | PM token → PUT `/admin/content/hero` | 403 (admin-only) | R | M |
| STC-CMS-09 | — | Home fallback | With empty DB content | `/` shows default hardcoded copy (no crash) | B | M |

### M08 — Staff Management (Org Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-STF-01 | UC-OA-01 | Register permanent staff | POST `/org-admin/staff` `user_type=PERMANENT_WORKER` | 201, active user | F | H |
| STC-STF-02 | UC-OA-02 | Register temp staff | POST `/org-admin/staff` `user_type=TEMPORARY_WORKER` | 201 | F | H |
| STC-STF-03 | — | Duplicate email | Register existing email | 409 | N | H |
| STC-STF-04 | — | Invalid user_type | POST with `user_type=GOD` | 400 | N | M |
| STC-STF-05 | — | List + search/filter | GET `/org-admin/staff?user_type=&search=` | 200, filtered | F | M |
| STC-STF-06 | — | Update staff details | PATCH `/org-admin/staff/:id` name/email/role | 200, updated | F | H |
| STC-STF-07 | — | Deactivate / reactivate | PATCH `/org-admin/staff/:id/deactivate` then `/reactivate` | 200; login blocked then restored | W | M |
| STC-STF-08 | — | Cross-org isolation | Org-admin A edits a user from Org B | 404 (not found in their org) | R | H |

### M09 — Departments (Org Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-DEP-01 | UC-OA-03 | List / create / update / delete | full CRUD on `/org-admin/departments` | 200/201/200/204 | F | M |
| STC-DEP-02 | UC-OA-03 | Assign head | POST `/org-admin/departments/:id/assign-staff` valid user | 200 | F | M |
| STC-DEP-03 | — | Assign non-org user | Assign user not in org | 404 | N | M |
| STC-DEP-04 | — | Create w/o name | POST `{}` | 400 | N | L |

### M10 — Staff Roles (Org Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-ROL-01 | UC-OA-03 | Role CRUD | list/create/update/delete `/org-admin/roles` | 200/201/200/204 | F | M |
| STC-ROL-02 | — | Max hours validation | Create role `max_working_hours=-5` | 400 | N | L |

### M11 — Skills & User-Skills (Org Admin)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-SKL-01 | UC-OA-04 | Skill CRUD | list/create/update/delete `/org-admin/skills` | 200/201/200/204 | F | M |
| STC-SKL-02 | UC-OA-04 | Duplicate skill name | Create existing skill name | 409 | N | M |
| STC-SKL-03 | UC-OA-05 | Assign skill to staff | POST `/org-admin/staff/:id/skills` | 201 | F | M |
| STC-SKL-04 | UC-OA-05 | Duplicate assignment | Assign same skill twice | 409 | N | L |
| STC-SKL-05 | UC-OA-05 | Remove skill | DELETE `/org-admin/staff/:id/skills/:skillId` | 204 | F | L |

### M12 — Profile Change Requests
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-PCR-01 | — | Worker submits | POST `/worker/profile/change-request` field+value | 201, status PENDING | F | M |
| STC-PCR-02 | — | Validation | Submit w/o `requested_value` | 400 | N | M |
| STC-PCR-03 | — | Org-admin lists | GET `/org-admin/profile-change-requests` | 200, org-scoped | F | M |
| STC-PCR-04 | — | Approve/reject | PATCH `/org-admin/profile-change-requests/:id` `{action:"APPROVED"}` | 200, status updated, reviewer recorded | F | M |
| STC-PCR-05 | N | Wrong field name | PATCH with `{status:...}` instead of `action` | 400 (must be `action`) | N | M |
| STC-PCR-06 | — | Re-review blocked | Review an already-reviewed request | 409 | N | L |
| STC-PCR-07 | R | Cross-org | Org-admin reviews request from another org | 403 | R | M |

### M13 — Task Management / Multi-skill (Project Manager)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-TSK-01 | UC-PM-01 | Create single-skill task | POST `/pm/tasks` with `required_skill_id` | 201 | F | H |
| STC-TSK-02 | UC-PM-01 | Create multi-skill task | POST `/pm/tasks` `required_skill_ids:[a,b]` | 201; response `requiredSkills` lists both | F | H |
| STC-TSK-03 | — | end before start | `end_datetime <= start_datetime` | 400 | N | H |
| STC-TSK-04 | — | Skill not in org | `required_skill_ids` with foreign skill id | 422 | N | M |
| STC-TSK-05 | UC-PM-02 | Update task + replace skills | PATCH `/pm/tasks/:id` new `required_skill_ids` | 200; skill set replaced | F | H |
| STC-TSK-06 | — | List with filters | GET `/pm/tasks?status=&department_id=&date=` | 200, filtered | F | M |
| STC-TSK-07 | UC-PM-03 | Delete task | DELETE `/pm/tasks/:id` | 200 | F | M |
| STC-TSK-08 | — | Delete assigned task | Delete a task that has assignments | 409 (unassign first) | N | M |
| STC-TSK-09 | — | Lookups | GET `/pm/departments`, `/pm/skills` | 200 | F | L |

### M14 — Allocation Engine (Project Manager)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-ALC-01 | UC-PM-06 | Eligible staff | GET `/pm/tasks/:id/eligible-staff` | 200, workers matching skills & availability | F | H |
| STC-ALC-02 | UC-PM-04 | Manual assign | POST `/pm/tasks/:id/assign` `{user_id}` | 200; task ASSIGNED; assignment recorded | F | H |
| STC-ALC-03 | — | Reallocate | POST `/pm/tasks/:id/reallocate` to another worker | 200; reassigned | F | M |
| STC-ALC-04 | UC-PM-05 | Auto-allocate | POST `/pm/tasks/:id/auto-allocate` | 200; assigned to best-fit eligible worker | F | H |
| STC-ALC-05 | — | Auto-allocate, none eligible | Task needs skill nobody has | Graceful message / no crash | B | M |
| STC-ALC-06 | — | Assign ineligible worker | Assign worker lacking the skill | Rejected with clear error | N | M |

### M15 — Team & Leave Approval (Project Manager)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-MGR-01 | UC-PM-07 | Team roster | GET `/pm/team` | 200; members with skills, weekly hours, availability | F | M |
| STC-MGR-02 | UC-PW-05 | List leave | GET `/pm/leave` | 200; org leave requests | F | H |
| STC-MGR-03 | — | Approve leave | PATCH `/pm/leave/:id` `{status:"APPROVED"}` | 200 | W | H |
| STC-MGR-04 | — | Reject leave | PATCH `/pm/leave/:id` `{status:"REJECTED"}` | 200 | F | M |
| STC-MGR-05 | — | Invalid decision | PATCH with `{status:"MAYBE"}` | 400/422 | N | M |
| STC-MGR-06 | — | Leave balances | GET `/pm/leave-balance`; PATCH `/pm/leave-balance/:userId` | 200; upsert annual/medical | F | M |

### M16 — Task Update Requests (PM ↔ Worker)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-TUR-01 | — | Manager creates request | POST `/pm/tasks/:id/update-requests` | 201, status PENDING | F | M |
| STC-TUR-02 | — | Manager lists | GET `/pm/tasks/:id/update-requests` | 200 | F | M |
| STC-TUR-03 | — | Worker views | GET `/worker/tasks/:id/update-requests` | 200 | F | M |
| STC-TUR-04 | — | Worker responds | PATCH `/worker/tasks/:id/update-requests/:rid/respond` | 200, status RESPONDED | W | M |
| STC-TUR-05 | — | Empty response | Respond with blank text | 400 | N | L |

### M17 — Subscription & Billing view (Project Manager)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-SUB-01 | — | View subscription | GET `/pm/subscription` | 200; plan/amount/status/seats | F | M |
| STC-SUB-02 | — | Billing history | GET `/pm/billing` | 200; invoices | F | L |
| STC-SUB-03 | — | No subscription | Org without active sub | 404 handled gracefully | B | L |

### M18 — Availability (Workers)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-AVL-01 | UC-PW-04 | Set availability | POST `/worker/availability` | 201 | F | M |
| STC-AVL-02 | — | List | GET `/worker/availability` | 200 | F | M |
| STC-AVL-03 | — | Update / delete | PUT/DELETE `/worker/availability/:id` | 200/204 | F | M |
| STC-AVL-04 | — | Invalid window | end before start | 400 | N | M |
| STC-AVL-05 | UC-TW-04 | Temp worker availability | Same via `/temp-worker/availability` | works identically | F | M |

### M19 — Leave self-service (Workers)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-LV-01 | UC-PW-05 | Apply leave | POST `/worker/leave` type+dates | 201, PENDING | F | H |
| STC-LV-02 | — | Invalid type/date | bad `leave_type` or end<start | 400 | N | H |
| STC-LV-03 | — | List own leave | GET `/worker/leave` | 200, only own | F | M |
| STC-LV-04 | — | Cancel pending | DELETE `/worker/leave/:id` (PENDING) | 204 | F | M |
| STC-LV-05 | — | Cancel approved | DELETE an APPROVED leave | 409 (only pending) | N | M |
| STC-LV-06 | — | Temp worker leave | Same via `/temp-worker/leave` | works | F | M |
| STC-LV-07 | W | End-to-end | Worker applies → manager approves (M15) → reflected | Status APPROVED | W | H |

### M20 — Attendance (Workers)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-ATT-01 | UC-PW-06 | Clock in | POST `/worker/attendance/clock-in` | 201; open record | F | M |
| STC-ATT-02 | UC-PW-06 | Clock out | PUT `/worker/attendance/clock-out` | 200; working_hours computed | F | M |
| STC-ATT-03 | UC-PW-07 | History | GET `/worker/attendance` | 200 | F | M |
| STC-ATT-04 | — | Double clock-in | Clock in twice without clock-out | handled (error or no duplicate open record) | N | M |
| STC-ATT-05 | UC-TW-05 | Temp attendance | Same via `/temp-worker/attendance` | works | F | M |

### M21 — Worker Tasks
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-WTK-01 | UC-PW-01 | View my tasks | GET `/worker/tasks?status=` | 200; only assigned-to-me | F | H |
| STC-WTK-02 | — | View one | GET `/worker/tasks/:id` | 200; 404 if not mine | F | M |
| STC-WTK-03 | UC-PW-02 | Acknowledge | PATCH `/worker/tasks/:id/acknowledge` | 200; status IN_PROGRESS | F | M |
| STC-WTK-04 | UC-PW-03 | Update progress | PATCH `/worker/tasks/:id/progress` `{status:COMPLETED}` | 200 | F | M |
| STC-WTK-05 | UC-TW-02 | Temp available pool | GET `/temp-worker/tasks/available` | 200; PENDING tasks matching skills | F | M |
| STC-WTK-06 | N | Invalid progress | progress with illegal status | 400 | N | M |

### M22 — Notifications (All roles)
| STC | UC | Scenario | Steps | Expected | Type | Pri |
|-----|----|----------|-------|----------|------|-----|
| STC-NTF-01 | — | List mine | GET `/notifications` | 200; only recipient's | F | M |
| STC-NTF-02 | — | Unread count | GET `/notifications/unread-count` | 200 `{count}` | F | L |
| STC-NTF-03 | — | Mark read | PATCH `/notifications/:id/read` | 200; `isRead=true` | F | M |
| STC-NTF-04 | — | Mark all read | PATCH `/notifications/read-all` | 200 | F | L |
| STC-NTF-05 | — | Delete | DELETE `/notifications/:id` | 204 | F | L |
| STC-NTF-06 | R | Other user's notif | Mark/delete a notification not yours | 404 | R | M |
| STC-NTF-07 | R | No token | GET `/notifications` w/o auth | 401 | R | M |

---

## 7. RBAC Test Matrix
Verify each cell: ✅ = allowed (2xx), ⛔ = denied (401/403). One test per non-trivial cell.

| Endpoint group | SYS_ADMIN | ORG_ADMIN | PM | PERM_WORKER | TEMP_WORKER | Public |
|----------------|:--------:|:--------:|:--:|:----------:|:----------:|:------:|
| `/admin/*` (orgs, plans, enquiries, registrations) | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/admin/content` GET (read) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/admin/content/hero,video,pricing,features` write | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/admin/content/testimonials` write | ✅ | ⛔ | ✅ | ⛔ | ⛔ | ⛔ |
| `/org-admin/*` | ⛔ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| `/pm/*` | ⛔ | ✅* | ✅ | ⛔ | ⛔ | ⛔ |
| `/worker/*` | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ⛔ |
| `/temp-worker/*` | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| `/notifications/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ |
| `/public/*`, `/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\* `/pm/*` permits `ORG_ADMIN` as well as `PROJECT_MANAGER` (per `pm.routes.js`).

---

## 8. Requirements Traceability Matrix
Every SRS use case must map to ≥ 1 passed test.

| UC | Description | Covered by |
|----|-------------|-----------|
| UC-SA-01 | View system health | STC-ORG-06 |
| UC-SA-02 | View all organisations | STC-ORG-01, STC-REG-01 |
| UC-SA-03 | Create organisation | STC-ORG-02, STC-REG-02 |
| UC-SA-04 | Suspend organisation | STC-ORG-04, STC-ORG-05 |
| UC-OA-01 | Register permanent staff | STC-STF-01 |
| UC-OA-02 | Register temporary staff | STC-STF-02 |
| UC-OA-03 | Manage departments/roles | STC-DEP-01..04, STC-ROL-01..02 |
| UC-OA-04 | Manage skill tags | STC-SKL-01/02 |
| UC-OA-05 | Assign skills to users | STC-SKL-03..05 |
| UC-PM-01 | Create task | STC-TSK-01/02 |
| UC-PM-02 | Update task | STC-TSK-05 |
| UC-PM-03 | Delete task | STC-TSK-07/08 |
| UC-PM-04 | Manual allocation | STC-ALC-02 |
| UC-PM-05 | Auto-allocate | STC-ALC-04 |
| UC-PM-06 | View eligible staff | STC-ALC-01 |
| UC-PM-07 | Working hours / team | STC-MGR-01 |
| UC-PW-01 | View assigned tasks | STC-WTK-01 |
| UC-PW-02 | Acknowledge task | STC-WTK-03 |
| UC-PW-03 | Update progress | STC-WTK-04 |
| UC-PW-04 | Set availability | STC-AVL-01..04 |
| UC-PW-05 | Apply for leave | STC-LV-01.., STC-MGR-02/03 |
| UC-PW-06 | Clock in/out | STC-ATT-01/02 |
| UC-PW-07 | Attendance history | STC-ATT-03 |
| UC-TW-01 | Profile setup | STC-PCR-01 (profile change flow) |
| UC-TW-02 | View tasks | STC-WTK-05 |
| UC-TW-03 | Update progress | STC-WTK-04 (temp) |
| UC-TW-04 | Set availability | STC-AVL-05 |
| UC-TW-05 | Clock in/out | STC-ATT-05 |
| UC-UU-01 | View features/pricing | STC-PUB-01/02, STC-CMS-01 |
| UC-UU-02 | Register organisation | STC-PUB-03..07, STC-REG-* |
| UC-UU-03 | Choose subscription | *Deferred (onboarding stub)* |
| UC-UU-04 | Submit enquiry | STC-PUB-08/09, STC-ENQ-01 |

---

## 9. Defect Reporting
Log each failure with: **ID, Title, Module/STC, Severity (Critical/High/Med/Low), Steps to reproduce, Expected vs Actual, Environment, Screenshot/response, Status**. Severity guide:
- **Critical** — crash, data loss, auth bypass, or a whole module unusable.
- **High** — a primary use case fails; no workaround.
- **Medium** — feature works with a workaround; validation/edge gaps.
- **Low** — cosmetic, copy, or minor UX.

---

## 10. Known limitations / Not yet testable (intentional stubs)
| Area | Status |
|------|--------|
| Audit logs (`/admin/logs`) | Stub — returns placeholder |
| Public org-details & choose-subscription (UC-UU-03) | Stub — onboarding/payment handled externally |
| Worker profile read (`GET /worker/profile`) | Stub — profile *changes* go through M12 |

---
*Author: FYP-26-S2-42P team · Generated as a living test plan — expand cases as features are added.*
