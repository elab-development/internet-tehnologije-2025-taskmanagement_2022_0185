import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import Button from './Button'
import { useAuth } from '../auth/AuthContext'

const NAV_LINK_CLASSES =
  'rounded-md px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 hover:text-slate-900'

function linkClassName(isActive: boolean) {
  if (isActive) {
    return `${NAV_LINK_CLASSES} bg-slate-900 text-white hover:bg-slate-900 hover:text-white`
  }

  return `${NAV_LINK_CLASSES} text-slate-600`
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-2">
          <NavLink className={({ isActive }) => linkClassName(isActive)} to="/app" end>
            Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => linkClassName(isActive)} to="/app/teams">
            Teams
          </NavLink>
          <NavLink className={({ isActive }) => linkClassName(isActive)} to="/app/profile">
            Profile
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">{displayName}</p>
          <Button variant="secondary" isLoading={isLoggingOut} onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

