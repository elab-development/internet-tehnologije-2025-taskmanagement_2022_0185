import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { toTeamDto } from "@/lib/teams";
import { defineRouteContract,
  registerRouteContract, parseJsonBodyOrThrow } from "@/lib/openapi/contract";
import {
  errorResponseSchema,
  teamMembershipSchema,
  teamSchema
} from "@/lib/openapi/models";
import { z } from "zod";

const createTeamBodySchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(2, "Name must be at least 2 characters")
  ),
  description: z
    .union([z.string(), z.null()], {
      errorMap: () => ({ message: "Description must be a string" })
    })
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : undefined))
});

const teamsResponseSchema = z.object({
  items: z.array(teamMembershipSchema)
});

const teamResponseSchema = z.object({
  team: teamSchema
});

const openApi = defineRouteContract({
  get: {
    summary: "List teams where current user is a member.",
    tags: ["Teams"],
    auth: "bearer",
    responses: [
      {
        status: 200,
        description: "Team memberships.",
        schema: teamsResponseSchema
      },
      {
        status: 401,
        description: "Unauthorized",
        schema: errorResponseSchema,
        errorCode: "UNAUTHORIZED"
      }
    ]
  },
  post: {
    summary: "Create team and add current user as OWNER.",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      body: createTeamBodySchema
    },
    responses: [
      {
        status: 201,
        description: "Team created.",
        schema: teamResponseSchema
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

    const memberships = await prisma.teamMember.findMany({
      where: { userId: currentUser.id },
      select: {
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            createdByUserId: true
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    const items = memberships.map((membership) => ({
      team: toTeamDto(membership.team),
      myRole: membership.role
    }));

    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuthUser(request);
    const body = await parseJsonBodyOrThrow(request, createTeamBodySchema);
    const name = body.name as string;
    const description = body.description as string | undefined;

    const team = await prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          name,
          description:
            description && description.length > 0
              ? description
              : null,
          createdByUserId: currentUser.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          createdByUserId: true
        }
      });

      await tx.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId: currentUser.id,
          role: "OWNER"
        }
      });

      return createdTeam;
    });

    return NextResponse.json({ team: toTeamDto(team) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




