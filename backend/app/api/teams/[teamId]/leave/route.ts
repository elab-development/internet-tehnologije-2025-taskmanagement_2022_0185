import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { countOwners, getTeamOrThrow } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    await getTeamOrThrow(params.teamId);

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: params.teamId,
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
      const owners = await countOwners(params.teamId);
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
