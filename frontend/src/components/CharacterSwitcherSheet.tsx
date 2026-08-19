import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { getMyCharacters, setActiveCharacter } from '../api/me'
import type { CharacterOut } from '../api/auth'
import { useFormFactor } from '../hooks/useFormFactor'
import { factionCssVar, factionName } from '../utils/factions'
import { mediaUrl } from '../utils/media'
import { drawAtRoot } from './ui/drawAtRoot'

/**
 * MOBILE active-character switcher (#516) — a bottom sheet over Home. Lists the
 * account's lives (active one checkmarked), swaps the carried life on tap
 * (one `POST /me/active-character`, whose answer IS the new viewer — #1383),
 * and holds ONE path action under them: Create new character. Opened from the
 * `CHARACTERS` pill on the eight mobile field desks, and nowhere else since
 * #2354 — the desktop rail's pill was a second door to the roster the desktop
 * home already lays out in the page, and it opened THIS, a phone bottom sheet,
 * on a desktop. Presentation-only over existing endpoints.
 *
 * **The one action is gated, and the trigger is too** (#2111). "Create new
 * character" is rendered only when `can_create_additional_character` says the
 * era's `second_character_level_required` has been met — the same
 * server-computed flag the FieldDesk roster reads, never a level comparison
 * here, and hidden rather than shown with a padlock (#1560: a second life must
 * not be advertised before the gate opens; the ROUTE stays reachable). Its
 * sibling "Edit this character" is gone outright: it led where the `EDIT` pill
 * beside the trigger already leads, two taps further in.
 *
 * Which leaves the case where this sheet has nothing to offer at all — one
 * life, shut gate. The callers hide the trigger for it, on
 * `rosterOffersAChoice` (`hooks/useRosterChoice`), so the sheet and the desktop
 * roster cannot disagree about whether a roster is worth showing.
 *
 * **Drawn at the document root** (#1591). Every caller — all eight mobile
 * field desks — mounts this from inside `ShellContent`, whose
 * `position: relative` + `z-index: 5` opens a stacking context that no
 * descendant can escape by declaring a bigger number. On the phone that put the tab bar over the sheet and left it tappable
 * behind the scrim. `drawAtRoot` carries the full argument.
 */

export default function CharacterSwitcherSheet({
  open,
  activeCharacterId,
  onClose,
}: {
  open: boolean
  activeCharacterId: number
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  const { user, applyUser } = useAuth()
  const navigate = useNavigate()
  const isMobile = useFormFactor() === 'mobile'
  const [lives, setLives] = useState<CharacterOut[]>([])
  const [switching, setSwitching] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    void getMyCharacters().then(setLives).catch(() => setLives([]))
  }, [open])

  if (!open) return null

  const enterLife = async (id: number) => {
    if (id === activeCharacterId) {
      onClose()
      return
    }
    setSwitching(id)
    try {
      // Carrying a different life changes the whole of `CurrentUser`, and this
      // POST already answers that object — so adopt it rather than throwing it
      // away and re-asking `/auth/me` (#1383).
      applyUser(await setActiveCharacter(id))
      onClose()
    } finally {
      setSwitching(null)
    }
  }

  return drawAtRoot(
    <div role="dialog" aria-modal="true" aria-label={t('fieldDesk.home.switcher.title')}>
      <button type="button" aria-label={t('fieldDesk.home.switcher.close')} onClick={onClose} style={scrim} />
      <div style={{ ...sheet, paddingBottom: bottomRest(isMobile) }}>
        <span style={grab} />
        <div style={sheetTitle}>{t('fieldDesk.home.switcher.title')}</div>

        <CharacterSwitcherRows
          lives={lives}
          activeCharacterId={activeCharacterId}
          onSelect={enterLife}
          switching={switching}
        />

        {user?.can_create_additional_character && (
          <button type="button" onClick={() => navigate('/characters/create')} style={{ ...sheetAction, borderTop: '1px solid var(--color-border)' }}>
            <span style={actionIcon}>+</span>
            {t('fieldDesk.home.switcher.createNew')}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Presentational roster rows — extracted so the selection surface is testable
 * without a DOM (renderToStaticMarkup): the active life is checkmarked, every
 * other life is a tappable row that fires `onSelect(id)`.
 */
export function CharacterSwitcherRows({
  lives,
  activeCharacterId,
  onSelect,
  switching = null,
}: {
  lives: CharacterOut[]
  activeCharacterId: number
  onSelect: (id: number) => void
  switching?: number | null
}) {
  const { t } = useTranslation('common')
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {lives.map((life) => {
        const isActive = life.id === activeCharacterId
        return (
          <button
            key={life.id}
            type="button"
            onClick={() => onSelect(life.id)}
            disabled={switching != null}
            data-testid={`switcher-row-${life.id}`}
            data-active={isActive ? 'true' : 'false'}
            style={switchRow}
          >
            <span style={{ ...miniRing, background: 'var(--faction-default-rainbow-conic)' }}>
              {life.avatar_url ? (
                <img src={mediaUrl(life.avatar_url)} alt={life.display_name} style={miniAvatarImg} />
              ) : (
                <span
                  style={{
                    ...miniAvatarImg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${factionCssVar(life.faction_slug, 'light')}, ${factionCssVar(life.faction_slug)})`,
                    fontFamily: 'var(--faction-default-card-font)',
                    fontStyle: 'italic',
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: monogram glyph sized to the mini avatar disc
                    fontSize: 17,
                    color: 'var(--color-text-on-accent)',
                  }}
                >
                  {life.display_name[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={rowName}>{life.display_name}</span>
              <span style={rowMeta}>
                {t('fieldDesk.home.switcher.meta', {
                  faction: factionName(life.faction_slug),
                  level: life.level,
                  points: life.score,
                })}
              </span>
            </span>
            {isActive ? (
              <span aria-hidden style={{
                color: 'var(--faction-default-card-muted)', flex: 'none',
                // eslint-disable-next-line local/no-raw-style-values -- ornament: check dingbat marking the active life
                fontSize: 16,
              }}>✓</span>
            ) : (
              <span style={rowTapHint}>{t('fieldDesk.home.switcher.tapToUse')}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// --- token-driven styles ----------------------------------------------------

/**
 * What sits under the last action before the screen ends.
 *
 * On the phone that is the mobile tab bar, and `--tab-bar-clearance` is the one
 * token that says how tall it is (#1590) — the filter sheet already reads it,
 * so both sheets now agree about where the bottom of the screen is. On desktop
 * there is no bar to clear and the sheet keeps its own breathing room.
 *
 * ponytail: the clearance folds in `env(safe-area-inset-bottom)`, which
 * resolves to `0px` app-wide today because `index.html` sets no
 * `viewport-fit=cover`. Correct-but-inert, and live the day someone sets it.
 */
function bottomRest(isMobile: boolean): string {
  return isMobile ? 'calc(var(--space-xl) + var(--tab-bar-clearance))' : 'var(--space-xl)'
}

// Bottom-sheet band, shared with `.filter-factions__scrim` / `__sheet` in
// index.css: scrim 39, sheet 40. Read in the ROOT stacking context now that
// both sheets portal out of the shell (#1591) — above the chrome at 10, below
// ConfirmDialog's 50 and the full-screen modals at 1000, which is the order a
// confirm raised from inside this sheet needs.
const scrim: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 39, border: 'none', padding: 0,
  background: 'var(--color-overlay-strong)', cursor: 'pointer',
}
/**
 * THE GROUND IS OPAQUE, AND HAS TO BE (#2109).
 *
 * This filled with `--color-bg-surface`, which is ALPHA in both themes — 72%
 * white on the cream page, 4% white on the near-black one. On the phone that
 * composited to a panel you could read the page straight through, in light and
 * in dark, and the reported symptom was a sheet impossible to tell from what it
 * covered. `--color-bg-page` is the app's opaque stock and the ground
 * `ConfirmDialog` already draws its own bottom sheet on, so the two root-drawn
 * overlays agree; the scrim above and the cast below are what separate it from
 * the page it matches.
 */
const sheet: CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
  background: 'var(--color-bg-page)', borderRadius: '22px 22px 0 0',
  padding: 'var(--space-md) var(--space-lg)',
  // No --shadow-* token exists; the colour half is the half that would drift
  // between themes, so it is the half that comes from a token (ConfirmDialog).
  boxShadow: '0 -12px 34px var(--color-cast-shadow)', maxHeight: '80vh', overflowY: 'auto',
}
const grab: CSSProperties = {
  display: 'block', width: 38, height: 4, borderRadius: 999,
  background: 'var(--color-border-strong)', margin: 'var(--space-xs) auto var(--space-lg)',
}
const sheetTitle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)', margin: '0 var(--space-xs) var(--space-sm)',
}
const switchRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-xs)',
  borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
  background: 'none', border: 'none', borderBottomStyle: 'solid',
  borderBottomWidth: 1, borderBottomColor: 'var(--color-border)', width: '100%',
}
const miniRing: CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', flex: 'none',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: this inset *is* the drawn ring stroke around the mini avatar, not spacing
  padding: 2,
}
const miniAvatarImg: CSSProperties = {
  width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
}
const rowName: CSSProperties = {
  display: 'block', fontFamily: 'var(--font-display)', fontStyle: 'italic',
  fontSize: 'var(--text-content)', color: 'var(--color-text-primary)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const rowMeta: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)',
}
const rowTapHint: CSSProperties = {
  fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)', flex: 'none',
}
const sheetAction: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-lg) var(--space-xs)', width: '100%',
  color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
  fontStyle: 'italic', fontSize: 'var(--text-content)', cursor: 'pointer', background: 'none', border: 'none',
}
const actionIcon: CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', border: '1.5px dashed var(--color-border-strong)',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: '+' glyph centred in the 34px dashed action disc
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  color: 'var(--color-text-secondary)', flex: 'none',
}
