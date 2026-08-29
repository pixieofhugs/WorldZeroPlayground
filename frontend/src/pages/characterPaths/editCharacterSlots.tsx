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
 * ponytail: the alarm ink is measured on the na page's washed ground only,
 * because that is the only ground an edit archetype draws on today. A faction
 * archetype that lands this slot on its own SHEET must re-measure its
 * `-card-alarm` against that sheet in its own PR — the upgrade path is a row in
 * `factionContrast.test.ts`, not a change here.
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

/** The calling a character already has — read-only, and a way back to it. */
export function FactionRow({ slug }: { slug: string | null | undefined }) {
  const { t } = useTranslation('forms')
  return (
    <div>
      <span style={label}>{t('editCharacter.factionLabel')}</span>
      <Link to={factionDetailHref(slug)} className="content-text" style={row}>
        <span>{slug ? factionName(slug) : t('editCharacter.unaffiliated')}</span>
        <span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>
      </Link>
      <p className="content-text" style={help}>{t('editCharacter.factionHelp')}</p>
    </div>
  )
}

interface DeleteCharacterProps {
  /** The EDITED character's faction, which is what paints the alarm ink. */
  slug: string | null | undefined
  deleting: boolean
  onDelete: () => void | Promise<void>
}

/**
 * Delete, its confirm, and its busy state. The confirm lives in local state
 * because it is a question about this control and nothing else — no page, no
 * route and no other slot can answer it, so lifting it into
 * `useEditCharacter` would give eight archetypes a field they all ignore.
 */
export function DeleteCharacter({ slug, deleting, onDelete }: DeleteCharacterProps) {
  const { t } = useTranslation('forms')
  const [confirming, setConfirming] = useState(false)
  const alarm = factionCssVar(slug ?? UNAFFILIATED_FACTION_SLUG, 'card-alarm')

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ ...outlineBtn, border: `1px solid ${alarm}`, color: alarm }}
      >
        {t('editCharacter.delete')}
      </button>
    )
  }

  return (
    <div style={{ ...confirmPanel, border: `1px solid ${alarm}` }}>
      <span className="content-text" style={confirmPrompt}>
        {t('editCharacter.deleteConfirm')}
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button type="button" onClick={() => setConfirming(false)} style={confirmCancel}>
          {t('editCharacter.cancel')}
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
const confirmDelete: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-danger)', border: 'none',
  borderRadius: 8, padding: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-danger)',
}
