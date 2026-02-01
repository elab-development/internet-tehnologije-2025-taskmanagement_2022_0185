import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { isTeamMember } from "@/lib/task-lists";

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  listId: string;
  createdAt: Date;
  completedAt: Date | null;
};

const taskSelect = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  priority: true,
  status: true,
  listId: true,
  createdAt: true,
  completedAt: true
} as const;

export async function getTaskOrThrow(id: string, currentUserId: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      ...taskSelect,
      list: {
        select: {
          ownerUserId: true,
          teamId: true
        }
      }
    }
  });

  if (!task) {
    throw new ApiError(404, "NOT_FOUND", "Task not found");
  }

  if (task.list.ownerUserId) {
    if (task.list.ownerUserId !== currentUserId) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }
    return task;
  }

  if (task.list.teamId) {
    const member = await isTeamMember(task.list.teamId, currentUserId);
    if (!member) {
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }
    return task;
  }

  throw new ApiError(403, "FORBIDDEN", "Forbidden");
}

export function toTaskDto(task: TaskDto) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    listId: task.listId,
    createdAt: task.createdAt,
    completedAt: task.completedAt
  };
}
