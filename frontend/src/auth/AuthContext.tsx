import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'
import { ApiError } from '../api/http'
import type { User } from '../api/types'
import { clearStoredToken, getStoredToken, setStoredToken } from './tokenStorage'

interface RegisterPayload {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoadingAuth: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function bootstrapAuth() {
      if (!token) {
        if (isMounted) {
          setIsLoadingAuth(false)
        }
        return
      }

      try {
        const response = await authApi.me(token)
        if (isMounted) {
          setUser(response.user)
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof ApiError && error.status === 401) {
            clearStoredToken()
            setToken(null)
          }
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false)
        }
      }
    }

    void bootstrapAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password })
    setStoredToken(response.token)
    setToken(response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.register(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout(token)
    } catch {
      // Ignore logout network issues and clear client auth state.
    }

    clearStoredToken()
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoadingAuth,
      login,
      register,
      logout
    }),
    [isLoadingAuth, login, logout, register, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

