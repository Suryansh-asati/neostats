# Architecture note

The backend owns authentication, authorization, validation, and persistence. The Next.js frontend calls the Express API using an HTTP-only session cookie. Prisma maps five core entities: users, projects, project memberships, tasks, and comments. The local PostgreSQL database is the only persistence service.

Global roles are Admin, Project Manager, Team Member, and Viewer. Admins can list all projects and create projects. A Project Manager can manage projects where they are the assigned manager. Team Members and Viewers need a project membership to read it; team members can edit tasks assigned to themselves. Project membership roles (`MANAGER`, `MEMBER`, `VIEWER`) are scoped labels and do not elevate global role. Every API request reloads the session user and rejects inactive accounts.

Task version starts at 1. A client PATCH includes its observed version, and a single conditional database update matches `(task ID, version)` and increments the version. A stale edit receives HTTP 409 and `TASK_VERSION_CONFLICT`, with safe current task fields to support reload. PostgreSQL foreign keys and unique membership constraints protect relational integrity.
