# Smart Task Allocation — FYP-26-S2-42P

A SaaS platform for organisations to manage staff and automate task allocation.

## Team
| Name    | Role                        |
|---------|-----------------------------|
| Basil   | Backend Lead + DB Architect |
| Weishi  | Full Stack Developer        |
| Rachel  | Backend Developer + QA      |
| Alson   | Frontend Lead + Security    |
| Daniel  | DevOps + System Admin       |

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + bcrypt
- CI/CD: GitHub Actions
- Hosting: Render (backend) + Vercel (frontend)

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 14+ — either a local install, or a free hosted database
  (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), Railway)
- Git

### Database Setup
**Option A — hosted (easiest):** create a free Postgres database (Neon/Supabase/Railway)
and copy the connection string it gives you.

**Option B — local:** install PostgreSQL, then create the database:
```bash
createdb smart_task_allocation
```
(or via pgAdmin: right-click *Databases* → *Create* → name it `smart_task_allocation`)

### Backend Setup

**Windows (PowerShell):**
```powershell
cd server
npm install
copy .env.example .env
```

**Mac/Linux:**
```bash
cd server
npm install
cp .env.example .env
```

Then open `.env` and set your Postgres connection string:
```
# local Postgres
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_task_allocation"

# or a hosted one (Neon/Supabase usually require SSL)
# DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
```

Then apply the schema and seed the database:
```powershell
npx prisma migrate deploy
npx prisma generate
node scripts/reset-hosted.js --confirm
npm run dev
```

> **Use `npx prisma migrate deploy`.** The project keeps a migration history under
> `prisma/migrations/`, so this recreates the schema exactly. After pulling a change
> to `schema.prisma`, run `npx prisma migrate deploy && npx prisma generate` again.

`scripts/reset-hosted.js` loads two fully populated demo organisations — one
project-based, one shift-based — so every feature has data to show.

### Demo Accounts

All demo accounts use the password **`SmartTask#2026`**.

| Role | Email | Organisation |
|---|---|---|
| System Admin | `sysadmin@smarttask.app` | — |
| Organisation Admin | `admin@meridian.app` | Meridian Projects (project-based) |
| Project Manager | `pm@meridian.app` | Meridian Projects |
| Permanent Worker | `alex@meridian.app` | Meridian Projects |
| Temporary Worker | `casey@meridian.app` | Meridian Projects |
| Organisation Admin | `admin@northgate.app` | Northgate Retail (shift-based) |
| Project Manager | `pm@northgate.app` | Northgate Retail |
| Permanent Worker | `sam@northgate.app` | Northgate Retail |
| Temporary Worker | `morgan@northgate.app` | Northgate Retail |

The two organisations differ deliberately: **Meridian** is project-based (projects,
resource pools, task allocation) and **Northgate** is shift-based (shift templates
and a roster). The portals change to match, so sign in to both to see each half.

> Email sending is optional. With `SENDGRID_API_KEY` blank, verification and
> password-reset links are printed to the server console instead of being sent —
> `npm run verify:links` reprints any pending one.

### Frontend Setup

**Windows (PowerShell):**
```powershell
cd client
npm install
copy .env.example .env
npm run dev
```

**Mac/Linux:**
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Branching Strategy
- `main` → production only, protected
- `dev` → integration branch, all features merge here
- `feature/` → individual feature branches

## Branch Naming
```
feature/[name]-[feature]

Examples:
  feature/basil-auto-allocation
  feature/alson-login-ui
  feature/rachel-temp-worker-api
```

## PR Rules
- All PRs target `dev` branch
- Minimum 1 reviewer before merge
- CI must pass before merge
