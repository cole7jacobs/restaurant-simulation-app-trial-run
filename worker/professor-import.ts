import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { importRounds, maxListingSize, metricFields, type ImportPreview, type MenuResult } from '../shared/results'
import type { AuthEnv } from './auth'
import { ListingError, parseListing } from './fr-lst'

type Team = { TeamID: number; TeamName: string; FirmNumber: number }
type Catalog = { MenuItemID: number; ItemName: string; OrderSizeUnit: string }
type SubmittedSelection = Pick<MenuResult, 'PrepLevel' | 'OrderSize' | 'InternalPromotion' | 'SalesPrice'> & {
  TeamID: number
  SlotNumber: number
  MenuItemID: number
}
type ImportRecord = { FileHash: string; TeamMapping: string; WriteID: string }

const metricColumns = metricFields.join(', ')
const teamColumns = 'TeamID, TeamName, FirmNumber'

async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function matches(result: MenuResult, itemId: number, selection: SubmittedSelection) {
  return itemId === selection.MenuItemID && result.PrepLevel === selection.PrepLevel &&
    result.OrderSize === selection.OrderSize && result.InternalPromotion === selection.InternalPromotion &&
    result.SalesPrice === selection.SalesPrice
}

export const professorImport = new Hono<AuthEnv>()

professorImport.post('/import/:round/:action', bodyLimit({
  maxSize: maxListingSize + 8192,
  onError: (c) => c.json({ error: 'The FR.LST file exceeds the 256 KiB upload limit.' }, 413),
}), async (c) => {
  const round = Number(c.req.param('round'))
  const action = c.req.param('action')
  if (!importRounds.includes(round)) return c.json({ error: 'Choose a simulation round from Q1 through Q7.' }, 400)
  if (action !== 'preview' && action !== 'confirm') return c.json({ error: 'Unknown import action.' }, 404)

  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string' || !/\.lst$/i.test(file.name) || !file.size) {
    return c.json({ error: 'Select a nonempty FR.LST file with a .LST extension.' }, 400)
  }
  if (file.size > maxListingSize) return c.json({ error: 'The FR.LST file exceeds the 256 KiB upload limit.' }, 413)
  const bytes = await file.arrayBuffer()
  let listing: ReturnType<typeof parseListing>
  try {
    listing = parseListing(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes))
  } catch (failure) {
    return c.json({ error: failure instanceof ListingError ? failure.message : 'Expected an ASCII FR.LST text file.' }, 422)
  }
  if (listing.round !== round) {
    return c.json({ error: `The file reports Q${listing.round}, but you selected Q${round}.` }, 422)
  }

  const db = c.env.DB
  const fileHash = await sha256(bytes)
  const [roster, catalog, submitted, imports, existing] = await db.batch([
    db.prepare(`SELECT ${teamColumns} FROM Team WHERE FirmNumber BETWEEN 1 AND 5 ORDER BY FirmNumber`),
    db.prepare('SELECT MenuItemID, ItemName, OrderSizeUnit FROM MenuItem'),
    db.prepare(`
      SELECT m.TeamID, m.SlotNumber, m.MenuItemID, m.PrepLevel, m.OrderSize, m.InternalPromotion, m.SalesPrice
      FROM MenuItemDecision m JOIN TeamDecision d USING (TeamID, RoundNumber)
      WHERE m.RoundNumber = ? AND d.SubmittedAt IS NOT NULL ORDER BY m.TeamID, m.SlotNumber
    `).bind(round),
    db.prepare('SELECT FileHash, TeamMapping, WriteID FROM SimulationResultImport WHERE RoundNumber = ?').bind(round),
    db.prepare(`
      SELECT m.TeamID, ${metricColumns} FROM TeamMetrics m JOIN Team t USING (TeamID)
      WHERE m.RoundNumber = ? AND t.FirmNumber BETWEEN 1 AND 5 ORDER BY m.TeamID
    `).bind(round),
  ])

  const teams = roster.results as Team[]
  const missing = listing.firms.filter(({ firm }) => !teams.some((team) => team.FirmNumber === firm))
  if (missing.length) {
    return c.json({ error: `Assign student teams to the following firms before importing: ${missing.map(({ firm }) => firm).join(', ')}.` }, 422)
  }
  const mapping = JSON.stringify(teams.map(({ TeamID, FirmNumber }) => [FirmNumber, TeamID]))
  const prior = imports.results[0] as ImportRecord | undefined
  if (prior && prior.TeamMapping !== mapping) {
    return c.json({ error: 'The current firm assignments differ from this round’s previous import. Restore those assignments before replacing results.' }, 409)
  }

  const items = new Map((catalog.results as Catalog[]).map((item) => [item.ItemName, item]))
  const warnings: string[] = []
  const mapped: ImportPreview['teams'] = []
  for (const { firm, metrics, menu } of listing.firms) {
    const team = teams.find(({ FirmNumber }) => FirmNumber === firm)!
    const saved = (submitted.results as SubmittedSelection[]).filter(({ TeamID }) => TeamID === team.TeamID)
    const resultMenu: ImportPreview['teams'][number]['menu'] = []
    const itemIds: number[] = []
    for (const result of menu) {
      const item = items.get(result.ItemName)
      if (!item || item.OrderSizeUnit !== result.OrderSizeUnit) {
        return c.json({ error: `Firm ${firm} has an unknown menu item or inconsistent portion unit: ${result.ItemName}.` }, 422)
      }
      itemIds.push(item.MenuItemID)
    }
    const sameOrder = saved.length === menu.length &&
      menu.every((result, index) => matches(result, itemIds[index], saved[index]))
    for (const [index, result] of menu.entries()) {
      // Only link uniquely matching rows, or align the complete matching ordered menu.
      const candidates = saved.filter((row) => matches(result, itemIds[index], row))
      const occurrences = candidates.length === 1
        ? menu.filter((other, position) => matches(other, itemIds[position], candidates[0])).length : 0
      resultMenu.push({
        ...result,
        DecisionSlot: sameOrder ? saved[index].SlotNumber : occurrences === 1 ? candidates[0].SlotNumber : null,
      })
    }
    const unlinked = resultMenu.filter(({ DecisionSlot }) => DecisionSlot === null).length
    if (unlinked) warnings.push(`Firm ${firm} (${team.TeamName}): ${unlinked} menu results have no matching submitted selection. The printed results can still be imported.`)
    mapped.push({ ...team, metrics, menu: resultMenu })
  }
  const tokenInput = JSON.stringify([fileHash, mapping, prior?.WriteID ?? null, existing.results,
    mapped.map(({ menu }) => menu.map(({ DecisionSlot }) => DecisionSlot))])
  const token = await sha256(new Uint8Array(new TextEncoder().encode(tokenInput)).buffer)
  const alreadyImported = prior?.FileHash === fileHash
  const replacesResults = !alreadyImported && Boolean(prior || existing.results.length)
  const preview: ImportPreview = { round, token, alreadyImported, replacesResults, warnings, teams: mapped }
  if (action === 'preview') return c.json(preview)
  if (form?.get('token') !== token) {
    return c.json({ error: 'The file or round data changed after preview. Preview the upload again.' }, 409)
  }
  if (alreadyImported) return c.json(preview)
  if (replacesResults && form?.get('replace') !== 'yes') {
    return c.json({ error: 'Confirm that you want to replace the existing results for this round.' }, 409)
  }

  const writeId = crypto.randomUUID()
  const guard = 'EXISTS (SELECT 1 FROM SimulationResultImport WHERE RoundNumber = ? AND WriteID = ?)'
  const mappingChecks = mapped.map(() => 'EXISTS (SELECT 1 FROM Team WHERE TeamID = ? AND FirmNumber = ?)').join(' AND ')
  const start = db.prepare(`
    INSERT INTO SimulationResultImport (RoundNumber, FileHash, TeamMapping, ImportedAt, WriteID)
    SELECT ?, ?, ?, ?, ? WHERE ${mappingChecks}
      AND (? IS NULL OR EXISTS (SELECT 1 FROM SimulationResultImport WHERE RoundNumber = ?))
    ON CONFLICT (RoundNumber) DO UPDATE SET
      FileHash = excluded.FileHash, ImportedAt = excluded.ImportedAt, WriteID = excluded.WriteID
    WHERE SimulationResultImport.WriteID = ?
  `).bind(round, fileHash, mapping, new Date().toISOString(), writeId,
    ...mapped.flatMap(({ TeamID, FirmNumber }) => [TeamID, FirmNumber]), prior?.WriteID ?? null, round, prior?.WriteID ?? null)

  const updates = mapped.flatMap(({ TeamID, metrics, menu }) => [
    db.prepare(`
      INSERT INTO TeamMetrics (TeamID, RoundNumber, ${metricColumns})
      SELECT ?, ?, ${metricFields.map(() => '?').join(', ')} WHERE ${guard}
      ON CONFLICT (TeamID, RoundNumber) DO UPDATE SET
        ${metricFields.map((field) => `${field} = excluded.${field}`).join(', ')}
    `).bind(TeamID, round, ...metricFields.map((field) => metrics[field]), round, writeId),
    db.prepare(`DELETE FROM MenuItemResult WHERE TeamID = ? AND RoundNumber = ? AND ${guard}`)
      .bind(TeamID, round, round, writeId),
    ...menu.map((result, index) => db.prepare(`
      INSERT INTO MenuItemResult (TeamID, RoundNumber, ResultSlot, MenuItemID, PrepLevel,
        DecisionSlot, CostOfGoodsSoldPct, OrdersSold, TotalSales)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}
    `).bind(TeamID, round, index + 1, items.get(result.ItemName)!.MenuItemID, result.PrepLevel,
      result.DecisionSlot, result.CostOfGoodsSoldPct, result.OrdersSold, result.TotalSales, round, writeId)),
  ])
  const [applied] = await db.batch([start, ...updates])
  if (applied.meta.changes !== 1) {
    return c.json({ error: 'The round changed during import. Preview the upload again.' }, 409)
  }
  return c.json(preview, 201)
})
