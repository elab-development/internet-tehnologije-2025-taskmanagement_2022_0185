import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export type TaskListDto = {
  id: string;
  name: string;
  ownerUserId: string | null;
  teamId: string | null;
  createdAt: Date;
  archived: boolean;
};

const taskListSelect = {
  id: true,
  name: true,
  ownerUserId: true,
  teamId: true,
  createdAt: true,
  archived: true
} as const;

export async function isTeamMember(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    },
    select: { id: true }
  });

  return Boolean(membership);
}

export async function getTaskListOrThrow(id: string, currentUserId: string) {
  const list = await prisma.taskList.findUnique({
    where: { id },
    select: taskListSelect
  });

  if (!list) {
    throw new ApiError(404, "NOT_FOUND", "Task list not found");
  }

  if (list.ownerUserId) {
    if (list.ownerUserId !== currentUserId) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }
    return list;
  }

  if (list.teamId) {
    const member = await isTeamMember(list.teamId, currentUserId);
    if (!member) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }
    return list;
  }

  throw new ApiError(403, "FORBIDDEN", "Forbidden");
}

export function toTaskListDto(list: TaskListDto) {
  return {
    id: list.id,
    name: list.name,
    ownerUserId: list.ownerUserId,
    teamId: list.teamId,
    createdAt: list.createdAt,
    archived: list.archived
  };
}
