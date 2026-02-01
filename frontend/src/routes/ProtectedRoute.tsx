import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute() {
  const { isLoadingAuth, user } = useAuth()
  const location = useLocation()

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner label="Checking session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

