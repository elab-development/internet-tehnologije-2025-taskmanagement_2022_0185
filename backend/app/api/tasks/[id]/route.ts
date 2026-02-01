import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskOrThrow, toTaskDto } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";

const statusValues = ["TODO", "IN_PROGRESS", "DONE"] as const;
const priorityValues = ["LOW", "MEDIUM", "HIGH"] as const;

type TaskStatus = (typeof statusValues)[number];
type TaskPriority = (typeof priorityValues)[number];

type UpdateTaskBody = {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const task = await getTaskOrThrow(params.id, currentUser.id);
    let body: UpdateTaskBody;

    try {
      body = (await request.json()) as UpdateTaskBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const title =
      body.title === undefined
        ? undefined
        : typeof body.title === "string"
          ? body.title.trim()
          : undefined;
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

    if (body.title !== undefined && typeof body.title !== "string") {
      details.title = "Title must be a string";
    } else if (title !== undefined && title.length < 2) {
      details.title = "Title must be at least 2 characters";
    }

    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      details.description = "Description must be a string";
    }

    if (priority !== undefined && !isPriority(priority)) {
      details.priority = "Priority must be LOW, MEDIUM, or HIGH";
    }

    if (status !== undefined && !isStatus(status)) {
      details.status = "Status must be TODO, IN_PROGRESS, or DONE";
    }

    const dueDate = parseDueDate(body.dueDate, details);

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const updates: Prisma.TaskUpdateInput = {};
    const hasUpdates =
      title !== undefined ||
      description !== undefined ||
      dueDate !== undefined ||
      priority !== undefined ||
      status !== undefined;

    if (!hasUpdates) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", {
        body: "No valid fields to update"
      });
    }

    if (title !== undefined) {
      updates.title = title;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate;
    }

    if (priority !== undefined) {
      updates.priority = priority as TaskPriority;
    }

    if (status !== undefined) {
      updates.status = status as TaskStatus;
      if (status === "DONE" && task.status !== "DONE") {
        updates.completedAt = new Date();
      } else if (status !== "DONE" && task.status === "DONE") {
        updates.completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: updates,
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

    return NextResponse.json({ item: toTaskDto(updated) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const task = await getTaskOrThrow(params.id, currentUser.id);

    await prisma.task.delete({
      where: { id: task.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
