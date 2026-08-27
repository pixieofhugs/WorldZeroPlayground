import type { CSSProperties } from 'react'
import type { ParseKeys } from 'i18next'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { factionCssVar, factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'

/**
 * Account (#2155) — the two per-ACCOUNT facts, the carried life, and the way
 * out.
 *
 * THIS SECTION IS WHY THE NAVBAR NO LONGER HAS A SIGN-OUT BUTTON. Until this
 * file existed there were exactly two sign-out call sites in the app: the
 * NavBar's button and the phone's `DefaultSettings`. #2154 deleted the second
 * and deliberately left the first alone — removing it before this landed would
 * have shipped a site with no way out, and `main` auto-deploys. The button goes
 * in the same PR as this card, not before it.
 *
 * THE DESIGN DOES NOT DRAW THIS CARD. `Settings.dc.html`'s `#sec-account` holds
 * only the danger zone (#2161), so the geometry here is the card/row rhythm of
 * the sections that ARE drawn: the display-only rows follow `sec-language`'s
 * "static value in a pill on the right", and the buttons follow its
 * `secondaryBtn` — which is `.btn-outline`, already in the repo.
 *
 * THE HEADER AND THE CHARACTER LINK ARE LIFTED, NOT REDRAWN. Both come from
 * the deleted `mobileArchetypes/DefaultSettings.tsx` (`6ddde148^`) — the
 * spectrum ring around the avatar, the faction·level line, and the
 * `edit`-or-`create` href are that file's working code.
 *
 * PROVIDER IS DISPLAY ONLY AND THAT IS A RULING, NOT AN OMISSION. There is no
 * button beside it because the link-a-second-provider flow (ADR-0075) does not
 * exist; the owner ruled display-only on 2026-08-17. A button here would be the
 * false-affordance class of #1263.
 */

/**
 * `AuthProvider` (backend/models/account.py) → catalog key.
 *
 * Written out literally rather than interpolated into `t()`, for the two
 * reasons the chassis gives about `labelKey`: a typo fails the build, and a
 * locale grep can see the keys. A value not in this map — including the ""
 * the wire sends for an account holding no OAuth row at all — renders no row
 * rather than a raw slug.
 */
const PROVIDER_LABEL_KEY: Readonly<Record<string, ParseKeys<'common'>>> = {
  google: 'settings.account.providers.google',
  discord: 'settings.account.providers.discord',
  dev: 'settings.account.providers.dev',
  demo: 'settings.account.providers.demo',
}

/** The design's static-value pill (`sec-language`), mapped to tokens: `10px
 *  14px` to the space scale, `--wz-well` to the `--switch-*` control-chrome
 *  family that already holds that exact `color-mix`, and 13px up to the content
 *  floor. `overflowWrap` because an email address is the one value here that
 *  can be longer than a phone is wide. */
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
  // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness drawn around a 52px avatar; the nearest rung (4px) thickens the band by a third. Lifted verbatim from DefaultSettings.tsx.
  padding: 3,
  background: 'var(--faction-default-rainbow-conic)',
}

export default function AccountSection({ sectionId }: { readonly sectionId: string }) {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()

  const character = user?.character ?? null
  // The carried life's own management surface, or make one if there is none.
  const charactersHref = character ? `/characters/${character.id}/edit` : '/characters/create'
  const providerKey = PROVIDER_LABEL_KEY[user?.provider ?? '']

  // The card renders whether or not there is a `user`. `/settings` is a
  // `ProtectedRoute`, so a signed-out reader never reaches it — but the shell
  // asserts one anchor per registered section, and a section that returns
  // `null` is a rail item pointing at nothing.
  return (
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.account.eyebrow')}
      lead={t('settings.account.lead')}
    >
      {/* ── The carried life ── lifted from DefaultSettings.tsx */}
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
        <SettingsRow title={t('settings.account.email')} help={t('settings.account.emailHelp')}>
          <div style={VALUE_PILL} data-testid="settings-account-email">
            {user.email}
          </div>
        </SettingsRow>
      )}

      {providerKey && (
        <SettingsRow
          title={t('settings.account.provider')}
          help={t('settings.account.providerHelp')}
        >
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
  )
}
