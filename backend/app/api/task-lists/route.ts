import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { isTeamMember, toTaskListDto } from "@/lib/task-lists";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseQueryOrThrow
} from "@/lib/openapi/contract";
import {
  errorResponseSchema,
  taskListSchema
} from "@/lib/openapi/models";
import { z } from "zod";

const taskListsQuerySchema = z
  .object({
    scope: z.enum(["personal", "team"], {
      errorMap: () => ({ message: "Scope must be personal or team" })
    }),
    teamId: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.scope === "team" && !value.teamId) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "teamId is required for team scope"
      });
    }
  });

const createTaskListBodySchema = z
  .object({
    name: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string().min(2, "Name must be at least 2 characters")
    ),
    scope: z.enum(["personal", "team"], {
      errorMap: () => ({ message: "Scope must be personal or team" })
    }),
    teamId: z.preprocess(
      (value) => (typeof value === "string" ? value : undefined),
      z.string().optional()
    )
  })
  .superRefine((value, ctx) => {
    if (value.scope === "team" && !value.teamId) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "teamId is required for team scope"
      });
    }
  });

const taskListCollectionResponseSchema = z.object({
  items: z.array(taskListSchema)
});

const taskListItemResponseSchema = z.object({
  item: taskListSchema
});

const openApi = defineRouteContract({
  get: {
    summary: "List task lists for personal or team scope.",
    tags: ["Task Lists"],
    auth: "bearer",
    request: {
      query: taskListsQuerySchema
    },
    responses: [
      {
        status: 200,
        description: "Task lists for requested scope.",
        schema: taskListCollectionResponseSchema
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
        status: 422,
        description: "Validation error",
        schema: errorResponseSchema,
        errorCode: "VALIDATION_ERROR"
      }
    ]
  },
  post: {
    summary: "Create personal or team task list.",
    tags: ["Task Lists"],
    auth: "bearer",
    request: {
      body: createTaskListBodySchema
    },
    responses: [
      {
        status: 201,
        description: "Task list created.",
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
    const query = parseQueryOrThrow(request, taskListsQuerySchema);

    if (query.scope === "personal") {
      const lists = await prisma.taskList.findMany({
        where: {
          ownerUserId: currentUser.id,
          teamId: null
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          ownerUserId: true,
          teamId: true,
          createdAt: true,
          archived: true
        }
      });

      return NextResponse.json({ items: lists.map(toTaskListDto) });
    }

    const member = await isTeamMember(query.teamId as string, currentUser.id);
    if (!member) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }

    const lists = await prisma.taskList.findMany({
      where: {
        teamId: query.teamId as string,
        ownerUserId: null
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        teamId: true,
        createdAt: true,
        archived: true
      }
    });

    return NextResponse.json({ items: lists.map(toTaskListDto) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    const body = await parseJsonBodyOrThrow(request, createTaskListBodySchema);
    const name = body.name as string;
    const scope = body.scope as "personal" | "team";
    const teamIdInput = body.teamId as string | undefined;

    if (scope === "team") {
      const teamId = teamIdInput as string;
      const member = await isTeamMember(teamId, currentUser.id);
      if (!member) {
        throw new ApiError(403, "FORBIDDEN", "Forbidden");
      }

      const list = await prisma.taskList.create({
        data: {
          name,
          teamId,
          ownerUserId: null
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

      return NextResponse.json({ item: toTaskListDto(list) }, { status: 201 });
    }

    const list = await prisma.taskList.create({
      data: {
        name,
        ownerUserId: currentUser.id,
        teamId: null
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

    return NextResponse.json({ item: toTaskListDto(list) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




