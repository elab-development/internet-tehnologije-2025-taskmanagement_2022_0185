import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { requireTeamMember, requireTeamOwner, toTeamDto } from "@/lib/teams";
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const currentUser = await requireAuthUser(request);
    const { team } = await requireTeamOwner(params.teamId, currentUser.id);

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
