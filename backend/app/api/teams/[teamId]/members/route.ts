import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { normalizeEmail, isValidEmail } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { requireTeamOwner } from "@/lib/teams";
import { sendAddedToTeamEmail } from "@/lib/email";

type AddMemberBody = {
  email?: unknown;
};

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
    const { team } = await requireTeamOwner(params.teamId, currentUser.id);
    let body: AddMemberBody;

    try {
      body = (await request.json()) as AddMemberBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const details: Record<string, string> = {};

    if (!rawEmail || !isValidEmail(rawEmail)) {
      details.email = "Invalid email";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const email = normalizeEmail(rawEmail);
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
          teamId: params.teamId,
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
        teamId: params.teamId,
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
        teamId: params.teamId,
        userId: user.id,
        error: emailError
      });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
