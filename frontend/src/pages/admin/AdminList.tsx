import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import './adminList.css'

/**
 * The console's list pattern (#3668), reused by Tasks, People, Praxis and the Mod log:
 * `ListToolbar` over `ListTable`, a row opens a `SidePanel` beside it
 * (`<div className="adm-split"><div className="adm-card adm-split-main">…</div>{panel}</div>`).
 */

export interface Segment {
  key: string
  label: string
  count: number
}

export function ListToolbar({
  label,
  search,
  segments,
  active,
  onSegment,
  children,
}: {
  label: string
  search: { value: string; onChange: (v: string) => void; placeholder: string; label: string }
  segments: Segment[]
  active: string
  onSegment: (key: string) => void
  /** Filter chips. */
  children?: ReactNode
}) {
  return (
    <div className="adm-toolbar" role="toolbar" aria-label={label}>
      <label className="adm-search">
        <span className="adm-sr">{search.label}</span>
        <input
          className="adm-input adm-input-round"
          value={search.value}
          placeholder={search.placeholder}
          onChange={(e) => search.onChange(e.target.value)}
        />
      </label>
      <div className="adm-segs" role="tablist" aria-label={label}>
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === active}
            className="adm-seg"
            onClick={() => onSegment(s.key)}
          >
            {s.label} {s.count}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

/** A native select drawn as a chip: keyboard and phone pickers for free. */
export function SelectChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="adm-chip">
      <span className="adm-sr">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export interface Column<T> {
  key: string
  header: string
  numeric?: boolean
  cell: (row: T) => ReactNode
}

/** The first column opens the row's panel; it is the row's one real button. */
export function ListTable<T>({
  columns,
  rows,
  rowKey,
  selectedKey,
  onOpen,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => number
  selectedKey: number | null
  onOpen: (row: T) => void
  empty: string
}) {
  if (rows.length === 0) return <p className="adm-empty">{empty}</p>
  return (
    <table className="adm-tbl">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" className={`adm-th${c.numeric ? ' adm-num' : ''}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className={rowKey(row) === selectedKey ? 'adm-tr-on' : undefined}>
            {columns.map((c, i) => (
              <td key={c.key} className={`adm-td${c.numeric ? ' adm-num' : ''}`}>
                {i === 0 ? (
                  <button type="button" className="adm-open" onClick={() => onOpen(row)}>
                    {c.cell(row)}
                  </button>
                ) : (
                  c.cell(row)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SidePanel({
  label,
  badge,
  actions,
  onClose,
  children,
}: {
  label: string
  badge: ReactNode
  /** Links beside the close button. */
  actions?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation('admin')
  return (
    <aside aria-label={label} className="adm-card adm-split-side">
      <div className="adm-panel-top">
        {badge}
        <span className="adm-btns">
          {actions}
          <button type="button" className="adm-btn" aria-label={t('console.list.close')} onClick={onClose}>
            ✕
          </button>
        </span>
      </div>
      {children}
    </aside>
  )
}
