import { http } from './http'
import type { Team, TeamMember, TeamMembership, TeamMemberRole } from './types'

export interface TeamsResponse {
  items: TeamMembership[]
}

export interface TeamResponse {
  team: Team
}

export interface TeamDetailsResponse {
  team: Team
  members: TeamMember[]
}

export interface TeamMemberResponse {
  member: TeamMember
}

export interface CreateTeamInput {
  name: string
  description?: string
}

export interface AddTeamMemberInput {
  email: string
}

export interface UpdateTeamMemberInput {
  role: TeamMemberRole
}

export function getTeams() {
  return http<TeamsResponse>('/api/teams')
}

export function createTeam(input: CreateTeamInput) {
  return http<TeamResponse>('/api/teams', {
    method: 'POST',
    body: input
  })
}

export function getTeamDetails(teamId: string) {
  return http<TeamDetailsResponse>(`/api/teams/${teamId}`)
}

export function addTeamMember(teamId: string, input: AddTeamMemberInput) {
  return http<TeamMemberResponse>(`/api/teams/${teamId}/members`, {
    method: 'POST',
    body: input
  })
}

export function updateTeamMember(teamId: string, memberId: string, input: UpdateTeamMemberInput) {
  return http<TeamMemberResponse>(`/api/teams/${teamId}/members/${memberId}`, {
    method: 'PATCH',
    body: input
  })
}

export function removeTeamMember(teamId: string, memberId: string) {
  return http<null>(`/api/teams/${teamId}/members/${memberId}`, {
    method: 'DELETE'
  })
}

export function leaveTeam(teamId: string) {
  return http<{ ok: boolean }>(`/api/teams/${teamId}/leave`, {
    method: 'POST'
  })
}
