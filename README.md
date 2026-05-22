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
- Database: MySQL + Prisma ORM
- Auth: JWT + bcrypt
- CI/CD: GitHub Actions
- Hosting: Render (backend) + Vercel (frontend)

## Getting Started

### Prerequisites
- Node.js v18+
- XAMPP (for MySQL) — start the **Apache** and **MySQL** services
- Git

### Database Setup
1. Open **phpMyAdmin** (`http://localhost/phpmyadmin`)
2. Create a new database named **`smart_task_allocation`**

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

Then open `.env` and set:
```
DATABASE_URL="mysql://root:@localhost:3306/smart_task_allocation"
```

Then apply the schema and seed the database:
```powershell
npx prisma db push
npx prisma db seed
npm run dev
```

> **Do not run `npx prisma migrate dev` or `npx prisma migrate reset`** — the migrations are out of sync with the schema. Always use `prisma db push` to set up the database.

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
