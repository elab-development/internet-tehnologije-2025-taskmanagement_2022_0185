import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskListOrThrow, toTaskListDto } from "@/lib/task-lists";
import { prisma } from "@/lib/prisma";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseParamsOrThrow
} from "@/lib/openapi/contract";
import { errorResponseSchema, taskListSchema } from "@/lib/openapi/models";
import { z } from "zod";

const taskListIdParamsSchema = z.object({
  id: z.string()
});

const updateTaskListBodySchema = z
  .object({
    name: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : undefined),
      z.string().min(2, "Name must be at least 2 characters").optional()
    ),
    archived: z.preprocess(
      (value) => value,
      z
        .boolean({ invalid_type_error: "Archived must be a boolean" })
        .optional()
    )
  })
  .superRefine((value, ctx) => {
    if (value.name === undefined && value.archived === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "No valid fields to update"
      });
    }
  });

const taskListItemResponseSchema = z.object({
  item: taskListSchema
});

const openApi = defineRouteContract({
  patch: {
    summary: "Update task list fields.",
    tags: ["Task Lists"],
    auth: "bearer",
    request: {
      params: taskListIdParamsSchema,
      body: updateTaskListBodySchema
    },
    responses: [
      {
        status: 200,
        description: "Task list updated.",
        schema: taskListItemResponseSchema
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
  },
  delete: {
    summary: "Delete task list.",
    tags: ["Task Lists"],
    auth: "bearer",
    request: {
      params: taskListIdParamsSchema
    },
    responses: [
      {
        status: 204,
        description: "Task list deleted."
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
        status: 409,
        description: "Task list is not empty",
        schema: errorResponseSchema,
        errorCode: "LIST_NOT_EMPTY"
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
    const parsedParams = parseParamsOrThrow(params, taskListIdParamsSchema);
    const list = await getTaskListOrThrow(parsedParams.id, currentUser.id);
    const body = await parseJsonBodyOrThrow(request, updateTaskListBodySchema);
    const name = body.name as string | undefined;
    const archived = body.archived as boolean | undefined;

    const updated = await prisma.taskList.update({
      where: { id: list.id },
      data: {
        name,
        archived
      },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        teamId: true,
        createdAt: true,
        archived: true
      }
    });

    return NextResponse.json({ item: toTaskListDto(updated) });
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
    const parsedParams = parseParamsOrThrow(params, taskListIdParamsSchema);
    await getTaskListOrThrow(parsedParams.id, currentUser.id);

    const taskCount = await prisma.task.count({
      where: { listId: parsedParams.id }
    });

    if (taskCount > 0) {
      throw new ApiError(409, "LIST_NOT_EMPTY", "Task list is not empty");
    }

    await prisma.taskList.delete({
      where: { id: parsedParams.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




