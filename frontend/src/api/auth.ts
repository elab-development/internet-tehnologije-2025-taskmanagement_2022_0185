import { http } from './http'
import type { User } from './types'

export interface RegisterInput {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  user: User
}

export interface MeResponse {
  user: User
}

export interface LogoutResponse {
  ok: boolean
}

export function register(input: RegisterInput) {
  return http<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: input
  })
}

export function login(input: LoginInput) {
  return http<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: input
  })
}

export function me(token?: string | null) {
  return http<MeResponse>('/api/auth/me', { token })
}

export function logout(token?: string | null) {
  return http<LogoutResponse>('/api/auth/logout', {
    method: 'POST',
    token
  })
}

