import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { requireTeamMember, requireTeamOwner, toTeamDto } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { defineRouteContract,
  registerRouteContract, parseParamsOrThrow } from "@/lib/openapi/contract";
import {
  errorResponseSchema,
  okResponseSchema,
  teamMemberSchema,
  teamSchema
} from "@/lib/openapi/models";
import { z } from "zod";

const teamParamsSchema = z.object({
  teamId: z.string()
});

const teamDetailsResponseSchema = z.object({
  team: teamSchema,
  members: z.array(teamMemberSchema)
});

const openApi = defineRouteContract({
  get: {
    summary: "Get team details and members.",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: teamParamsSchema
    },
    responses: [
      {
        status: 200,
        description: "Team details with members.",
        schema: teamDetailsResponseSchema
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
        description: "Team not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      }
    ]
  },
  delete: {
    summary: "Delete team (owner only).",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: teamParamsSchema
    },
    responses: [
      {
        status: 200,
        description: "Team deleted.",
        schema: okResponseSchema
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
        description: "Team not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      }
    ]
  }
});

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, teamParamsSchema);
    const { team } = await requireTeamMember(parsedParams.teamId, currentUser.id);

    const members = await prisma.teamMember.findMany({
      where: { teamId: parsedParams.teamId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { joinedAt: "asc" }
    });

    return NextResponse.json({
      team: toTeamDto(team),
      members
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, teamParamsSchema);
    const { team } = await requireTeamOwner(parsedParams.teamId, currentUser.id);

    await prisma.$transaction(async (tx) => {
      const teamLists = await tx.taskList.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });

      const teamListIds = teamLists.map((entry) => entry.id);

      if (teamListIds.length > 0) {
        await tx.task.deleteMany({
          where: {
            listId: { in: teamListIds }
          }
        });
      }

      await tx.taskList.deleteMany({
        where: { teamId: team.id }
      });

      await tx.teamMember.deleteMany({
        where: { teamId: team.id }
      });

      await tx.team.delete({
        where: { id: team.id }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);



