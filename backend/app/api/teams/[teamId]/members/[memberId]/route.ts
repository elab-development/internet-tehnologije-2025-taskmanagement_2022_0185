import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { countOwners, requireTeamOwner } from "@/lib/teams";
import { prisma } from "@/lib/prisma";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseParamsOrThrow
} from "@/lib/openapi/contract";
import { errorResponseSchema, teamMemberSchema } from "@/lib/openapi/models";
import { z } from "zod";

const memberParamsSchema = z.object({
  teamId: z.string(),
  memberId: z.string()
});

const updateMemberBodySchema = z.object({
  role: z.enum(["OWNER", "MEMBER"], {
    errorMap: () => ({ message: "Role must be OWNER or MEMBER" })
  })
});

const teamMemberResponseSchema = z.object({
  member: teamMemberSchema
});

const openApi = defineRouteContract({
  patch: {
    summary: "Update member role (owner only).",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: memberParamsSchema,
      body: updateMemberBodySchema
    },
    responses: [
      {
        status: 200,
        description: "Member updated.",
        schema: teamMemberResponseSchema
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
        description: "Member not found",
        schema: errorResponseSchema,
        errorCode: "NOT_FOUND"
      },
      {
        status: 409,
        description: "Owner must transfer",
        schema: errorResponseSchema,
        errorCode: "OWNER_MUST_TRANSFER"
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
    summary: "Remove member from team (owner only).",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: memberParamsSchema
    },
    responses: [
      {
        status: 204,
        description: "Member removed."
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
        description: "Member not found",
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, memberParamsSchema);
    await requireTeamOwner(parsedParams.teamId, currentUser.id);
    const body = await parseJsonBodyOrThrow(request, updateMemberBodySchema);
    const role = body.role as "OWNER" | "MEMBER";

    const member = await prisma.teamMember.findFirst({
      where: {
        id: parsedParams.memberId,
        teamId: parsedParams.teamId
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!member) {
      throw new ApiError(404, "NOT_FOUND", "Member not found");
    }

    if (member.role === "OWNER" && role === "MEMBER") {
      const owners = await countOwners(parsedParams.teamId);
      if (owners === 1) {
        throw new ApiError(409, "OWNER_MUST_TRANSFER", "Owner must transfer");
      }
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { role },
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
      }
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, memberParamsSchema);
    await requireTeamOwner(parsedParams.teamId, currentUser.id);

    const member = await prisma.teamMember.findFirst({
      where: {
        id: parsedParams.memberId,
        teamId: parsedParams.teamId
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!member) {
      throw new ApiError(404, "NOT_FOUND", "Member not found");
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

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




