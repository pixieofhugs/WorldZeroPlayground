/**
 * The two edit-only slots (#2537): the FACTION ROW (a picker since #3149) and
 * DELETE. Designed once (owner ruling: "cheap to change once, expensive to change
 * eight times"); archetypes MOUNT them and own only where they sit.
 *
 * `na` links to the directory: `na` is seeded hidden, so `/factions/na` 404s
 * (see {@link factionDetailHref}).
 *
 * Delete is an outline, never a filled primary like Save; `disabled={deleting}`
 * is busy, not unusable (#2486). Its ink is the faction's `-card-alarm` (#1302):
 * `--color-danger` is 3.42:1 on the na wash. The confirm's filled key keeps
 * `--color-danger`/`--color-on-danger` — a ground and its ink (ADR-0061) — and
 * takes no prop.
 *
 * Dress seam (#2956): optional style props spread LAST, so passing nothing renders
 * the defaults unchanged (`__tests__/editCharacterSlotsDress.test.tsx`). Props, not
 * the `--label-ink` seam: these inks are a tier off it and would move everywhere.
 *
 * ponytail: alarm measured on the na wash only. An archetype landing this slot
 * on its own sheet re-measures (`factionContrast.test.ts` row) and passes the ink
 * via {@link DeleteCharacterProps.alarm}.
 */
import { useId, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { JoinConfirm } from '../../components/JoinControl'
import { UNAFFILIATED_FACTION_SLUG, factionCssVar, factionName } from '../../utils/factions'
import type { FactionPicker } from './useEditCharacter'

/** The faction's page, or the directory for `na` (`/factions/na` 404s). */
export function factionDetailHref(slug: string | null | undefined): string {
  return slug && slug !== UNAFFILIATED_FACTION_SLUG ? `/factions/${slug}` : '/factions'
}

export interface FactionRowProps {
  /** The faction the page is dressed in — the pick, once there is one. */
  slug: string | null | undefined
  /** From `useEditCharacter` (#3149). Absent or empty: the row is a link. */
  picker?: FactionPicker
  style?: CSSProperties
  labelStyle?: CSSProperties
  /** The row's plate (well, hairline, ink) — ground-dependent. Also dresses
   * every picker option and the confirm's Cancel. */
  rowStyle?: CSSProperties
  chevronStyle?: CSSProperties
  /** The defection confirm's sentence. */
  promptStyle?: CSSProperties
}

/**
 * The character's faction, and a way to change it when there is somewhere to go
 * (#3149). Nothing on offer: just the link, no empty picker.
 *
 * Create's kind of picker (`aria-pressed` toggles); current faction first. The
 * offer is the server's (`offeredFactions`). A pick only re-dresses; Save sends
 * the move after `JoinConfirm` (focus on Cancel, since Enter can summon it).
 * Selection also shows a check — the hue ring alone is unmeasured on nine grounds.
 */
export function FactionRow({
  slug,
  picker,
  style,
  labelStyle,
  rowStyle,
  chevronStyle,
  promptStyle,
}: FactionRowProps) {
  const { t } = useTranslation('forms')
  const labelId = useId()
  const nameOf = (faction: string | null | undefined) =>
    faction ? factionName(faction) : t('editCharacter.unaffiliated')

  // `offered` can still name the current faction after a partial failure.
  const offered = picker?.offered.filter((option) => option !== picker.current) ?? []

  if (!picker || offered.length === 0) {
    return (
      <div style={style}>
        <span style={{ ...label, ...labelStyle }}>{t('editCharacter.factionLabel')}</span>
        <Link to={factionDetailHref(slug)} className="content-text" style={{ ...row, ...rowStyle }}>
          <span>{nameOf(slug)}</span>
          <span aria-hidden style={{ ...chevron, ...chevronStyle }}>›</span>
        </Link>
      </div>
    )
  }

  return (
    <div style={style}>
      <span id={labelId} style={{ ...label, ...labelStyle }}>{t('editCharacter.factionLabel')}</span>
      <div role="group" aria-labelledby={labelId} style={optionList}>
        {[picker.current, ...offered].map((option) => {
          const selected = option === picker.picked
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              // The re-dress remounts the row; keep focus on the pressed option.
              autoFocus={selected && picker.touched}
              // Busy: a pick mid-save would re-dress away from the landing move.
              disabled={picker.saving}
              onClick={() => picker.pick(option)}
              className="content-text"
              style={{
                ...row,
                ...optionButton,
                ...rowStyle,
                // Faction hue as a ring, never ink.
                boxShadow: selected ? `0 0 0 2px ${factionCssVar(option)}` : 'none',
              }}
            >
              <span>{nameOf(option)}</span>
              <span aria-hidden>{selected ? '✓' : ''}</span>
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {picker.confirming && (
          <div style={factionConfirm}>
            <JoinConfirm
              membership={{
                currentFactionSlug: picker.current,
                join: picker.confirm,
                joining: picker.saving,
                joinError: null,
              }}
              name={nameOf(picker.picked)}
              skin={{
                openStyle: {},
                proseStyle: { ...confirmPrompt, margin: 0, ...promptStyle },
                cancelStyle: { ...confirmCancel, ...rowStyle },
                confirmStyle: confirmDelete,
              }}
              joiningLabel={t('editCharacter.saveBusy')}
              onCancel={picker.cancelConfirm}
              // Enter in a field opens this; a repeat must not confirm it.
              autoFocus="cancel"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export interface DeleteCharacterProps {
  /** The edited character's faction; paints the alarm ink. */
  slug: string | null | undefined
  deleting: boolean
  onDelete: () => void | Promise<void>
  /** Outline + confirm frame ink. Defaults to the faction's `-card-alarm`; pass a
   * re-measured one rather than repointing that token on a wrapper. */
  alarm?: string
  /** Geometry and face; ink is {@link alarm}. */
  buttonStyle?: CSSProperties
  /** Transparent by default — a well is a dress. */
  panelStyle?: CSSProperties
  promptStyle?: CSSProperties
  /** The confirm's Cancel. Delete takes no prop (see header). */
  cancelStyle?: CSSProperties
}

/** Delete, confirm, busy. Confirm state is local: nothing else reads it. */
export function DeleteCharacter({
  slug,
  deleting,
  onDelete,
  alarm: suppliedAlarm,
  buttonStyle,
  panelStyle,
  promptStyle,
  cancelStyle,
}: DeleteCharacterProps) {
  const { t } = useTranslation(['forms', 'common'])
  const [confirming, setConfirming] = useState(false)
  const alarm = suppliedAlarm ?? factionCssVar(slug ?? UNAFFILIATED_FACTION_SLUG, 'card-alarm')

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ ...outlineBtn, border: `1px solid ${alarm}`, color: alarm, ...buttonStyle }}
      >
        {t('editCharacter.delete')}
      </button>
    )
  }

  return (
    <div style={{ ...confirmPanel, border: `1px solid ${alarm}`, ...panelStyle }}>
      <span className="content-text" style={{ ...confirmPrompt, ...promptStyle }}>
        {t('editCharacter.deleteConfirm')}
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ ...confirmCancel, ...cancelStyle }}
        >
          {t('common:actions.cancel')}
        </button>
        <button type="button" onClick={onDelete} disabled={deleting} style={confirmDelete}>
          {deleting ? t('editCharacter.deleteBusy') : t('editCharacter.deleteConfirmYes')}
        </button>
      </div>
    </div>
  )
}

// --- token-driven styles ----------------------------------------------------

const label: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)',
}
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, padding: 'var(--space-md)', textDecoration: 'none',
  fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)',
}
const chevron: CSSProperties = {
  color: 'var(--color-text-tertiary)',
}
const optionList: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
}
const optionButton: CSSProperties = {
  width: '100%', cursor: 'pointer', textAlign: 'left',
}
/** No frame: one alarm-bordered panel per tail is Delete's. */
const factionConfirm: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)',
}
const outlineBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', background: 'none', textAlign: 'center',
  borderRadius: 8, padding: 'var(--space-md)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', letterSpacing: '0.1em',
  textTransform: 'uppercase',
}
const confirmPanel: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
  borderRadius: 8, padding: 'var(--space-lg)',
}
const confirmPrompt: CSSProperties = {
  fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)',
}
const confirmCancel: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: 'var(--space-md)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)',
}
/** No seam, by decision (ADR-0061): a ground and its ink. */
const confirmDelete: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-danger)', border: 'none',
  borderRadius: 8, padding: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-danger)',
}
