import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { isTeamMember, toTaskListDto } from "@/lib/task-lists";

type CreateTaskListBody = {
  name?: unknown;
  scope?: unknown;
  teamId?: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    const { searchParams } = request.nextUrl;
    const scope = searchParams.get("scope");
    const teamId = searchParams.get("teamId");

    if (scope !== "personal" && scope !== "team") {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", {
        scope: "Scope must be personal or team"
      });
    }

    if (scope === "personal") {
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

    if (!teamId) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", {
        teamId: "teamId is required for team scope"
      });
    }

    const member = await isTeamMember(teamId, currentUser.id);
    if (!member) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }

    const lists = await prisma.taskList.findMany({
      where: {
        teamId,
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
    let body: CreateTaskListBody;

    try {
      body = (await request.json()) as CreateTaskListBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scope = body.scope;
    const teamId = typeof body.teamId === "string" ? body.teamId : undefined;

    const details: Record<string, string> = {};

    if (name.length < 2) {
      details.name = "Name must be at least 2 characters";
    }

    if (scope !== "personal" && scope !== "team") {
      details.scope = "Scope must be personal or team";
    }

    if (scope === "team" && !teamId) {
      details.teamId = "teamId is required for team scope";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    if (scope === "team") {
      const member = await isTeamMember(teamId as string, currentUser.id);
      if (!member) {
        throw new ApiError(403, "FORBIDDEN", "Forbidden");
      }

      const list = await prisma.taskList.create({
        data: {
          name,
          teamId: teamId as string,
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
