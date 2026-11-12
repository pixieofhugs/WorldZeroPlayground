import type { CSSProperties } from 'react'
import type { ParseKeys } from 'i18next'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { factionCssVar, factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import DeleteAccountCard from '../DeleteAccountCard'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'

/**
 * Account (#2155): the per-account facts, the carried life, and sign-out. This
 * holds the app's ONLY sign-out control (the NavBar's was removed with it).
 *
 * Undrawn by the design: rows follow `sec-language`'s value pill, buttons are
 * `.btn-outline`. The header and character link come from the deleted
 * `DefaultSettings.tsx` (`6ddde148^`). `DeleteAccountCard` rides below as a
 * second card under the same rail item (#2161).
 *
 * Provider is display-only by owner ruling (2026-08-17): no link-a-provider flow
 * exists (ADR-0075).
 */

/**
 * `AuthProvider` (backend/models/account.py) → literal catalog key. Unmapped
 * values, including "" for no OAuth row, render no row.
 */
const PROVIDER_LABEL_KEY: Readonly<Record<string, ParseKeys<'common'>>> = {
  google: 'settings.account.providers.google',
  discord: 'settings.account.providers.discord',
  dev: 'settings.account.providers.dev',
  demo: 'settings.account.providers.demo',
}

/** The design's value pill in tokens. `overflowWrap` for long emails on phones. */
const VALUE_PILL: CSSProperties = {
  minWidth: 0,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  background: 'var(--switch-well)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)',
  overflowWrap: 'anywhere',
}

const AVATAR: CSSProperties = {
  width: 52,
  height: 52,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: avatar ring thickness; 4px is a third too thick.
  padding: 3,
  background: 'var(--faction-default-rainbow-conic)',
}

export default function AccountSection({ sectionId }: { readonly sectionId: string }) {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()

  const character = user?.character ?? null
  const charactersHref = character ? `/characters/${character.id}/edit` : '/characters/create'
  const providerKey = PROVIDER_LABEL_KEY[user?.provider ?? '']

  // Renders even without a `user`: a `null` section leaves a rail item dangling.
  return (
    <>
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.account.eyebrow')}
    >
      {/* The carried life */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        {character ? (
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 rounded-full" style={AVATAR}>
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
                style={{
                  fontSize: 'var(--text-title)',
                  lineHeight: 1.05,
                  color: 'var(--color-text-primary)',
                }}
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
      </div>

      {user?.email && (
        <SettingsRow title={t('settings.account.email')}>
          <div style={VALUE_PILL} data-testid="settings-account-email">
            {user.email}
          </div>
        </SettingsRow>
      )}

      {providerKey && (
        <SettingsRow title={t('settings.account.provider')}>
          <div style={VALUE_PILL} data-testid="settings-account-provider">
            {t(providerKey)}
          </div>
        </SettingsRow>
      )}

      <SettingsRow title={t('settings.characters.label')} help={t('settings.characters.hint')}>
        <Link
          to={charactersHref}
          className="btn-outline shrink-0"
          style={{ borderRadius: 'var(--radius-md)', textDecoration: 'none' }}
          data-testid="settings-characters-link"
        >
          {character ? t('settings.characters.manage') : t('settings.characters.create')}
        </Link>
      </SettingsRow>

      <SettingsRow last title={t('settings.signOut')} help={t('settings.signOutHelp')}>
        <button
          type="button"
          onClick={signOut}
          className="btn-outline shrink-0"
          style={{ borderRadius: 'var(--radius-md)' }}
          data-testid="settings-sign-out"
        >
          {t('settings.signOut')}
        </button>
      </SettingsRow>
    </SettingsCard>
    <DeleteAccountCard sectionId={`${sectionId}-danger`} />
    </>
  )
}
