import type { ReactNode } from 'react'

interface DataTableRow {
  key: string
  cells: ReactNode[]
}

interface DataTableProps {
  /** Accessible name for the table, e.g. "Menu performance". Not shown visually. */
  caption: string
  columns: string[]
  rows: DataTableRow[]
}

/**
 * Responsive data table.
 * - Tablet and desktop (sm and up): a normal table with column headers.
 * - Phones: one labelled card per row, so no column is ever cut off.
 * The first column is used as each card's title.
 */
export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm font-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-deep-green/20 dark:border-card/10">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="pb-2 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-deep-green/70 dark:text-card/70"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-deep-green/20 dark:divide-card/10">
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={index} className="py-2 pr-4 tabular-nums text-deep-green dark:text-card">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="divide-y divide-deep-green/20 border-t border-deep-green/20 sm:hidden dark:divide-card/10 dark:border-card/10">
        {rows.map((row) => (
          <li
            key={row.key}
            className="py-3"
          >
            <p className="font-body text-sm font-semibold text-deep-green dark:text-card">
              {row.cells[0]}
            </p>
            <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-1 font-body text-sm">
              {row.cells.slice(1).map((cell, index) => (
                <div key={index}>
                  <dt className="text-[10px] uppercase tracking-wider text-deep-green/70 dark:text-card/70">
                    {columns[index + 1]}
                  </dt>
                  <dd className="font-medium text-deep-green dark:text-card">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
