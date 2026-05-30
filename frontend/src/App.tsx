import { Component, ReactNode, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { LangProvider, useLang } from '@/contexts/LangContext'
import AppShell from '@/components/layout/AppShell'
import { useIsMobile } from '@/hooks/useIsMobile'

import Welcome from '@/pages/auth/Welcome'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import PatientApp from '@/pages/patient/PatientApp'
import Record from '@/pages/patient/Record'
import CaregiverApp from '@/pages/caregiver/CaregiverApp'
import Transcript from '@/pages/shared/Transcript'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-dvh bg-bg px-6">
          <div className="card max-w-sm w-full flex flex-col gap-4 text-center">
            <p className="text-lg font-800 text-ink">Something went wrong</p>
            <p className="text-sm text-ink-mute">{(this.state.error as Error).message}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Syncs profile.language from Firestore → LangContext + localStorage on every login/refresh
function LangSyncer() {
  const { profile } = useAuth()
  const { setLang } = useLang()
  useEffect(() => {
    if (profile?.language === 'bn' || profile?.language === 'en') {
      setLang(profile.language)
    }
  }, [profile?.language])
  return null
}

function RootRedirect() {
  const { firebaseUser, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl gradient-header flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="18" stroke="white" strokeWidth="2.5" />
              <path d="M14 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="22" cy="22" r="3" fill="white" />
            </svg>
          </div>
          <p className="text-sm text-ink-mute font-600">Memory Mate</p>
        </div>
      </div>
    )
  }

  if (!firebaseUser) return <Navigate to="/welcome" replace />
  if (!profile?.role) return <Navigate to="/register" replace />
  if (profile.role === 'patient') return <Navigate to="/patient" replace />
  return <Navigate to="/caregiver" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"              element={<RootRedirect />} />
      <Route path="/welcome"       element={<Welcome />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />

      <Route path="/patient/record" element={<MobileOrDesktopPage><Record /></MobileOrDesktopPage>} />
      <Route path="/patient/*"      element={<PatientApp />} />
      <Route path="/caregiver/*"    element={<CaregiverApp />} />
      <Route path="/transcript/:id" element={<MobileOrDesktopPage><Transcript /></MobileOrDesktopPage>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function MobileOrDesktopPage({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  if (isMobile) return <AppShell>{children}</AppShell>
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LangProvider>
        <AuthProvider>
          <LangSyncer />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}

