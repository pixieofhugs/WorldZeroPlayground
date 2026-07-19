import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { factionName, isKnownFaction } from '../utils/factions'

/**
 * Skinnable faction credential card (#271). Color + font only — one structure,
 * re-skinned per faction via the `--faction-<slug>-card-*` token contract mapped
 * onto local `--fc-*` vars. Reused verbatim by the FieldDesk life-cards (#274) and
 * the creation live-preview (#273). Dark mode is automatic via the cascade; no
 * hardcoded hex, no `dark ? a : b`.
 */

export interface CredentialCardProps {
  displayName: string
  handle: string
  bio?: string | null
  factionSlug?: string | null
  level: number
  score: number
  avatarUrl?: string | null
  /** Card width in px (default 266 per mock). */
  size?: number
  /** Slight tilt for the FieldDesk roster (degrees). */
  rotation?: number
  /** Upload affordance for the creation preview. */
  onAvatarClick?: () => void
}

/* This used to be a private slug→key table listing the factions with a bespoke
 * `--faction-<key>-card-*` set — a fourth hand-maintained copy of CSS_KEY, and
 * it drifted exactly as you would expect: it still claimed `albescent` had a
 * token set for a whole commit after that set was deleted (#783), painting an
 * Albescent credential from `--faction-albescent-card-bg` and friends, which no
 * longer resolve to anything.
 *
 * `isKnownFaction` answers the identical question — "does this slug have a
 * resolvable theme?" — and every entry in the old table mapped a slug to itself,
 * so this is a behaviour-preserving swap for the six themed factions, for `na`,
 * and for unknown slugs. It cannot drift again, because there is now one table.
 */

interface Skin {
  bg: string
  text: string
  accent: string
  muted: string
  font: string
  border: string
}

function skinFor(slug: string | null | undefined): Skin | null {
  // null = the neutral field treatment: na, factionless, unknown — and
  // albescent, which is registered but deliberately unthemed (#783).
  if (!isKnownFaction(slug)) return null
  const v = (prop: string) => `var(--faction-${slug}-card-${prop})`
  return {
    bg: v('bg'),
    text: v('text'),
    accent: v('accent'),
    muted: v('muted'),
    font: v('font'),
    border: `2px solid ${v('accent')}`,
  }
}

const NEUTRAL: Skin = {
  bg: 'var(--color-bg-surface-alt)',
  text: 'var(--color-text-primary)',
  accent: 'var(--color-text-primary)',
  muted: 'var(--color-text-secondary)',
  font: 'var(--font-display)',
  border: '1px solid var(--color-border-strong)',
}

export default function CredentialCard({
  displayName,
  handle,
  bio,
  factionSlug,
  level,
  score,
  avatarUrl,
  size = 266,
  rotation = 0,
  onAvatarClick,
}: CredentialCardProps) {
  const { t } = useTranslation('common')
  const skinned = skinFor(factionSlug)
  const skin = skinned ?? NEUTRAL
  const name = displayName.trim() || t('credential.fallbackName')
  const cardBio = (bio ?? '').trim()

  const cardStyle: CSSProperties = {
    // Local skin vars consumed by descendants.
    ['--fc-bg' as string]: skin.bg,
    ['--fc-text' as string]: skin.text,
    ['--fc-accent' as string]: skin.accent,
    ['--fc-muted' as string]: skin.muted,
    ['--fc-font' as string]: skin.font,
    position: 'relative',
    width: size,
    boxSizing: 'border-box',
    background: 'var(--fc-bg)',
    color: 'var(--fc-text)',
    border: skin.border,
    boxShadow: '0 16px 34px rgba(0,0,0,0.18)',
    // §4a asymmetric-inset exception: 18/20/16 is optical trim on a near-uniform
    // inset, so the tie rounds DOWN to one rung rather than inverting the shape.
    padding: 'var(--space-lg)',
    textAlign: 'center',
    overflow: 'hidden',
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transition: 'background 220ms ease, border-color 220ms ease, color 220ms ease',
  }

  return (
    <div style={cardStyle}>
      {/* eyebrow: @handle + credential / unaffiliated tag */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fc-muted)',
        }}
      >
        <span>@{handle}</span>
        <span>{skinned ? t('credential.credential') : t('credential.unaffiliated')}</span>
      </div>

      {/* portrait ring. Rendered as a <button> only when it's an upload affordance —
          on FieldDesk the whole card is already a button, and button-in-button is
          invalid DOM. */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-lg) 0 var(--space-md)' }}>
        {(() => {
          const ringStyle: CSSProperties = {
            position: 'relative',
            width: 96,
            height: 96,
            borderRadius: '50%',
            padding: 'var(--space-xs)',
            boxSizing: 'border-box',
            background: 'var(--fc-accent)',
            border: 'none',
            cursor: onAvatarClick ? 'pointer' : 'default',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          }
          const inner = (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--fc-bg)',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
          )
          return onAvatarClick ? (
            <button
              type="button"
              onClick={onAvatarClick}
              title={t('credential.uploadTitle')}
              style={ringStyle}
            >
              {inner}
            </button>
          ) : (
            <div style={ringStyle}>{inner}</div>
          )
        })()}
      </div>

      {/* name */}
      <div
        style={{
          fontFamily: 'var(--fc-font)',
          fontStyle: skinned ? undefined : 'italic',
          fontSize: 'var(--text-title)',
          lineHeight: 1.05,
          color: 'var(--fc-text)',
          overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>

      {/* bio (clamped to 2 lines) */}
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-content)',
          lineHeight: 1.55,
          color: 'var(--fc-muted)',
          margin: 'var(--space-sm) auto 0',
          maxWidth: 210,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: cardBio ? undefined : 12,
        }}
      >
        {cardBio || (skinned ? '' : t('credential.blankPassport'))}
      </div>

      {/* footer: pill + level + score */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--space-md)',
          borderTop: '1px solid var(--fc-muted)',
          marginTop: 'var(--space-lg)',
          paddingTop: 'var(--space-md)',
        }}
      >
        {skinned ? (
          <span
            style={{
              background: 'var(--fc-accent)',
              color: 'var(--fc-bg)',
              fontFamily: 'var(--fc-font)',
              fontSize: 'var(--text-md)',
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 4,
              lineHeight: 1.3,
            }}
          >
            {factionName(factionSlug)}
          </span>
        ) : (
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              color: 'var(--fc-muted)',
            }}
          >
            {t('credential.factionToBeChosen')}
          </span>
        )}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fc-muted)',
          }}
        >
          {t('credential.lvl', { level })}
        </span>
        <span style={{ fontFamily: 'var(--fc-font)', fontSize: 'var(--text-content)', color: 'var(--fc-accent)' }}>
          {score}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              marginLeft: 'var(--space-xs)',
              color: 'var(--fc-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {t('credential.pts')}
          </span>
        </span>
      </div>
    </div>
  )
}
