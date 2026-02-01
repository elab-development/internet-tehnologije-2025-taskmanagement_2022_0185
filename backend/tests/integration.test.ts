import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";

import { POST as loginPost } from "../app/api/auth/login/route";
import { GET as meGet } from "../app/api/auth/me/route";
import { PATCH as listPatch } from "../app/api/task-lists/[id]/route";
import { GET as teamGet } from "../app/api/teams/[teamId]/route";
import { PATCH as taskPatch } from "../app/api/tasks/[id]/route";

const prisma = new PrismaClient();

const created = {
  users: [] as string[],
  teams: [] as string[],
  teamMembers: [] as string[],
  lists: [] as string[],
  tasks: [] as string[]
};

function makeJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  token?: string
) {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function createUser(email: string) {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      firstName: "Test",
      lastName: "User"
    }
  });
  created.users.push(user.id);
  return user;
}

async function login(email: string, password = "password123") {
  const request = makeJsonRequest(
    "http://localhost/api/auth/login",
    "POST",
    { email, password }
  );
  const response = await loginPost(request);
  const payload = await response.json();
  return { response, payload };
}

async function cleanup() {
  if (created.tasks.length > 0) {
    await prisma.task.deleteMany({ where: { id: { in: created.tasks } } });
  }
  if (created.lists.length > 0) {
    await prisma.taskList.deleteMany({ where: { id: { in: created.lists } } });
  }
  if (created.teamMembers.length > 0) {
    await prisma.teamMember.deleteMany({
      where: { id: { in: created.teamMembers } }
    });
  }
  if (created.teams.length > 0) {
    await prisma.team.deleteMany({ where: { id: { in: created.teams } } });
  }
  if (created.users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  }
}

describe.sequential("integration", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("login returns token and /me returns user", async () => {
    const email = `user+${Date.now()}@example.com`;
    const user = await createUser(email);

    const { response, payload } = await login(email);
    expect(response.status).toBe(200);
    expect(payload.token).toBeTruthy();

    const meRequest = makeJsonRequest(
      "http://localhost/api/auth/me",
      "GET",
      undefined,
      payload.token
    );
    const meResponse = await meGet(meRequest);
    expect(meResponse.status).toBe(200);
    const mePayload = await meResponse.json();
    expect(mePayload.user.id).toBe(user.id);
  });

  it("user cannot update another user's personal list", async () => {
    const ownerEmail = `owner+${Date.now()}@example.com`;
    const otherEmail = `other+${Date.now()}@example.com`;
    const owner = await createUser(ownerEmail);
    const other = await createUser(otherEmail);

    const list = await prisma.taskList.create({
      data: {
        name: "Owner List",
        ownerUserId: owner.id,
        teamId: null
      }
    });
    created.lists.push(list.id);

    const { payload } = await login(otherEmail);
    const patchRequest = makeJsonRequest(
      `http://localhost/api/task-lists/${list.id}`,
      "PATCH",
      { name: "Hacked" },
      payload.token
    );
    const response = await listPatch(patchRequest, { params: { id: list.id } });
    expect(response.status).toBe(403);
    const errorPayload = await response.json();
    expect(errorPayload.error.code).toBe("FORBIDDEN");
  });

  it("non-member cannot access team details", async () => {
    const ownerEmail = `owner2+${Date.now()}@example.com`;
    const outsiderEmail = `outsider+${Date.now()}@example.com`;
    const owner = await createUser(ownerEmail);
    await createUser(outsiderEmail);

    const team = await prisma.team.create({
      data: {
        name: "Secret Team",
        description: "Members only",
        createdByUserId: owner.id
      }
    });
    created.teams.push(team.id);

    const membership = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: owner.id,
        role: "OWNER"
      }
    });
    created.teamMembers.push(membership.id);

    const { payload } = await login(outsiderEmail);
    const request = makeJsonRequest(
      `http://localhost/api/teams/${team.id}`,
      "GET",
      undefined,
      payload.token
    );
    const response = await teamGet(request, { params: { teamId: team.id } });
    expect(response.status).toBe(403);
    const errorPayload = await response.json();
    expect(errorPayload.error.code).toBe("FORBIDDEN");
  });

  it("completedAt updates on status transitions", async () => {
    const email = `tasker+${Date.now()}@example.com`;
    const user = await createUser(email);
    const list = await prisma.taskList.create({
      data: {
        name: "Task List",
        ownerUserId: user.id,
        teamId: null
      }
    });
    created.lists.push(list.id);

    const task = await prisma.task.create({
      data: {
        listId: list.id,
        title: "Task",
        description: null,
        dueDate: null,
        priority: "LOW",
        status: "TODO",
        completedAt: null
      }
    });
    created.tasks.push(task.id);

    const { payload } = await login(email);

    const doneRequest = makeJsonRequest(
      `http://localhost/api/tasks/${task.id}`,
      "PATCH",
      { status: "DONE" },
      payload.token
    );
    const doneResponse = await taskPatch(doneRequest, { params: { id: task.id } });
    expect(doneResponse.status).toBe(200);
    const donePayload = await doneResponse.json();
    expect(donePayload.item.completedAt).toBeTruthy();

    const todoRequest = makeJsonRequest(
      `http://localhost/api/tasks/${task.id}`,
      "PATCH",
      { status: "TODO" },
      payload.token
    );
    const todoResponse = await taskPatch(todoRequest, { params: { id: task.id } });
    expect(todoResponse.status).toBe(200);
    const todoPayload = await todoResponse.json();
    expect(todoPayload.item.completedAt).toBeNull();
  });
});
