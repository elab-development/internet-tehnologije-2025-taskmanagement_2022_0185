import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskListOrThrow } from "@/lib/task-lists";
import { toTaskDto } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";

const statusValues = ["TODO", "IN_PROGRESS", "DONE"] as const;
const priorityValues = ["LOW", "MEDIUM", "HIGH"] as const;

type TaskStatus = (typeof statusValues)[number];
type TaskPriority = (typeof priorityValues)[number];

type CreateTaskBody = {
  listId?: unknown;
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
  priority?: unknown;
  status?: unknown;
};

function parseDueDate(value: unknown, details: Record<string, string>) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    details.dueDate = "dueDate must be a valid ISO date string";
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    details.dueDate = "dueDate must be a valid ISO date string";
    return undefined;
  }
  return parsed;
}

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && statusValues.includes(value as TaskStatus);
}

function isPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && priorityValues.includes(value as TaskPriority);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    const { searchParams } = request.nextUrl;
    const listId = searchParams.get("listId")?.trim();
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const q = searchParams.get("q")?.trim();
    const due = searchParams.get("due") ?? "all";

    const details: Record<string, string> = {};

    if (!listId) {
      details.listId = "listId is required";
    }

    if (statusParam && !isStatus(statusParam)) {
      details.status = "Status must be TODO, IN_PROGRESS, or DONE";
    }

    if (priorityParam && !isPriority(priorityParam)) {
      details.priority = "Priority must be LOW, MEDIUM, or HIGH";
    }

    if (due !== "all" && due !== "soon" && due !== "overdue") {
      details.due = "due must be soon, overdue, or all";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    await getTaskListOrThrow(listId as string, currentUser.id);

    const where: Prisma.TaskWhereInput = {
      listId
    };

    const and: Prisma.TaskWhereInput[] = [];

    if (statusParam) {
      and.push({ status: statusParam as TaskStatus });
    }

    if (priorityParam) {
      and.push({ priority: priorityParam as TaskPriority });
    }

    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    if (due === "soon") {
      const now = new Date();
      const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      and.push({ status: { not: "DONE" } });
      and.push({ dueDate: { gte: now, lte: soon } });
    }

    if (due === "overdue") {
      const now = new Date();
      and.push({ status: { not: "DONE" } });
      and.push({ dueDate: { lt: now } });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        listId: true,
        createdAt: true,
        completedAt: true
      }
    });

    return NextResponse.json({ items: tasks.map(toTaskDto) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    let body: CreateTaskBody;

    try {
      body = (await request.json()) as CreateTaskBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const listId = typeof body.listId === "string" ? body.listId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      body.description === undefined
        ? undefined
        : body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description.trim()
            : undefined;
    const priority = body.priority;
    const status = body.status;

    const details: Record<string, string> = {};

    if (!listId) {
      details.listId = "listId is required";
    }

    if (title.length < 2) {
      details.title = "Title must be at least 2 characters";
    }

    if (!isPriority(priority)) {
      details.priority = "Priority must be LOW, MEDIUM, or HIGH";
    }

    if (!isStatus(status)) {
      details.status = "Status must be TODO, IN_PROGRESS, or DONE";
    }

    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      details.description = "Description must be a string";
    }

    const dueDate = parseDueDate(body.dueDate, details);

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    await getTaskListOrThrow(listId, currentUser.id);

    const completedAt = status === "DONE" ? new Date() : null;

    const task = await prisma.task.create({
      data: {
        listId,
        title,
        description: description ?? null,
        dueDate: dueDate ?? null,
        priority: priority as TaskPriority,
        status: status as TaskStatus,
        completedAt
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        listId: true,
        createdAt: true,
        completedAt: true
      }
    });

    return NextResponse.json({ item: toTaskDto(task) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
