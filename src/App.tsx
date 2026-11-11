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

/**
 * Application route tree — React Router library mode.
 *
 * Route structure:
 *   /                       → redirect to /student/home or /professor/home (dev preview)
 *                             or /login (default)
 *   /login                  → LoginPage
 *   /dev                    → DevPreviewSelector (choose role for dev preview)
 *   /student                → StudentLayout (renders child routes via <Outlet>)
 *     /student/home         → StudentHomePage
 *     /student/decisions/*  → Phase 3
 *     /student/review       → Phase 3
 *     /student/results/*    → Phase 6
 *   /professor              → ProfessorLayout
 *     /professor/home       → ProfessorHomePage
 *     /professor/rounds     → Phase 4
 *     /professor/round/:id  → Phase 4 sub-routes
 *   *                       → NotFoundPage
 *
 * Authentication guards (Phase 2):
 *   Students accessing /professor/* and vice versa will be redirected.
 *   For now, dev preview mode allows navigation without real auth.
 */

/** Root redirect — respects active dev-preview role. */
function RootRedirect() {
  const { role } = useDevPreview()
  if (role === 'student') return <Navigate to="/student/home" replace />
  if (role === 'professor') return <Navigate to="/professor/home" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect — dev-preview-aware */}
      <Route path="/" element={<RootRedirect />} />

      {/* Authentication */}
      <Route path="/login" element={<LoginPage />} />

      {/* Development preview role selector */}
      <Route path="/dev" element={<DevPreviewSelector />} />

      {/* Student interface */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudentHomePage />} />
        <Route path="decisions" element={<DecisionsPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="results" element={<ResultsPage />} />
      </Route>

      {/* Professor interface */}
      <Route path="/professor" element={<ProfessorLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<ProfessorHomePage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="team-review/:teamId" element={<TeamReviewPage />} />
        <Route path="rfi" element={<RFIPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  return (
    <DevPreviewProvider>
      <AppRoutes />
    </DevPreviewProvider>
  )
}
