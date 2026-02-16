import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const dateTimeSchema = z.string().datetime({ offset: true });

export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

export const errorResponseSchema = z.object({
  error: errorSchema
});

export const okResponseSchema = z.object({
  ok: z.boolean()
});

export const userSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: dateTimeSchema
});

export const teamRoleSchema = z.enum(["OWNER", "MEMBER"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const taskListScopeSchema = z.enum(["personal", "team"]);
export const taskDueSchema = z.enum(["soon", "overdue", "all"]);

export const taskListSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  ownerUserId: uuidSchema.nullable(),
  teamId: uuidSchema.nullable(),
  createdAt: dateTimeSchema,
  archived: z.boolean()
});

export const taskSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  dueDate: dateTimeSchema.nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  listId: uuidSchema,
  createdAt: dateTimeSchema,
  completedAt: dateTimeSchema.nullable()
});

export const teamSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: dateTimeSchema,
  createdByUserId: uuidSchema
});

export const teamMemberUserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable()
});

export const teamMemberSchema = z.object({
  id: uuidSchema,
  role: teamRoleSchema,
  joinedAt: dateTimeSchema,
  user: teamMemberUserSchema
});

export const teamMembershipSchema = z.object({
  team: teamSchema,
  myRole: teamRoleSchema
});
