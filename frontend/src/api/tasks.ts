import { http } from './http'
import type { Task, TaskPriority, TaskStatus } from './types'

export type TaskDueFilter = 'all' | 'soon' | 'overdue'

export interface TasksResponse {
  items: Task[]
}

export interface TaskResponse {
  item: Task
}

export interface GetTasksFilters {
  listId: string
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  q?: string
  due?: TaskDueFilter
}

export interface CreateTaskInput {
  listId: string
  title: string
  description?: string | null
  dueDate?: string | null
  priority: TaskPriority
  status: TaskStatus
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  dueDate?: string | null
  priority?: TaskPriority
  status?: TaskStatus
}

export function getTasks(filters: GetTasksFilters) {
  const query = new URLSearchParams({ listId: filters.listId })

  if (filters.status && filters.status !== 'all') {
    query.set('status', filters.status)
  }

  if (filters.priority && filters.priority !== 'all') {
    query.set('priority', filters.priority)
  }

  if (filters.q) {
    query.set('q', filters.q)
  }

  query.set('due', filters.due ?? 'all')

  return http<TasksResponse>(`/api/tasks?${query.toString()}`)
}

export function createTask(input: CreateTaskInput) {
  return http<TaskResponse>('/api/tasks', {
    method: 'POST',
    body: input
  })
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return http<TaskResponse>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: input
  })
}

export function deleteTask(id: string) {
  return http<null>(`/api/tasks/${id}`, {
    method: 'DELETE'
  })
}
