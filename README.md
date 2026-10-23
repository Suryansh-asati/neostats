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
npm run prisma:generate --prefix backend
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

Task reads include a numeric `version`. A PATCH must send the version it read. The API uses one conditional `updateMany` matching both task ID and version while incrementing the version. If no row matches, it returns `409 TASK_VERSION_CONFLICT` and the current safe task fields. Comments can be listed by project members, added by non-viewers, and deleted by their author or the assigned project manager/admin. Admin and project management endpoints are described below.

`.env` files are ignored. Never commit local credentials.

## Implemented workflows

- Admins can list/create/update/deactivate users, create projects, assign active Project Managers, view all projects, and delete projects.
- Admins and assigned Project Managers can update/archive projects, manage project memberships and scoped membership roles, and create/delete tasks. Manager reassignment remains Admin-only.
- Team Members can read member projects, update tasks assigned to them using the required current `version`, and add comments. Viewers can read project/task/comment data but cannot mutate it.
- Users can list comments; a comment author or the assigned Project Manager/Admin can delete a comment. Inactive accounts are rejected on protected requests.
- The dashboard includes project and task creation, project rename/archive/delete controls, member role controls, task status/deletion controls, comments, and Admin user create/deactivate controls. API authorization remains authoritative.

## Local setup

Use only the local PostgreSQL service. Create the `neostats` database, copy `.env.example` to `backend/.env`, then set `DATABASE_URL` to the local account/database and set a random `JWT_SECRET` with at least 32 characters. Keep `backend/.env` private; it is ignored by Git. Copy `frontend/.env.example` to `frontend/.env.local`.

From the repository root, install and prepare the database:

```powershell
npm install --prefix backend
npm install --prefix frontend
npm run prisma:generate --prefix backend
npm run prisma:migrate --prefix backend -- --name init
npm run prisma:seed --prefix backend
```

Run these in separate terminals:

```powershell
npm run dev --prefix backend
npm run dev --prefix frontend
```

The frontend is at http://localhost:3000. The API health endpoint is http://localhost:4000/api/health.

Seeded demo credentials (all use `NeoStats123!`): Admin `admin@neostats.local`; Project Manager `manager@neostats.local`; Team Member `member@neostats.local`; Viewer `viewer@neostats.local`.

Membership roles (`MANAGER`, `MEMBER`, `VIEWER`) are project-scoped and never grant global privileges. Current limitations: this UI is a compact single-page dashboard; priority, due dates, labels, subtasks, activity history, notifications, and Kanban are not implemented. Team Members receive only their assigned tasks in project task responses. Task changes require a version and stale writes return 409 `TASK_VERSION_CONFLICT`.
