import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
const prisma = new PrismaClient();
const app = express();
const secret = process.env.JWT_SECRET;
const origin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
if (!secret || secret.length < 32)
  throw new Error("JWT_SECRET must be set to at least 32 characters.");
const Role = {
  ADMIN: "ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  TEAM_MEMBER: "TEAM_MEMBER",
  VIEWER: "VIEWER",
} as const;
type Role = (typeof Role)[keyof typeof Role];
const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
app.use(cors({ origin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
type AuthReq = Request & { user?: { id: string; role: Role } };
const auth = async (req: AuthReq, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "UNAUTHENTICATED" });
    const claims = jwt.verify(token, secret) as { id: string };
    const u = await prisma.user.findUnique({ where: { id: claims.id } });
    if (!u?.active) return res.status(401).json({ error: "UNAUTHENTICATED" });
    req.user = { id: u.id, role: u.role };
    next();
  } catch {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
};
const isManager = async (userId: string, role: Role, projectId: string) => {
  if (role === Role.ADMIN) return true;
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { managerId: true },
  });
  return !!p && p.managerId === userId;
};
const access = async (userId: string, role: Role, projectId: string) => {
  if (role === Role.ADMIN) return true;
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      managerId: true,
      memberships: { where: { userId }, select: { id: true } },
    },
  });
  return !!p && (p.managerId === userId || p.memberships.length > 0);
};
app.get("/api/health", (_q, res) => res.json({ ok: true }));
app.post("/api/auth/login", async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "VALIDATION_ERROR" });
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (
    !user?.active ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  )
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  res.cookie(
    "session",
    jwt.sign({ id: user.id }, secret, { expiresIn: "8h" }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 3600_000,
    },
  );
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
app.post("/api/auth/logout", (_q, res) => {
  res.clearCookie("session");
  res.status(204).end();
});
app.get("/api/auth/me", auth, async (req: AuthReq, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(u);
});
app.get("/api/projects", auth, async (req: AuthReq, res) => {
  const where =
    req.user!.role === Role.ADMIN
      ? {}
      : {
          OR: [
            { managerId: req.user!.id },
            { memberships: { some: { userId: req.user!.id } } },
          ],
        };
  const projects = await prisma.project.findMany({
    where,
    include: {
      tasks: { include: { assignee: { select: { id: true, name: true } } } },
      manager: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});
app.post("/api/projects", auth, async (req: AuthReq, res) => {
  if (req.user!.role !== Role.ADMIN)
    return res.status(403).json({ error: "FORBIDDEN" });
  const b = z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(1000).optional(),
      managerId: z.string().optional(),
    })
    .safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const managerId = b.data.managerId || req.user!.id;
  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || !manager.active || manager.role !== Role.PROJECT_MANAGER)
    return res.status(400).json({ error: "INVALID_MANAGER" });
  res
    .status(201)
    .json(
      await prisma.project.create({
        data: {
          name: b.data.name,
          description: b.data.description || "",
          managerId,
        },
        include: { tasks: true },
      }),
    );
});
app.get("/api/projects/:id/tasks", auth, async (req: AuthReq, res) => {
  const projectId = String(req.params.id);
  if (!(await access(req.user!.id, req.user!.role, projectId)))
    return res.status(404).json({ error: "NOT_FOUND" });
  res.json(
    await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
});
app.post("/api/projects/:id/tasks", auth, async (req: AuthReq, res) => {
  if (!(await isManager(req.user!.id, req.user!.role, String(req.params.id))))
    return res.status(403).json({ error: "FORBIDDEN" });
  const b = z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      assigneeId: z.string().optional(),
    })
    .safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  if (b.data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: b.data.assigneeId },
      select: { active: true, role: true },
    });
    if (
      !assignee?.active ||
      assignee.role !== Role.TEAM_MEMBER ||
      !(await access(
        b.data.assigneeId,
        Role.TEAM_MEMBER,
        String(req.params.id),
      ))
    )
      return res.status(400).json({ error: "ASSIGNEE_NOT_IN_PROJECT" });
  }
  res
    .status(201)
    .json(
      await prisma.task.create({
        data: {
          projectId: String(req.params.id),
          title: b.data.title,
          description: b.data.description || "",
          assigneeId: b.data.assigneeId,
        },
        include: { assignee: { select: { id: true, name: true } } },
      }),
    );
});
app.patch("/api/tasks/:id", auth, async (req: AuthReq, res) => {
  const b = z
    .object({
      version: z.number().int().positive(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      status: z.nativeEnum(TaskStatus).optional(),
      assigneeId: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const t = await prisma.task.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!t || !(await access(req.user!.id, req.user!.role, t.projectId)))
    return res.status(404).json({ error: "NOT_FOUND" });
  const manager = await isManager(req.user!.id, req.user!.role, t.projectId);
  if (!manager && t.assigneeId !== req.user!.id)
    return res.status(403).json({ error: "FORBIDDEN" });
  if (!manager && b.data.assigneeId !== undefined)
    return res.status(403).json({ error: "FORBIDDEN" });
  if (manager && b.data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: b.data.assigneeId },
      select: { active: true, role: true },
    });
    if (
      !assignee?.active ||
      assignee.role !== Role.TEAM_MEMBER ||
      !(await access(b.data.assigneeId, Role.TEAM_MEMBER, t.projectId))
    )
      return res.status(400).json({ error: "ASSIGNEE_NOT_IN_PROJECT" });
  }
  const { version, ...data } = b.data;
  const update = await prisma.task.updateMany({
    where: { id: t.id, version },
    data: { ...data, version: { increment: 1 } },
  });
  if (!update.count) {
    const current = await prisma.task.findUnique({
      where: { id: t.id },
      select: {
        id: true,
        version: true,
        status: true,
        title: true,
        description: true,
      },
    });
    return res.status(409).json({ error: "TASK_VERSION_CONFLICT", current });
  }
  res.json(
    await prisma.task.findUnique({
      where: { id: t.id },
      include: { assignee: { select: { id: true, name: true } } },
    }),
  );
});
app.post("/api/tasks/:id/comments", auth, async (req: AuthReq, res) => {
  const b = z.object({ body: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const t = await prisma.task.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!t || !(await access(req.user!.id, req.user!.role, t.projectId)))
    return res.status(404).json({ error: "NOT_FOUND" });
  if (req.user!.role === Role.VIEWER)
    return res.status(403).json({ error: "FORBIDDEN" });
  res
    .status(201)
    .json(
      await prisma.comment.create({
        data: { taskId: t.id, authorId: req.user!.id, body: b.data.body },
        include: { author: { select: { id: true, name: true } } },
      }),
    );
});
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err instanceof Error ? err.message : "Unexpected error");
  res.status(500).json({ error: "INTERNAL_ERROR" });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on ${port}`));
