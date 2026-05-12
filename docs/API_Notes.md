# API Notes — Smart Task Allocation
**Team reference document — update as endpoints are built**

---

## Base URL
- Local: `http://localhost:5000/api/v1`
- Staging: TBD (Render URL — Daniel to update)

## Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

## JWT Payload Structure
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "PROJECT_MANAGER",
  "organisationId": 1,
  "iat": 1234567890,
  "exp": 1234569690
}
```

---

## Endpoint Overview

### Auth — `/api/v1/auth`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| POST | /login | Basil | Placeholder |
| POST | /logout | Basil | Placeholder |
| POST | /reset-password | Basil | Placeholder |

### System Admin — `/api/v1/admin`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /health | Daniel | Placeholder |
| GET | /organisations | Daniel | Placeholder |
| POST | /organisations | Daniel | Placeholder |
| PUT | /organisations/:id/suspend | Daniel | Placeholder |
| GET | /logs | Daniel | Placeholder |

### Org Admin — `/api/v1/org-admin`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /departments | Alson | Placeholder |
| POST | /departments | Alson | Placeholder |
| PUT | /departments/:id | Alson | Placeholder |
| DELETE | /departments/:id | Alson | Placeholder |
| GET | /staff | Alson | Placeholder |
| POST | /staff/permanent | Alson | Placeholder |
| POST | /staff/temporary | Alson | Placeholder |
| GET | /skills | Alson | Placeholder |
| POST | /skills | Alson | Placeholder |
| POST | /staff/:id/skills | Alson | Placeholder |

### Project Manager — `/api/v1/pm`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /tasks | Basil | Placeholder |
| POST | /tasks | Basil | Placeholder |
| GET | /tasks/:id | Basil | Placeholder |
| PUT | /tasks/:id | Basil | Placeholder |
| DELETE | /tasks/:id | Basil | Placeholder |
| POST | /tasks/:id/allocate | Basil | Placeholder |
| GET | /tasks/:id/eligible-staff | Basil | Placeholder |
| POST | /tasks/:id/auto-allocate | Basil | Placeholder |
| GET | /reports/hours | Basil | Placeholder |

### Permanent Worker — `/api/v1/worker`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /tasks | Weishi | Placeholder |
| GET | /tasks/history | Weishi | Placeholder |
| GET | /tasks/:id | Weishi | Placeholder |
| PUT | /tasks/:id/acknowledge | Weishi | Placeholder |
| PUT | /tasks/:id/progress | Weishi | Placeholder |
| GET | /profile | Weishi | Placeholder |
| PUT | /profile | Weishi | Placeholder |
| GET | /skills | Weishi | Placeholder |
| GET | /availability | Weishi | Placeholder |
| POST | /availability | Weishi | Placeholder |
| PUT | /availability/:id | Weishi | Placeholder |
| POST | /leave | Weishi | Placeholder |
| POST | /attendance/clock-in | Weishi | Placeholder |
| PUT | /attendance/clock-out | Weishi | Placeholder |
| GET | /attendance | Weishi | Placeholder |

### Temporary Worker — `/api/v1/temp-worker`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /tasks/assigned | Rachel | Placeholder |
| GET | /tasks/unassigned | Rachel | Placeholder |
| PUT | /tasks/:id/progress | Rachel | Placeholder |
| POST | /profile | Rachel | Placeholder |
| PUT | /profile | Rachel | Placeholder |
| PUT | /skills | Rachel | Placeholder |
| POST | /availability | Rachel | Placeholder |
| POST | /attendance/clock-in | Rachel | Placeholder |
| PUT | /attendance/clock-out | Rachel | Placeholder |

### Public — `/api/v1/public`
| Method | Path | Owner | Status |
|--------|------|-------|--------|
| GET | /features | Rachel | Placeholder |
| GET | /pricing | Rachel | Placeholder |
| POST | /enquiry | Rachel | Placeholder |
| POST | /organisations/register | Rachel | Placeholder |
| PUT | /organisations/:id/details | Rachel | Placeholder |
| POST | /organisations/:id/subscription | Rachel | Placeholder |

---

*Last updated: 2026-05-12*
