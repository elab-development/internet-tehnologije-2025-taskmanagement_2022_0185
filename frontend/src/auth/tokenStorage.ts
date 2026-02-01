export const AUTH_TOKEN_KEY = 'auth_token'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getStoredToken() {
  if (!canUseStorage()) {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredToken(token: string) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearStoredToken() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

