import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export type TeamRole = "OWNER" | "MEMBER";

const teamSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  createdByUserId: true
} as const;

export async function getTeamOrThrow(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: teamSelect
  });

  if (!team) {
    throw new ApiError(404, "NOT_FOUND", "Team not found");
  }

  return team;
}

export async function getTeamMemberRole(teamId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    },
    select: { role: true }
  });

  return member?.role ?? null;
}

export async function requireTeamMember(teamId: string, userId: string) {
  const team = await getTeamOrThrow(teamId);
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      userId: true
    }
  });

  if (!member) {
    throw new ApiError(403, "FORBIDDEN", "Forbidden");
  }

  return { team, member };
}

export async function requireTeamOwner(teamId: string, userId: string) {
  const { team, member } = await requireTeamMember(teamId, userId);
  if (member.role !== "OWNER") {
    throw new ApiError(403, "FORBIDDEN", "Forbidden");
  }
  return { team, member };
}

export async function countOwners(teamId: string) {
  return prisma.teamMember.count({
    where: {
      teamId,
      role: "OWNER"
    }
  });
}

export function toTeamDto(team: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  createdByUserId: string;
}) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdAt: team.createdAt,
    createdByUserId: team.createdByUserId
  };
}
