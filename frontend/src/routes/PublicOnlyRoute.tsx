import { Navigate, Outlet } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useAuth } from '../auth/AuthContext'

export default function PublicOnlyRoute() {
  const { isLoadingAuth, user } = useAuth()

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner label="Checking session..." />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}

