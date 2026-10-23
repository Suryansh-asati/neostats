# NeoStats

Local collaborative project management demo. PostgreSQL runs on the laptop; Express API and Next.js UI run as separate processes.

## Prerequisites

- Node.js 22+ and npm
- PostgreSQL 14+ running locally, with a `neostats` database

Create the local database as a PostgreSQL administrator (`createdb neostats`, or use pgAdmin). Copy `.env.example` to `backend/.env` and set `DATABASE_URL` to your local account/password. Set a private random `JWT_SECRET`. Copy `frontend/.env.example` to `frontend/.env.local`.

## Install and run

In separate terminals:

```powershell
npm install --prefix backend
npm install --prefix frontend
npm run prisma:migrate --prefix backend -- --name init
npm run prisma:seed --prefix backend
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open http://localhost:3000. API health: http://localhost:4000/api/health.

## Demo accounts

All seeded accounts use `NeoStats123!`:

- Admin: `admin@neostats.local`
- Project Manager: `manager@neostats.local`
- Team Member: `member@neostats.local`
- Viewer: `viewer@neostats.local`

## Architecture and authorization

`backend/` is an Express TypeScript REST API and Prisma data layer; `frontend/` is a separate Next.js App Router UI. PostgreSQL stores users, projects, project memberships, tasks, and comments. Passwords use bcrypt hashes. Login issues an HTTP-only, same-site session cookie; every protected request reloads the user and checks that the account is active. Global roles are stored in the database and never accepted from request bodies. Admins see all projects and create projects; project managers manage projects assigned to them; members/viewers see only projects where they have membership. Project-level roles are `MANAGER`, `MEMBER`, and `VIEWER`; they express membership capabilities only and never grant global privileges. Team members can edit assigned tasks; viewers are read-only.

Task reads include a numeric `version`. A PATCH must send the version it read. The API uses one conditional `updateMany` matching both task ID and version while incrementing the version. If no row matches, it returns `409 TASK_VERSION_CONFLICT` and the current safe task fields. Comments can be added by non-viewers with project access; deletion and broader user/project administration routes are not yet included in this foundation.

`.env` files are ignored. Never commit local credentials.
