import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Register from './pages/Register'
import TeamDetails from './pages/TeamDetails'
import Teams from './pages/Teams'

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/teams" element={<Teams />} />
        <Route path="/app/teams/:teamId" element={<TeamDetails />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
