/**
 * THE TWO SLOTS AN EDIT PAGE HAS AND A CREATE PAGE DOES NOT (#2537).
 *
 * Every faction's edit archetype is DERIVED from its create archetype (owner
 * ruling, 2026-08-27). Four fields carry over, two are create-only — and two are
 * edit-only with nowhere in a create dress to land:
 *
 *   • the FACTION ROW — the calling the character already has, which a create
 *     page asks for and an edit page can only report;
 *   • the DESTRUCTIVE-ACTION SLOT — delete, confirm, busy. The only irreversible
 *     act on the page.
 *
 * They live here rather than in `DefaultEditCharacter` because the ruling gates
 * the fan-out on them: "a generic treatment inherited by eight files is cheap to
 * change once and expensive to change eight times." An archetype MOUNTS these;
 * it does not re-draw them. Where each one sits on the page is the dress and
 * belongs to the archetype — what it does, and what it reads as, is here.
 *
 * ## The faction row carries BEHAVIOUR, not decoration
 *
 * `na` goes to the DIRECTORY, not to `/factions/na`. The column is
 * `nullable=False` and every life starts unaffiliated, so a `slug ? … :` test
 * never fires — but `na` is seeded HIDDEN (`backend/seed.py`), `GET /factions`
 * returns visible rows only, and `FactionDetail` derives from that list. So
 * `/factions/na` renders "Faction not found" for the one population the branch
 * exists to serve (`pages/players/playersData.ts` records the same rule).
 * {@link factionDetailHref} is that rule, said once, so eight archetypes cannot
 * each get it wrong.
 *
 * ## Weight: delete must not read as Save
 *
 * Save is a filled primary. This is an OUTLINE — a hairline and ink, no ground —
 * and the confirm it opens is a bordered panel rather than a modal. Nothing here
 * is disabled-on-arrival: `disabled={deleting}` is a transient busy state, which
 * is the split #2486 drew.
 *
 * ## Ink: the functional red is the FACTION's, not the global one
 *
 * `--color-danger` measures 3.42:1 on the na page's washed ground in light — a
 * fail, and what this slot shipped before it was lifted here.
 * `--faction-default-card-alarm` reads 5.89 / 7.85 on that same composite. That
 * is #1302's shape, the one the sibling create page already follows: a shared
 * functional ink inside a faction frame takes THAT faction's card family, so
 * `factionCssVar(slug, 'card-alarm')` gives each of the eight its own without a
 * second copy of this file. The measurement is in
 * `__tests__/createCharacterContrast.test.ts`, whose PAGE_INKS row for the alarm
 * is the same token on the same ground.
 *
 * The confirm's filled button keeps `--color-danger` / `--color-on-danger`: that
 * pair is a ground and its ink, not type on the wash, so the wash never reaches
 * it.
 *
 * ## THE DRESS SEAM: an archetype supplies ink; it still does not re-draw (#2956)
 *
 * The paint below was measured on the na page's washed ground, which was the
 * only ground an edit archetype drew on when this file was written. #2537 made
 * it eight, and six of the seven new lanes worked around the missing seam in
 * four different ways: two MOVED the slot off their own sheet because the
 * shared neutrals would not clear there (Coven's faction-row ink 4.06:1 on the
 * washed ward sheet in dark; UA's 4.15:1, `--color-bg-surface-alt` being a 6%
 * white wash that composites over the leaf to rgb(91,66,49)), and two repointed
 * global tokens on a wrapper root they own (S.N.I.D.E. sending `-card-alarm` to
 * `-wall-alarm`, 1.24:1 to 5.13:1; Singularity sending SIX globals onto
 * `-term-*`). That inverts this file's own contract — placement is the dress's
 * decision, and it was being made by the slot's paint.
 *
 * So both slots take optional style props, in the shape `ErrorBanner` and the
 * neighbouring `PortraitPicker` already ship: spread LAST over the defaults, so
 * a mount that passes nothing renders byte-identically to what it rendered
 * before. The seam commits no archetype to anything; it only removes the
 * constraint. Whether a given dress uses it is that dress's own PR with that
 * dress's own measurement. `__tests__/editCharacterSlotsDress.test.tsx` is the
 * guard for both halves.
 *
 * WHY PROPS RATHER THAN THE `--label-ink` SEAM. `PortraitPicker` states the
 * split: a TIER a frame root already dresses reads the seam and mints nothing,
 * a GROUND-DEPENDENT ink takes a prop. That rule was checked here and it does
 * not reach. `--label-ink` is `var(--color-text-tertiary)` at root, so the
 * label, the row's ink and the confirm prompt — all `--color-text-secondary` —
 * are one tier off it and would MOVE on every ground including na's; and the
 * one line that does match at root (the help) resolves to something else under
 * the three roots that repoint the seam (Ephemerists to `-plate-quiet`,
 * S.N.I.D.E. to `--control-off-ink`, Singularity to `-term-dim`). Reading the
 * seam here would repaint dresses in a change whose whole contract is that
 * nothing moves. Those are re-dress decisions, and they belong to the dresses.
 *
 * WHAT THE SEAM DOES NOT REACH, on purpose: the confirm's filled key. Its
 * `--color-danger` / `--color-on-danger` is a ground and its ink rather than
 * type on a wash (2026-08-27 ruling, ADR-0061), so it takes no prop — a prop
 * generous enough to carry an ink is generous enough to repaint that pair.
 *
 * ponytail: the alarm ink is measured on the na page's washed ground only. A
 * faction archetype that lands this slot on its own SHEET must re-measure its
 * `-card-alarm` against that sheet in its own PR — the upgrade path is a row in
 * `factionContrast.test.ts` plus, since #2956, handing the re-measured ink in
 * through {@link DeleteCharacterProps.alarm} rather than repointing a global on
 * a wrapper root. The DEFAULT stays `factionCssVar(slug, 'card-alarm')`.
 */
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UNAFFILIATED_FACTION_SLUG, factionCssVar, factionName } from '../../utils/factions'

/**
 * Where a character's faction row links to: the faction's own page, or the
 * DIRECTORY for an unaffiliated life. See the note above — `/factions/na` is a
 * 404 for the exact population that branch serves.
 */
export function factionDetailHref(slug: string | null | undefined): string {
  return slug && slug !== UNAFFILIATED_FACTION_SLUG ? `/factions/${slug}` : '/factions'
}

export interface FactionRowProps {
  slug: string | null | undefined
  /** Wrapper override, for a surface that owns the surrounding spacing. */
  style?: CSSProperties
  /** The label tier above the row. */
  labelStyle?: CSSProperties
  /**
   * The row's own PLATE — its well, its hairline and the ink on it. This is the
   * ground-dependent half and the one the fan-out kept tripping over: the
   * default well is `--color-bg-surface-alt`, which reads 1.06:1 on the WoW
   * charter sheet and composites to rgb(91,66,49) over UA's leaf in dark.
   */
  rowStyle?: CSSProperties
  /** The disclosure chevron, which is the row's quiet tier rather than its ink. */
  chevronStyle?: CSSProperties
  /** The help line under the row. */
  helpStyle?: CSSProperties
}

/** The calling a character already has — read-only, and a way back to it. */
export function FactionRow({
  slug,
  style,
  labelStyle,
  rowStyle,
  chevronStyle,
  helpStyle,
}: FactionRowProps) {
  const { t } = useTranslation('forms')
  return (
    <div style={style}>
      <span style={{ ...label, ...labelStyle }}>{t('editCharacter.factionLabel')}</span>
      <Link to={factionDetailHref(slug)} className="content-text" style={{ ...row, ...rowStyle }}>
        <span>{slug ? factionName(slug) : t('editCharacter.unaffiliated')}</span>
        <span aria-hidden style={{ ...chevron, ...chevronStyle }}>›</span>
      </Link>
      <p className="content-text" style={{ ...help, ...helpStyle }}>{t('editCharacter.factionHelp')}</p>
    </div>
  )
}

export interface DeleteCharacterProps {
  /** The EDITED character's faction, which is what paints the alarm ink. */
  slug: string | null | undefined
  deleting: boolean
  onDelete: () => void | Promise<void>
  /**
   * The destructive ink — the outline's hairline and label, and the confirm
   * panel's frame. Defaults to this character's `-card-alarm`, which is what
   * every mount rendered before the seam existed; an archetype whose own sheet
   * that alarm does not clear passes the one it re-measured instead of
   * repointing `--faction-{key}-card-alarm` on a wrapper root.
   */
  alarm?: string
  /** The outline button's geometry and face. Its INK is {@link alarm}. */
  buttonStyle?: CSSProperties
  /** The confirm panel's ground. Transparent by default — a well is a dress. */
  panelStyle?: CSSProperties
  /** The confirm question's ink. */
  promptStyle?: CSSProperties
  /**
   * The confirm's CANCEL key — a well, a hairline and an ink, all three of them
   * ground-dependent. The DELETE key beside it takes no prop: see the header.
   */
  cancelStyle?: CSSProperties
}

/**
 * Delete, its confirm, and its busy state. The confirm lives in local state
 * because it is a question about this control and nothing else — no page, no
 * route and no other slot can answer it, so lifting it into
 * `useEditCharacter` would give eight archetypes a field they all ignore.
 */
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
const help: CSSProperties = {
  fontFamily: 'var(--font-body)', lineHeight: 1.6,
  color: 'var(--color-text-tertiary)', margin: 'var(--space-sm) 0 0',
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
/**
 * The one paint in this file with NO seam over it, and that is the decision
 * (2026-08-27, ADR-0061). A ground and its ink, not type on a wash — no dress
 * reaches past it, which is why `DeleteCharacter` exposes no key for it.
 */
const confirmDelete: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-danger)', border: 'none',
  borderRadius: 8, padding: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-danger)',
}
