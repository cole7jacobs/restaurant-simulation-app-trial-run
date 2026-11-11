import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DevPreviewProvider, useDevPreview } from './context/DevPreviewContext'
import { LoginPage } from './routes/LoginPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { StudentLayout } from './routes/student/StudentLayout'
import { StudentHomePage } from './routes/student/StudentHomePage'
import { DecisionsPage } from './routes/student/DecisionsPage'
import { ReviewPage } from './routes/student/ReviewPage'
import { ResultsPage } from './routes/student/ResultsPage'
import { ProfessorLayout } from './routes/professor/ProfessorLayout'
import { ProfessorHomePage } from './routes/professor/ProfessorHomePage'
import { SubmissionsPage } from './routes/professor/SubmissionsPage'
import { TeamReviewPage } from './routes/professor/TeamReviewPage'
import { RFIPage } from './routes/professor/RFIPage'
import { ImportPage } from './routes/professor/ImportPage'
import { DevPreviewSelector } from './routes/DevPreviewSelector'

function PreviewLayout({ role, children }: { role: 'student' | 'professor'; children: ReactElement }) {
  const { role: activeRole } = useDevPreview()

  if (activeRole === role) return children
  return <Navigate to={activeRole ? `/${activeRole}/home` : '/dev'} replace />
}

function PreviewHome() {
  const { role } = useDevPreview()
  return <Navigate to={role ? `/${role}/home` : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={import.meta.env.DEV ? <PreviewHome /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {import.meta.env.DEV && (
        <>
          <Route path="/dev" element={<DevPreviewSelector />} />

          <Route path="/student" element={<PreviewLayout role="student"><StudentLayout /></PreviewLayout>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<StudentHomePage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="results" element={<ResultsPage />} />
          </Route>

          <Route path="/professor" element={<PreviewLayout role="professor"><ProfessorLayout /></PreviewLayout>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<ProfessorHomePage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="team-review/:teamId" element={<TeamReviewPage />} />
            <Route path="rfi" element={<RFIPage />} />
            <Route path="import" element={<ImportPage />} />
          </Route>
        </>
      )}

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  if (!import.meta.env.DEV) return <AppRoutes />

  return (
    <DevPreviewProvider>
      <AppRoutes />
    </DevPreviewProvider>
  )
}
