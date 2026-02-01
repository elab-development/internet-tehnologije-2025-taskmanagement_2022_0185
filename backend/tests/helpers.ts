import http from "node:http";
import path from "node:path";
import { AddressInfo } from "node:net";
import next from "next";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { expect } from "vitest";

export type ApiResponse<T = unknown> = {
  status: number;
  headers: Headers;
  json: T | null;
  text: string | null;
};

const prisma = new PrismaClient();

let server: http.Server | null = null;
let baseUrl: string | null = null;

export async function startTestServer() {
  if (server && baseUrl) {
    return baseUrl;
  }

  const appDir = path.resolve(__dirname, "..");
  const app = next({ dev: true, dir: appDir });
  const handle = app.getRequestHandler();
  await app.prepare();

  server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise<void>((resolve) => {
    server?.listen(0, resolve);
  });

  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://localhost:${port}`;
  return baseUrl;
}

export async function stopTestServer() {
  if (!server) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server?.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
  server = null;
  baseUrl = null;
}

export function getBaseUrl() {
  if (!baseUrl) {
    throw new Error("Test server not started");
  }
  return baseUrl;
}

export async function apiFetch(
  urlPath: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<ApiResponse> {
  const method = options?.method ?? "GET";
  const headers = new Headers(options?.headers ?? {});

  if (options?.body !== undefined && !headers.get("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getBaseUrl()}${urlPath}`, {
    method,
    headers,
    body:
      options?.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get("content-type") ?? "";
  let json: unknown = null;
  let text: string | null = null;

  if (contentType.includes("application/json")) {
    json = await response.json();
  } else {
    text = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    json,
    text
  };
}

export async function createUser(
  email: string,
  password: string,
  firstName = "Test",
  lastName = "User"
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      hashedPassword,
      firstName,
      lastName
    }
  });
}

export async function login(email: string, password: string) {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });

  if (response.status !== 200 || !response.json) {
    throw new Error("Login failed in test helper");
  }

  const data = response.json as { token: string };
  return data.token;
}

export function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

export async function createTeam(
  token: string,
  name: string,
  description?: string
) {
  const response = await apiFetch("/api/teams", {
    method: "POST",
    headers: authHeader(token),
    body: { name, description }
  });

  if (response.status !== 201 || !response.json) {
    throw new Error("Create team failed in test helper");
  }

  return (response.json as { team: { id: string } }).team;
}

export async function addMember(
  ownerToken: string,
  teamId: string,
  email: string
) {
  const response = await apiFetch(`/api/teams/${teamId}/members`, {
    method: "POST",
    headers: authHeader(ownerToken),
    body: { email }
  });

  if (response.status !== 201 || !response.json) {
    throw new Error("Add member failed in test helper");
  }

  return (response.json as { member: { id: string } }).member;
}

export async function createPersonalList(token: string, name: string) {
  const response = await apiFetch("/api/task-lists", {
    method: "POST",
    headers: authHeader(token),
    body: { name, scope: "personal" }
  });

  if (response.status !== 201 || !response.json) {
    throw new Error("Create personal list failed in test helper");
  }

  return (response.json as { item: { id: string } }).item;
}

export async function createTeamList(
  token: string,
  teamId: string,
  name: string
) {
  const response = await apiFetch("/api/task-lists", {
    method: "POST",
    headers: authHeader(token),
    body: { name, scope: "team", teamId }
  });

  if (response.status !== 201 || !response.json) {
    throw new Error("Create team list failed in test helper");
  }

  return (response.json as { item: { id: string } }).item;
}

export async function createTask(
  token: string,
  listId: string,
  payload: {
    title: string;
    description?: string | null;
    dueDate?: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "TODO" | "IN_PROGRESS" | "DONE";
  }
) {
  const response = await apiFetch("/api/tasks", {
    method: "POST",
    headers: authHeader(token),
    body: { listId, ...payload }
  });

  if (response.status !== 201 || !response.json) {
    throw new Error("Create task failed in test helper");
  }

  return (response.json as { item: { id: string } }).item;
}

export async function cleanupDb() {
  await prisma.task.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export async function assertError(
  response: ApiResponse,
  status: number,
  code: string
) {
  expect(response.status).toBe(status);
  const contentType = response.headers.get("content-type") ?? "";
  expect(contentType).toContain("application/json");
  expect(response.json).toBeTruthy();
  const payload = response.json as {
    error: { code: string; message: string; details?: unknown };
  };
  expect(payload.error).toBeTruthy();
  expect(payload.error.code).toBe(code);
  expect(typeof payload.error.message).toBe("string");
}
