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
npx prisma db push
npx prisma db seed
npm run dev
```

> **Use `npx prisma db push` — not `prisma migrate`.** This project syncs the schema
> directly with `db push` and does not keep a migration history. After pulling any
> change to `schema.prisma`, run `npx prisma db push` again to stay in sync.

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
