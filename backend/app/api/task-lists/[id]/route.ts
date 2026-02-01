import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { getTaskListOrThrow, toTaskListDto } from "@/lib/task-lists";
import { prisma } from "@/lib/prisma";

type UpdateTaskListBody = {
  name?: unknown;
  archived?: unknown;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const list = await getTaskListOrThrow(params.id, currentUser.id);
    let body: UpdateTaskListBody;

    try {
      body = (await request.json()) as UpdateTaskListBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const archived =
      typeof body.archived === "boolean" ? body.archived : undefined;

    const details: Record<string, string> = {};

    if (name !== undefined && name.length < 2) {
      details.name = "Name must be at least 2 characters";
    }

    if (body.archived !== undefined && typeof body.archived !== "boolean") {
      details.archived = "Archived must be a boolean";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    if (name === undefined && archived === undefined) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", {
        body: "No valid fields to update"
      });
    }

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
    await getTaskListOrThrow(params.id, currentUser.id);

    const taskCount = await prisma.task.count({
      where: { listId: params.id }
    });

    if (taskCount > 0) {
      throw new ApiError(409, "LIST_NOT_EMPTY", "Task list is not empty");
    }

    await prisma.taskList.delete({
      where: { id: params.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
