import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { ProfessorAccountPage } from '../AccountPages'
import { ProfessorHomePage } from './ProfessorHomePage'
import { SubmissionsPage } from './SubmissionsPage'
import { ProfessorRFIPage, RFIPage } from './RFIPage'
import { ProfessorImportPage } from './ProfessorImportPage'
import { ImportPage } from './ImportPage'

export const professorSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'submissions', label: 'Team Submissions' },
  { id: 'rfi', label: 'RFI Generation' },
  { id: 'import', label: 'FR.LST Import' },
] as const

type SectionId = typeof professorSections[number]['id']

export function ProfessorSectionRedirect({ section, demo = false }: { section: SectionId; demo?: boolean }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: (demo ? '/demo' : '') + '/professor/home', search, hash: '#' + section }} replace />
}

export function ProfessorWorkspace({ demo = false }: { demo?: boolean }) {
  const { session } = useAuth()
  const { hash, key } = useLocation()
  const preview = !demo && !session

  useEffect(() => {
    const id = hash.slice(1)
    if (!professorSections.some((section) => section.id === id)) return
    document.getElementById(id)?.scrollIntoView?.({ block: 'start' })
  }, [hash, key])

  return (
    <div className="professor-workspace">
      <section id="overview" aria-labelledby="professor-workspace-title" className="professor-section space-y-4">
        <PageHeader id="professor-workspace-title" title="Professor Dashboard" subtitle={demo ? 'Demo Bistro · Professor view' : undefined} />
        <p className="font-body text-deep-green/75 dark:text-card/75">
          Monitor teams, generate RFI files, and import simulation results from one place.
        </p>
        {preview && <ProfessorHomePage embedded />}
      </section>

      <section id="submissions" aria-labelledby="professor-submissions-title" className="professor-section space-y-4">
        <div>
          <p className="professor-section-kicker">01 · Teams</p>
          <h2 id="professor-submissions-title" className="professor-section-title">Team Submissions</h2>
          <p className="text-deep-green/75 dark:text-card/75">Review each team’s submission status.</p>
        </div>
        {preview ? <SubmissionsPage embedded /> : <ProfessorAccountPage title="Team Submissions" demo={demo} embedded />}
      </section>

      <section id="rfi" aria-labelledby="professor-rfi-title" className="professor-section space-y-4">
        <div>
          <p className="professor-section-kicker">02 · Export</p>
          <h2 id="professor-rfi-title" className="professor-section-title">RFI Generation</h2>
          <p className="text-deep-green/75 dark:text-card/75">Generate files from submitted team decisions.</p>
        </div>
        {preview ? <RFIPage embedded /> : <ProfessorRFIPage demo={demo} embedded />}
      </section>

      <section id="import" aria-labelledby="professor-import-title" className="professor-section space-y-4">
        <div>
          <p className="professor-section-kicker">03 · Results</p>
          <h2 id="professor-import-title" className="professor-section-title">FR.LST Import</h2>
          <p className="text-deep-green/75 dark:text-card/75">Preview and import simulation results.</p>
        </div>
        {preview ? <ImportPage embedded /> : <ProfessorImportPage demo={demo} embedded />}
      </section>
    </div>
  )
}
