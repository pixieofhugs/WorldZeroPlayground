import type { CSSProperties } from 'react'
import { factionName } from '../utils/factions'

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

/** Faction slugs with a bespoke `--faction-<key>-card-*` token set in index.css.
 *  Everything else (na, aged_out, factionless, unknown) → neutral field treatment.
 *  NB: do not route through factions.ts FACTION_ALIASES — albescent keeps its own
 *  identity here, and na must stay neutral (not aliased to ua). */
const CARD_KEY: Record<string, string> = {
  ua: 'ua',
  everymen: 'everymen',
  wow: 'wow',
  snide: 'snide',
  ephemerists: 'ephemerists',
  singularity: 'singularity',
  albescent: 'albescent',
}

interface Skin {
  bg: string
  text: string
  accent: string
  muted: string
  font: string
  border: string
}

function skinFor(slug: string | null | undefined): Skin | null {
  const key = CARD_KEY[slug ?? '']
  if (!key) return null
  const v = (prop: string) => `var(--faction-${key}-card-${prop})`
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
  const skinned = skinFor(factionSlug)
  const skin = skinned ?? NEUTRAL
  const name = displayName.trim() || 'Wanderer'
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
    padding: '18px 20px 16px',
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
          fontSize: 7,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fc-muted)',
        }}
      >
        <span>@{handle}</span>
        <span>{skinned ? 'credential' : 'unaffiliated'}</span>
      </div>

      {/* portrait ring. Rendered as a <button> only when it's an upload affordance —
          on FieldDesk the whole card is already a button, and button-in-button is
          invalid DOM. */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
        {(() => {
          const ringStyle: CSSProperties = {
            position: 'relative',
            width: 96,
            height: 96,
            borderRadius: '50%',
            padding: 4,
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
              title="Drag a photo here, or click to upload"
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
          fontSize: 28,
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
          fontSize: 8,
          lineHeight: 1.55,
          color: 'var(--fc-muted)',
          margin: '7px auto 0',
          maxWidth: 210,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: cardBio ? undefined : 12,
        }}
      >
        {cardBio || (skinned ? '' : 'A blank passport, waiting for its first stamp.')}
      </div>

      {/* footer: pill + level + score */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 11,
          borderTop: '1px solid var(--fc-muted)',
          marginTop: 14,
          paddingTop: 12,
        }}
      >
        {skinned ? (
          <span
            style={{
              background: 'var(--fc-accent)',
              color: 'var(--fc-bg)',
              fontFamily: 'var(--fc-font)',
              fontSize: 11,
              padding: '3px 10px',
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
              fontSize: 9,
              color: 'var(--fc-muted)',
            }}
          >
            — faction to be chosen —
          </span>
        )}
        <span
          style={{
            fontSize: 7.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fc-muted)',
          }}
        >
          lvl {level}
        </span>
        <span style={{ fontFamily: 'var(--fc-font)', fontSize: 17, color: 'var(--fc-accent)' }}>
          {score}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 8,
              marginLeft: 3,
              color: 'var(--fc-muted)',
              letterSpacing: '0.06em',
            }}
          >
            pts
          </span>
        </span>
      </div>
    </div>
  )
}
