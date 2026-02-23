import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { normalizeEmail, isValidEmail } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { requireTeamOwner } from "@/lib/teams";
import { sendAddedToTeamEmail } from "@/lib/email";
import {
  defineRouteContract,
  registerRouteContract,
  parseJsonBodyOrThrow,
  parseParamsOrThrow
} from "@/lib/openapi/contract";
import { errorResponseSchema, teamMemberSchema } from "@/lib/openapi/models";
import { z } from "zod";

const teamParamsSchema = z.object({
  teamId: z.string()
});

const addMemberBodySchema = z.object({
  email: z
    .string({ required_error: "Invalid email", invalid_type_error: "Invalid email" })
    .transform((value) => value.trim())
    .refine((value) => isValidEmail(value), "Invalid email")
});

const teamMemberResponseSchema = z.object({
  member: teamMemberSchema
});

const openApi = defineRouteContract({
  post: {
    summary: "Add existing user to team as MEMBER (owner only).",
    tags: ["Teams"],
    auth: "bearer",
    request: {
      params: teamParamsSchema,
      body: addMemberBodySchema
    },
    responses: [
      {
        status: 201,
        description: "Member added.",
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
        description: "User not found",
        schema: errorResponseSchema,
        errorCode: "USER_NOT_FOUND"
      },
      {
        status: 409,
        description: "User is already a member",
        schema: errorResponseSchema,
        errorCode: "ALREADY_MEMBER"
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

function getDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [user.firstName, user.lastName]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    )
    .join(" ")
    .trim();

  return fullName || undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const parsedParams = parseParamsOrThrow(params, teamParamsSchema);
    const { team } = await requireTeamOwner(parsedParams.teamId, currentUser.id);
    const body = await parseJsonBodyOrThrow(request, addMemberBodySchema);
    const emailInput = body.email;

    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: parsedParams.teamId,
          userId: user.id
        }
      },
      select: { id: true }
    });

    if (existing) {
      throw new ApiError(409, "ALREADY_MEMBER", "User is already a member");
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: parsedParams.teamId,
        userId: user.id,
        role: "MEMBER"
      },
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

    try {
      await sendAddedToTeamEmail({
        toEmail: user.email,
        toName: getDisplayName(user),
        teamName: team.name,
        inviterEmail: currentUser.email
      });
    } catch (emailError) {
      console.error("Failed to send added-to-team email", {
        teamId: parsedParams.teamId,
        userId: user.id,
        error: emailError
      });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




