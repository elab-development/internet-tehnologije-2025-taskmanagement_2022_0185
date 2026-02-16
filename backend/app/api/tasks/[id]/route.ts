import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskOrThrow, toTaskDto } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseParamsOrThrow
} from "@/lib/openapi/contract";
import { errorResponseSchema, taskSchema } from "@/lib/openapi/models";
import { z } from "zod";

const taskIdParamsSchema = z.object({
  id: z.string()
});

const updateTaskBodySchema = z
  .object({
    title: z.preprocess(
      (value) => value,
      z
        .string({ invalid_type_error: "Title must be a string" })
        .transform((current) => current.trim())
        .refine((current) => current.length >= 2, "Title must be at least 2 characters")
        .optional()
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
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH"], {
        errorMap: () => ({ message: "Priority must be LOW, MEDIUM, or HIGH" })
      })
      .optional(),
    status: z
      .enum(["TODO", "IN_PROGRESS", "DONE"], {
        errorMap: () => ({ message: "Status must be TODO, IN_PROGRESS, or DONE" })
      })
      .optional()
  })
  .superRefine((value, ctx) => {
    const hasUpdates =
      value.title !== undefined ||
      value.description !== undefined ||
      value.dueDate !== undefined ||
      value.priority !== undefined ||
      value.status !== undefined;

    if (!hasUpdates) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "No valid fields to update"
      });
    }
  });

const taskItemResponseSchema = z.object({
  item: taskSchema
});

const openApi = defineRouteContract({
  patch: {
    summary: "Update an existing task.",
    tags: ["Tasks"],
    auth: "bearer",
    request: {
      params: taskIdParamsSchema,
      body: updateTaskBodySchema
    },
    responses: [
      {
        status: 200,
        description: "Task updated.",
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
        description: "Task not found",
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
  delete: {
    summary: "Delete a task.",
    tags: ["Tasks"],
    auth: "bearer",
    request: {
      params: taskIdParamsSchema
    },
    responses: [
      {
        status: 204,
        description: "Task deleted."
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
        description: "Task not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      }
    ]
  }
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, taskIdParamsSchema);
    const task = await getTaskOrThrow(parsedParams.id, currentUser.id);
    const body = await parseJsonBodyOrThrow(request, updateTaskBodySchema);
    const title = body.title as string | undefined;
    const description = body.description as string | null | undefined;
    const dueDate = body.dueDate as string | null | undefined;
    const priority = body.priority as "LOW" | "MEDIUM" | "HIGH" | undefined;
    const status = body.status as "TODO" | "IN_PROGRESS" | "DONE" | undefined;

    const updates: Prisma.TaskUpdateInput = {};

    if (title !== undefined) {
      updates.title = title;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate === null ? null : new Date(dueDate);
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    if (status !== undefined) {
      updates.status = status;
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
    const parsedParams = parseParamsOrThrow(params, taskIdParamsSchema);
    const task = await getTaskOrThrow(parsedParams.id, currentUser.id);

    await prisma.task.delete({
      where: { id: task.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




