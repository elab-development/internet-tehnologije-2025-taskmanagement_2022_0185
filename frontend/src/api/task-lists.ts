import { http } from './http'
import type { TaskList } from './types'

export type TaskListScope = 'personal' | 'team'

export interface TaskListsResponse {
  items: TaskList[]
}

export interface TaskListResponse {
  item: TaskList
}

export interface CreateTaskListInput {
  name: string
  scope: TaskListScope
  teamId?: string
}

export interface UpdateTaskListInput {
  name?: string
  archived?: boolean
}

export function getPersonalTaskLists() {
  return http<TaskListsResponse>('/api/task-lists?scope=personal')
}

export function getTeamTaskLists(teamId: string) {
  const query = new URLSearchParams({ scope: 'team', teamId }).toString()
  return http<TaskListsResponse>(`/api/task-lists?${query}`)
}

export function createTaskList(input: CreateTaskListInput) {
  return http<TaskListResponse>('/api/task-lists', {
    method: 'POST',
    body: input
  })
}

export function updateTaskList(id: string, input: UpdateTaskListInput) {
  return http<TaskListResponse>(`/api/task-lists/${id}`, {
    method: 'PATCH',
    body: input
  })
}

export function deleteTaskList(id: string) {
  return http<null>(`/api/task-lists/${id}`, {
    method: 'DELETE'
  })
}
