import type { ApiError } from './http'
import type { ValidationDetails } from './types'

const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Pogresan email ili lozinka.',
  EMAIL_IN_USE: 'Email je vec u upotrebi.',
  VALIDATION_ERROR: 'Proverite uneta polja.',
  UNAUTHORIZED: 'Morate biti prijavljeni.',
  FORBIDDEN: 'Nemate dozvolu za ovu akciju.',
  LIST_NOT_EMPTY: 'List contains tasks and cannot be deleted.'
}

export function mapApiCodeToMessage(code: string, fallbackMessage: string) {
  return CODE_MESSAGES[code] ?? fallbackMessage
}

export function extractValidationDetails(error: ApiError): ValidationDetails {
  if (error.code !== 'VALIDATION_ERROR' || typeof error.details !== 'object' || error.details === null) {
    return {}
  }

  const entries = Object.entries(error.details as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  )

  return Object.fromEntries(entries)
}

export function firstValidationMessage(details: ValidationDetails): string | null {
  const firstEntry = Object.values(details)[0]
  return firstEntry ?? null
}
