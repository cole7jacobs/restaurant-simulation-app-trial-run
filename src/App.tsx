import { StudentDecisionForm } from './routes/student/StudentDecisionForm'
import type { ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DevPreviewProvider, useDevPreview } from './context/DevPreviewContext'
import { LoginPage } from './routes/LoginPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { StudentLayout } from './routes/student/StudentLayout'
import { StudentHomePage } from './routes/student/StudentHomePage'
import { ResultsPage } from './routes/student/ResultsPage'
import { StudentResultsDashboard } from './routes/student/StudentResultsDashboard'
import { ProfessorLayout } from './routes/professor/ProfessorLayout'
import { TeamReviewPage } from './routes/professor/TeamReviewPage'
import { ProfessorSectionRedirect, ProfessorWorkspace } from './routes/professor/ProfessorWorkspace'
import { DevPreviewSelector } from './routes/DevPreviewSelector'
import { AuthProvider, DemoAuthProvider, useAuth } from './context/AuthContext'
import { ProfessorAccountPage, StudentAccountHome } from './routes/AccountPages'
import { Button } from './components/ui/Button'

function RoleLayout({ role, children }: { role: 'student' | 'professor'; children: ReactElement }) {
  const { session, ready, expired, unavailable, refresh } = useAuth()
  const { role: previewRole } = useDevPreview()
  if (!ready) return <p role="status" className="p-6">Checking session…</p>
  if (session) {
    if (unavailable) return <SessionUnavailable retry={refresh} />
    return session.account.role === role ? children : <Navigate to={`/${session.account.role}/home`} replace />
  }
  if (import.meta.env.DEV && !expired && previewRole) {
    return previewRole === role ? children : <Navigate to={`/${previewRole}/home`} replace />
  }
  return <Navigate to="/login" replace />
}

function SessionUnavailable({ retry }: { retry: () => Promise<void> }) {
  return <main className="p-6 space-y-4">
    <p role="alert">Unable to check your session.</p>
    <Button onClick={() => void retry()}>Try again</Button>
  </main>
}

function RolePage({ preview, signedIn }: { preview: ReactElement; signedIn: ReactElement }) {
  return useAuth().session ? signedIn : preview
}

function HomeRedirect() {
  const { session, ready, expired } = useAuth()
  const { role } = useDevPreview()
  if (!ready) return <p role="status" className="p-6">Checking session…</p>
  const active = session?.account.role ?? (import.meta.env.DEV && !expired ? role : null)
  return <Navigate to={active ? `/${active}/home` : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      {import.meta.env.DEV && <Route path="/dev" element={<DevPreviewSelector />} />}

      <Route path="/demo" element={<Navigate to="/demo/student/home" replace />} />
      <Route path="/demo/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudentAccountHome demo />} />
        <Route path="decisions" element={<StudentDecisionForm />} />
        <Route path="review" element={<StudentDecisionForm review />} />
        <Route path="results" element={<StudentResultsDashboard demo />} />
      </Route>
      <Route path="/demo/professor" element={<ProfessorLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<ProfessorWorkspace demo />} />
        <Route path="submissions" element={<ProfessorSectionRedirect section="submissions" demo />} />
        <Route path="rfi" element={<ProfessorSectionRedirect section="rfi" demo />} />
        <Route path="import" element={<ProfessorSectionRedirect section="import" demo />} />
      </Route>

      <Route path="/student" element={<RoleLayout role="student"><StudentLayout /></RoleLayout>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<RolePage preview={<StudentHomePage />} signedIn={<StudentAccountHome />} />} />
        <Route path="decisions" element={<StudentDecisionForm />} />
        <Route path="review" element={<StudentDecisionForm review />} />
        <Route path="results" element={<RolePage preview={<ResultsPage />} signedIn={<StudentResultsDashboard />} />} />
      </Route>

      <Route path="/professor" element={<RoleLayout role="professor"><ProfessorLayout /></RoleLayout>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<ProfessorWorkspace />} />
        <Route path="submissions" element={<ProfessorSectionRedirect section="submissions" />} />
        <Route path="team-review/:teamId" element={<RolePage preview={<TeamReviewPage />} signedIn={<ProfessorAccountPage title="Team Decision Review" teamOnly />} />} />
        <Route path="rfi" element={<ProfessorSectionRedirect section="rfi" />} />
        <Route path="import" element={<ProfessorSectionRedirect section="import" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  const { pathname } = useLocation()
  const Provider = pathname === '/demo' || pathname.startsWith('/demo/') ? DemoAuthProvider : AuthProvider
  return (
    <Provider>
      <DevPreviewProvider>
        <AppRoutes />
      </DevPreviewProvider>
    </Provider>
  )
}
