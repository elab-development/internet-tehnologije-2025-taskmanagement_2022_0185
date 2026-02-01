import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { countOwners, requireTeamOwner } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type UpdateMemberBody = {
  role?: unknown;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    await requireTeamOwner(params.teamId, currentUser.id);
    let body: UpdateMemberBody;

    try {
      body = (await request.json()) as UpdateMemberBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const role = body.role;
    const details: Record<string, string> = {};

    if (role !== "OWNER" && role !== "MEMBER") {
      details.role = "Role must be OWNER or MEMBER";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const member = await prisma.teamMember.findFirst({
      where: {
        id: params.memberId,
        teamId: params.teamId
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
      const owners = await countOwners(params.teamId);
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
    await requireTeamOwner(params.teamId, currentUser.id);

    const member = await prisma.teamMember.findFirst({
      where: {
        id: params.memberId,
        teamId: params.teamId
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
      const owners = await countOwners(params.teamId);
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
