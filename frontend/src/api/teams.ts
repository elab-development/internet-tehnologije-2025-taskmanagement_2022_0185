import { http } from './http'
import type { TeamMembership } from './types'

export interface TeamsResponse {
  items: TeamMembership[]
}

export function getTeams() {
  return http<TeamsResponse>('/api/teams')
}
