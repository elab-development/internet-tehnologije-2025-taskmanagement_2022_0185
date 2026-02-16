import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskListOrThrow } from "@/lib/task-lists";
import { toTaskDto } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseQueryOrThrow
} from "@/lib/openapi/contract";
import {
  errorResponseSchema,
  taskSchema
} from "@/lib/openapi/models";
import { z } from "zod";

const tasksQuerySchema = z.object({
  listId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "listId is required")
  ),
  status: z
    .enum(["TODO", "IN_PROGRESS", "DONE"], {
      errorMap: () => ({ message: "Status must be TODO, IN_PROGRESS, or DONE" })
    })
    .optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH"], {
      errorMap: () => ({ message: "Priority must be LOW, MEDIUM, or HIGH" })
    })
    .optional(),
  q: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value.trim())),
  due: z
    .enum(["all", "soon", "overdue"], {
      errorMap: () => ({ message: "due must be soon, overdue, or all" })
    })
    .optional()
    .default("all")
});

const createTaskBodySchema = z.object({
  listId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "listId is required")
  ),
  title: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(2, "Title must be at least 2 characters")
  ),
  description: z
    .union([z.string(), z.null()], {
      errorMap: () => ({ message: "Description must be a string" })
    })
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : value)),
  dueDate: z
    .union([z.string(), z.null()], {
      errorMap: () => ({ message: "dueDate must be a valid ISO date string" })
    })
    .optional()
    .refine(
      (value) =>
        value === undefined || value === null || !Number.isNaN(new Date(value).getTime()),
      "dueDate must be a valid ISO date string"
    ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"], {
    errorMap: () => ({ message: "Priority must be LOW, MEDIUM, or HIGH" })
  }),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"], {
    errorMap: () => ({ message: "Status must be TODO, IN_PROGRESS, or DONE" })
  })
});

const taskCollectionResponseSchema = z.object({
  items: z.array(taskSchema)
});

const taskItemResponseSchema = z.object({
  item: taskSchema
});

const openApi = defineRouteContract({
  get: {
    summary: "List tasks from one list with filters.",
    tags: ["Tasks"],
    auth: "bearer",
    request: {
      query: tasksQuerySchema
    },
    responses: [
      {
        status: 200,
        description: "Tasks that match query filters.",
        schema: taskCollectionResponseSchema
      },
      {
        status: 401,
        description: "Unauthorized",
        schema: errorResponseSchema,
        errorCode: "UNAUTHORIZED"
      },
      {
        status: 403,
        description: "Forbidden",
        schema: errorResponseSchema,
        errorCode: "FORBIDDEN"
      },
      {
        status: 404,
        description: "Task list not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      },
      {
        status: 422,
        description: "Validation error",
        schema: errorResponseSchema,
        errorCode: "VALIDATION_ERROR"
      }
    ]
  },
  post: {
    summary: "Create a new task.",
    tags: ["Tasks"],
    auth: "bearer",
    request: {
      body: createTaskBodySchema
    },
    responses: [
      {
        status: 201,
        description: "Task created.",
        schema: taskItemResponseSchema
      },
      {
        status: 400,
        description: "Invalid JSON body",
        schema: errorResponseSchema,
        errorCode: "INVALID_JSON"
      },
      {
        status: 401,
        description: "Unauthorized",
        schema: errorResponseSchema,
        errorCode: "UNAUTHORIZED"
      },
      {
        status: 403,
        description: "Forbidden",
        schema: errorResponseSchema,
        errorCode: "FORBIDDEN"
      },
      {
        status: 404,
        description: "Task list not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      },
      {
        status: 422,
        description: "Validation error",
        schema: errorResponseSchema,
        errorCode: "VALIDATION_ERROR"
      }
    ]
  }
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    const query = parseQueryOrThrow(request, tasksQuerySchema);
    const listId = query.listId as string;
    const status = query.status as "TODO" | "IN_PROGRESS" | "DONE" | undefined;
    const priority = query.priority as "LOW" | "MEDIUM" | "HIGH" | undefined;
    const q = query.q as string | undefined;
    const due = query.due as "all" | "soon" | "overdue";

    await getTaskListOrThrow(listId, currentUser.id);

    const where: Prisma.TaskWhereInput = {
      listId
    };

    const and: Prisma.TaskWhereInput[] = [];

    if (status) {
      and.push({ status });
    }

    if (priority) {
      and.push({ priority });
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
    const body = await parseJsonBodyOrThrow(request, createTaskBodySchema);
    const listId = body.listId as string;
    const title = body.title as string;
    const description = body.description as string | null | undefined;
    const dueDateInput = body.dueDate as string | null | undefined;
    const priority = body.priority as "LOW" | "MEDIUM" | "HIGH";
    const status = body.status as "TODO" | "IN_PROGRESS" | "DONE";

    await getTaskListOrThrow(listId, currentUser.id);

    const dueDate =
      dueDateInput === undefined
        ? undefined
        : dueDateInput === null
          ? null
          : new Date(dueDateInput);

    const completedAt = status === "DONE" ? new Date() : null;

    const task = await prisma.task.create({
      data: {
        listId,
        title,
        description: description ?? null,
        dueDate: dueDate ?? null,
        priority,
        status,
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

registerRouteContract(openApi);




