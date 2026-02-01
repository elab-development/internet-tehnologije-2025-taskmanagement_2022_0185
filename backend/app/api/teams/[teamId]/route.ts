import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { requireTeamMember, toTeamDto } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const { team } = await requireTeamMember(params.teamId, currentUser.id);

    const members = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
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
