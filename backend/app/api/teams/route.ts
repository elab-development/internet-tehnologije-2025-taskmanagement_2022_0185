import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { toTeamDto } from "@/lib/teams";

type CreateTeamBody = {
  name?: unknown;
  description?: unknown;
};

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
    let body: CreateTeamBody;

    try {
      body = (await request.json()) as CreateTeamBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      body.description === undefined
        ? undefined
        : typeof body.description === "string"
          ? body.description.trim()
          : undefined;

    const details: Record<string, string> = {};

    if (name.length < 2) {
      details.name = "Name must be at least 2 characters";
    }

    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      details.description = "Description must be a string";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const team = await prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          name,
          description: description && description.length > 0 ? description : null,
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
