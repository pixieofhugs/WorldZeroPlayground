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
 * MOBILE active-character switcher (#516): a bottom sheet listing the account's
 * lives; tap adopts the `POST /me/active-character` answer (#1383). Mobile field
 * desks only (#2354).
 *
 * "Create new character" shows only on the server's
 * `can_create_additional_character` — hidden, not padlocked (#2111, #1560).
 * Callers hide the trigger via `rosterOffersAChoice` when there's nothing to offer.
 *
 * Drawn at the document root (#1591) to escape `ShellContent`'s stacking context;
 * see `drawAtRoot`.
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
      // The POST answers the new `CurrentUser`; adopt it (#1383).
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

/** Roster rows, extracted to be testable with renderToStaticMarkup. */
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

/**
 * Bottom padding: clears the mobile tab bar via `--tab-bar-clearance` (#1590).
 * ponytail: its `env(safe-area-inset-bottom)` is 0 until `index.html` sets `viewport-fit=cover`.
 */
function bottomRest(isMobile: boolean): string {
  return isMobile ? 'calc(var(--space-xl) + var(--tab-bar-clearance))' : 'var(--space-xl)'
}

// Bottom-sheet band shared with `.filter-factions__*` in index.css: scrim 39, sheet 40
// (root context, #1591) — above chrome 10, below ConfirmDialog 50 and modals 1000.
const scrim: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 39, border: 'none', padding: 0,
  background: 'var(--color-overlay-strong)', cursor: 'pointer',
}
/** Opaque ground (#2109): `--color-bg-surface` is alpha and showed the page through. */
const sheet: CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
  background: 'var(--color-bg-page)', borderRadius: '22px 22px 0 0',
  padding: 'var(--space-md) var(--space-lg)',
  // No --shadow-* token; the colour comes from a token (as ConfirmDialog).
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
