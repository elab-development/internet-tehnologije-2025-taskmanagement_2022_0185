export type TeamMemberRole = 'OWNER' | 'MEMBER'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  createdAt: string
  createdByUserId: string
}

export interface TeamMembership {
  team: Team
  myRole: TeamMemberRole
}

export interface TeamMemberUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export interface TeamMember {
  id: string
  role: TeamMemberRole
  joinedAt: string
  user: TeamMemberUser
}

export interface TaskList {
  id: string
  name: string
  ownerUserId: string | null
  teamId: string | null
  createdAt: string
  archived: boolean
}

export interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  listId: string
  createdAt: string
  completedAt: string | null
}

export interface ErrorPayload {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ValidationDetails = Record<string, string>

