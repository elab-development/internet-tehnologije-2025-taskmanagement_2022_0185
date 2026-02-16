import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { countOwners, getTeamOrThrow } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import { defineRouteContract,
  registerRouteContract, parseParamsOrThrow } from "@/lib/openapi/contract";
import { errorResponseSchema, okResponseSchema } from "@/lib/openapi/models";
import { z } from "zod";

const teamParamsSchema = z.object({
  teamId: z.string()
});

const openApi = defineRouteContract({
  post: {
    summary: "Leave team membership.",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: teamParamsSchema
    },
    responses: [
      {
        status: 200,
        description: "Membership removed.",
        schema: okResponseSchema
      },
      {
        status: 401,
        description: "Unauthorized",
        schema: errorResponseSchema,
        errorCode: "UNAUTHORIZED"
      },
      {
        status: 404,
        description: "Membership not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      },
      {
        status: 409,
        description: "Owner must transfer",
        schema: errorResponseSchema,
        errorCode: "OWNER_MUST_TRANSFER"
      }
    ]
  }
});

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, teamParamsSchema);
    await getTeamOrThrow(parsedParams.teamId);

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: parsedParams.teamId,
          userId: currentUser.id
        }
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!member) {
      throw new ApiError(404, "NOT_FOUND", "Membership not found");
    }

    if (member.role === "OWNER") {
      const owners = await countOwners(parsedParams.teamId);
      if (owners === 1) {
        throw new ApiError(409, "OWNER_MUST_TRANSFER", "Owner must transfer");
      }
    }

    await prisma.teamMember.delete({
      where: { id: member.id }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);



