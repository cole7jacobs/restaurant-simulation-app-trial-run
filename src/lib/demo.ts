import type { StudentResults } from '../../shared/results'

// Derived from the Q1–Q5 original listings; original files remain private.
import archive from '../data/demo-results.json'

export const demoRounds = [1, 2, 3, 4, 5]
export const demoTeamNames = ['Demo Bistro', 'Demo Grill', 'Demo Cafe', 'Demo Kitchen', 'Demo Tavern']
export const demoArchive = archive
export function demoStudentResults(round: number): StudentResults | null {
  const firm = demoArchive.find((entry) => entry.round === round)?.firms.find((entry) => entry.firm === 1)
  return firm ? { round, metrics: firm.metrics, menu: firm.menu } : null
}
export const demoResults = demoStudentResults(5)!
export const demoResultsPreference = 'sampleslice:demo:results:round'
export const demoLeaderboardPreference = 'sampleslice:leaderboard:demo'

export const demoKey = (round: number) => `sample-slice:demo:decisions:${round}`
export const isDemoPath = (path: string) => path === '/demo' || path.startsWith('/demo/')

export const demoQ7Key = 'sample-slice:demo:results:q7:v1'

export function readDemoQ7(): StudentResults | null {
  try {
    const raw = sessionStorage.getItem(demoQ7Key)
    return raw ? JSON.parse(raw) as StudentResults : null
  } catch { return null }
}
