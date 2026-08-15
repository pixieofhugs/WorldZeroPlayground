import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../../api/auth'
import { factionCssVar, factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'

export interface DefaultSettingsProps {
  character: CharacterOut | null
  /** Current theme, so the dark-mode switch reflects the live cascade. */
  dark: boolean
  /** Reused verbatim from `useTheme().toggle` — flips `[data-theme]` + persists. */
  onToggleTheme: () => void
  /** Reused auth sign-out — `useAuth().signOut`. */
  onSignOut: () => void
}

/**
 * Default (na) MOBILE Settings screen (#520). Single-column, one-hand reflow of
 * the design's settings idiom, but ADR-0035 real-fields-only: it surfaces ONLY
 * controls backed by real state — account header, a link into character
 * management, the dark-mode toggle (which reuses the existing `useTheme`
 * persistence, no new store), and sign out. The design's notifications /
 * privacy / about rows are PARKED and deliberately not rendered.
 *
 * Presentation-only: all state/handlers arrive as props; copy resolves from the
 * `common` catalog. Desktop is unaffected — the container routes desktop away.
 */
export default function DefaultSettings({ character, dark, onToggleTheme, onSignOut }: DefaultSettingsProps) {
  const { t } = useTranslation('common')

  // Character management: the carried life's own management surface, or create
  // one if there is none yet. (#516's dedicated mobile route falls through here
  // until it lands.)
  const charactersHref = character ? `/characters/${character.id}/edit` : '/characters/create'

  return (
    <div data-testid="mobile-settings" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <header>
        <h1
          className="font-display italic"
          style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {t('settings.title')}
        </h1>
      </header>

      {/* ── Account header ── */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        <div className="label-heading" style={{ marginBottom: 'var(--space-md)' }}>
          {t('settings.account.eyebrow')}
        </div>
        {character ? (
          <div className="flex items-center gap-3.5">
            <div
              className="shrink-0 rounded-full"
              style={{
                width: 52,
                height: 52,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness drawn around a 52px avatar; the nearest rung (4px) thickens the band by a third.
                padding: 3,
                background: 'var(--faction-default-rainbow-conic)',
              }}
            >
              {character.avatar_url ? (
                <img
                  src={mediaUrl(character.avatar_url)}
                  alt={character.display_name}
                  className="w-full h-full rounded-full"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${factionCssVar(character.faction_slug)})`,
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-display italic truncate"
                style={{ fontSize: 'var(--text-title)', lineHeight: 1.05, color: 'var(--color-text-primary)' }}
              >
                {character.display_name}
              </div>
              <div
                className="truncate"
                style={{
                  marginTop: 'var(--space-xs)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-base)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('sidebar.characterCard.factionLevel', {
                  faction: factionName(character.faction_slug),
                  level: character.level,
                })}
              </div>
            </div>
            <Link
              to={`/characters/${character.id}`}
              className="shrink-0 label-caption"
              style={{
                textDecoration: 'none',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 999,
                padding: 'var(--space-sm) var(--space-md)',
              }}
            >
              {t('settings.account.viewProfile')}
            </Link>
          </div>
        ) : (
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)', margin: 0 }}>
            {t('settings.account.noCharacter')}
          </p>
        )}
      </section>

      {/* ── Characters — link into character management ── */}
      <Link
        to={charactersHref}
        className="font-body flex items-center gap-3"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
          textDecoration: 'none',
        }}
      >
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>{t('settings.characters.label')}</div>
          <div style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}>
            {t('settings.characters.hint')}
          </div>
        </div>
        <span
          aria-hidden
          style={{
            color: 'var(--color-text-tertiary)',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: chevron dingbat used as a row-affordance icon, not text
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ›
        </span>
      </Link>

      {/* ── Appearance — Dark mode ── */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        <div className="label-heading" style={{ marginBottom: 'var(--space-md)' }}>
          {t('settings.appearance.eyebrow')}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body flex-1" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>
            {t('settings.appearance.darkMode')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label={t('settings.appearance.darkMode')}
            data-testid="settings-theme-toggle"
            onClick={onToggleTheme}
            style={{
              flex: 'none',
              width: 46,
              height: 28,
              borderRadius: 999,
              border: '1px solid var(--color-border-strong)',
              background: dark ? 'var(--color-text-primary)' : 'var(--color-bg-surface-alt)',
              position: 'relative',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 150ms',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 2,
                left: dark ? 20 : 2,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: dark ? 'var(--color-bg-page)' : 'var(--color-text-tertiary)',
                transition: 'left 150ms',
              }}
            />
          </button>
        </div>
      </section>

      {/* ── Sign out ── */}
      <button
        type="button"
        onClick={onSignOut}
        data-testid="settings-sign-out"
        className="font-body"
        style={{
          padding: 'var(--space-lg)',
          borderRadius: 12,
          fontSize: 'var(--text-lg)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-strong)',
          cursor: 'pointer',
        }}
      >
        {t('settings.signOut')}
      </button>
    </div>
  )
}
