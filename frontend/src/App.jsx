import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './context/AuthContext'
import Layout from './components/Layout'
import SpaceBackground from './components/SpaceBackground'
import { Loading } from './components/ui'
import Splash from './pages/Splash'
import AuthPage from './pages/AuthPage'
import ChildPicker from './pages/ChildPicker'
import AvatarCreator from './pages/AvatarCreator'
import Dashboard from './pages/Dashboard'

// Heavy / rarely-first pages are lazy-loaded (the 3D solar system is the biggest chunk).
const SolarSystemPage = lazy(() => import('./pages/SolarSystemPage'))
const MissionsPage = lazy(() => import('./pages/MissionsPage'))
const MissionPlay = lazy(() => import('./pages/MissionPlay'))
const RocketLab = lazy(() => import('./pages/RocketLab'))
const AstroBotPage = lazy(() => import('./pages/AstroBotPage'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Certificate = lazy(() => import('./pages/Certificate'))
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function Protected({ children, needChild = true }) {
  const { parent, childId, booting, profile } = useApp()
  const loc = useLocation()
  if (booting) return <Loading text="Starting engines..." full />
  if (!parent) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (needChild && !childId) return <Navigate to="/who" replace />
  if (needChild && profile && !profile.avatar && loc.pathname !== '/avatar') return <Navigate to="/avatar" replace />
  return children
}

export default function App() {
  const fallback = <Loading text="Loading mission..." />
  return (
    <>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/who" element={<Protected needChild={false}><ChildPicker /></Protected>} />
        <Route path="/avatar" element={<Protected><AvatarCreator /></Protected>} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/home" element={<Dashboard />} />
          <Route path="/planets" element={<Suspense fallback={fallback}><SolarSystemPage /></Suspense>} />
          <Route path="/missions" element={<Suspense fallback={fallback}><MissionsPage /></Suspense>} />
          <Route path="/missions/:code" element={<Suspense fallback={fallback}><MissionPlay /></Suspense>} />
          <Route path="/rocket-lab" element={<Suspense fallback={fallback}><RocketLab /></Suspense>} />
          <Route path="/astrobot" element={<Suspense fallback={fallback}><AstroBotPage /></Suspense>} />
          <Route path="/achievements" element={<Suspense fallback={fallback}><Achievements /></Suspense>} />
          <Route path="/certificate" element={<Suspense fallback={fallback}><Certificate /></Suspense>} />
          <Route path="/parents" element={<Suspense fallback={fallback}><ParentDashboard /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={fallback}><ProfilePage /></Suspense>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <SpaceBackground />
      <div className="card max-w-md">
        <h1 className="text-4xl font-black text-star">Lost in space!</h1>
        <p className="my-3 text-xl font-bold">We could not find that page.</p>
        <a href="/home" className="btn btn-yellow">Back to base</a>
      </div>
    </div>
  )
}
