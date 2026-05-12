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
- PostgreSQL (local or Docker)
- Git

### Backend Setup
```bash
cd server
npm install
cp .env.example .env        # fill in your values
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
cp .env.example .env        # fill in your values
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
