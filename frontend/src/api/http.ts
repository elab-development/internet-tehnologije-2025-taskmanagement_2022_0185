import { getStoredToken } from '../auth/tokenStorage'
import type { ErrorPayload } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface HttpOptions {
  method?: HttpMethod
  body?: unknown
  headers?: HeadersInit
  token?: string | null
}

function hasJsonContentType(response: Response) {
  const contentType = response.headers.get('content-type')
  return Boolean(contentType && contentType.includes('application/json'))
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  if (hasJsonContentType(response)) {
    return response.json()
  }

  const text = await response.text()
  return text.length > 0 ? text : null
}

function makeApiError(response: Response, parsedBody: unknown) {
  const payload = parsedBody as ErrorPayload | null
  const code = payload?.error?.code ?? 'UNKNOWN_ERROR'
  const message = payload?.error?.message ?? `Request failed with status ${response.status}`
  const details = payload?.error?.details

  return new ApiError(response.status, code, message, details)
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const hasBody = options.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = options.token ?? getStoredToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined
  })

  const parsedBody = await parseResponseBody(response)

  if (!response.ok) {
    throw makeApiError(response, parsedBody)
  }

  return parsedBody as T
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

