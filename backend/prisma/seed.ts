import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const Role = {
  ADMIN: "ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  TEAM_MEMBER: "TEAM_MEMBER",
  VIEWER: "VIEWER",
} as const;
const ProjectRole = { MEMBER: "MEMBER", VIEWER: "VIEWER" } as const;
const TaskStatus = { TODO: "TODO" } as const;
const p = new PrismaClient();
async function main() {
  const specs = [
    ["Admin", "admin@neostats.local", Role.ADMIN],
    ["Project Manager", "manager@neostats.local", Role.PROJECT_MANAGER],
    ["Team Member", "member@neostats.local", Role.TEAM_MEMBER],
    ["Viewer", "viewer@neostats.local", Role.VIEWER],
  ] as const;
  const users = [];
  for (const [name, email, role] of specs)
    users.push(
      await p.user.upsert({
        where: { email },
        update: {
          name,
          role,
          active: true,
          passwordHash: await bcrypt.hash("NeoStats123!", 10),
        },
        create: {
          name,
          email,
          role,
          passwordHash: await bcrypt.hash("NeoStats123!", 10),
        },
      }),
    );
  const [admin, manager, member, viewer] = users;
  const project = await p.project.upsert({
    where: { id: "demo-project" },
    update: {
      name: "Launch project",
      description: "Demo workspace",
      managerId: manager.id,
    },
    create: {
      id: "demo-project",
      name: "Launch project",
      description: "Demo workspace",
      managerId: manager.id,
    },
  });
  for (const [user, role] of [
    [member, ProjectRole.MEMBER],
    [viewer, ProjectRole.VIEWER],
  ] as const)
    await p.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: { role },
      create: { projectId: project.id, userId: user.id, role },
    });
  const task = await p.task.upsert({
    where: { id: "demo-task" },
    update: {
      projectId: project.id,
      title: "Prepare launch checklist",
      assigneeId: member.id,
    },
    create: {
      id: "demo-task",
      projectId: project.id,
      title: "Prepare launch checklist",
      description: "Review and complete the launch checklist.",
      assigneeId: member.id,
      status: TaskStatus.TODO,
    },
  });
  if (!(await p.comment.findFirst({ where: { taskId: task.id } })))
    await p.comment.create({
      data: {
        taskId: task.id,
        authorId: manager.id,
        body: "Welcome! Please add progress here.",
      },
    });
  console.log(`Seeded ${users.length} accounts and demo project/task.`);
}
main().finally(() => p.$disconnect());
