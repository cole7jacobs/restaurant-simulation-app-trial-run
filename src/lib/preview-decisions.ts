import { validateDecision } from '../../shared/decision-validation'
import {
  decisionFields, menuPreparations, reportFields,
  type CatalogItem, type DecisionResponse, type DecisionValues, type MenuSelection,
} from '../../shared/decisions'

type DecisionWrite = { revision: string | null; submit: boolean; values: DecisionValues; menu: MenuSelection[] }

// These are fictional preview IDs; they are never sent to the API.
const catalog: CatalogItem[] = Object.keys(menuPreparations).map((ItemName, index) => ({
  MenuItemID: index + 1,
  ItemName,
  OrderSizeUnit: ['BEER', 'WINE', 'SPIRITS'].includes(ItemName) ? 'Cl.' : 'Gm.',
}))
const keyForRound = (round: number) => `restaurant-sim:preview:decisions:v1:${round}`

function emptyDecision(): DecisionResponse {
  return {
    catalog,
    values: Object.fromEntries([...decisionFields, ...reportFields].map(({ key }) => [key, null])) as DecisionValues,
    menu: [], revision: null, submittedAt: null,
  }
}

export function loadPreviewDecision(round: number): DecisionResponse {
  const raw = window.localStorage.getItem(keyForRound(round))
  if (!raw) return emptyDecision()
  const saved = JSON.parse(raw) as DecisionResponse
  if (!saved || !saved.values || !Array.isArray(saved.menu) || typeof saved.revision !== 'string' ||
      (saved.submittedAt !== null && typeof saved.submittedAt !== 'string')) {
    throw new Error('Unable to read this demo draft from browser storage.')
  }
  return { ...saved, catalog }
}

export function savePreviewDecision(round: number, input: DecisionWrite): { revision: string; submittedAt: string | null } {
  const error = validateDecision(input, catalog, input.submit)
  if (error) throw new Error(error)
  const current = loadPreviewDecision(round)
  if (current.revision !== input.revision || current.submittedAt) {
    throw new Error('This demo round has changed or was submitted. Reload to see the saved decisions.')
  }
  const revision = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const submittedAt = input.submit ? new Date().toISOString() : null
  window.localStorage.setItem(keyForRound(round), JSON.stringify({ ...input, revision, submittedAt }))
  return { revision, submittedAt }
}
