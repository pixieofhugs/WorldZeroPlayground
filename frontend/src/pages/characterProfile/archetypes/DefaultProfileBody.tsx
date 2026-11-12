/**
 * DefaultProfileBody — the unaffiliated (na) profile kit (#459, #2996), and the
 * fall-through body for any faction without its own `profileBody`. Dress only;
 * the spine is `ProfileSkin`'s.
 *
 * `isKnownFaction` (ADR-0039, #749) is the seam: the spectrum is the
 * unaffiliated identity, so a themed slug landing here wears its own hue via
 * `factionFill(slug, 'bar')`; na, Albescent (mapped to `default`, ADR-0048) and
 * unknown slugs wear the ramp. Each mount is two sibling JSX branches, not a
 * computed class, because `albescentSpectraMove`'s census reads literal
 * classNames from this source.
 *
 * Three spectrum mounts must stay in this file (#2500, epic #2496 ruling 3):
 * section hairline (ornament, childless), identity band (frame, keeps
 * children), level-bar fill (ornament, childless) — `:empty` decides which
 * travels. The two `.spectrum-dial` mounts are not on the seam.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { factionFill, factionSheet, isKnownFaction } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, type ProfileDress } from './profileSkin'

/** Role map (#2672), pinned to na: its grounds take no slug (#2361). */
const ROLES = factionRoleVars('na', 'na-profile-body')

const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

/** For the slot styles; the skin's own sites take `displayFontStyle`. */
const ITALIC: CSSProperties = { fontStyle: 'italic' }

/** Section hairline: an ornament, must stay CHILDLESS (`:empty` motion). */
const HAIRLINE: CSSProperties = { flex: 1, height: 3, borderRadius: 3, opacity: 0.5 }

/**
 * Identity band geometry for both sides of the seam. The 16px corner pairs with
 * `.alb-profile-edge`'s `border-radius: inherit` (#2407);
 * `spectrumRingCollapse.test.ts` counts this declaration.
 */
const BAND: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 16,
  padding: 'var(--space-xs)',
  boxShadow: '0 20px 50px -26px var(--color-cast-shadow)',
  marginBottom: 'var(--space-2xl)',
}

const BAR: CSSProperties = { height: '100%', borderRadius: 20, transition: 'width 300ms' }

function SectionHeading({
  title,
  eyebrow,
  slug,
}: {
  title: ReactNode
  eyebrow?: string
  slug: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {eyebrow && <span style={{ ...EYEBROW, letterSpacing: '0.08em' }}>{eyebrow}</span>}
      {isKnownFaction(slug) ? (
        <span aria-hidden style={{ ...HAIRLINE, ...factionFill(slug, 'bar') }} />
      ) : (
        <span aria-hidden className="spectrum-rule" style={HAIRLINE} />
      )}
    </div>
  )
}

/** FDL laurel. Not the shared `SpectrumLaurel`: the ring is a class here, which
 *  carries it into Albescent's motion. */
function FdlLaurel() {
  const { t } = useTranslation('common')
  return (
    <span
      title={t('profile.topPraxis')}
      style={{
        position: 'absolute',
        top: -11,
        right: 14,
        zIndex: 20,
        width: 44,
        height: 44,
        filter: 'drop-shadow(0 4px 8px var(--color-cast-shadow))',
      }}
    >
      <span
        className="spectrum-dial"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'var(--color-bg-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-primary)',
        }}
      >
        <svg width={18} height={22} viewBox="0 0 40 48" fill="currentColor" aria-hidden>
          <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
          <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
          <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
          <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
          <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
        </svg>
      </span>
    </span>
  )
}

/** The costume, per slug (a function: three mounts ask `isKnownFaction`).
 *  `ProfileSkin` memoizes nothing on the kit's identity. */
function naDress(slug: string): ProfileDress {
  const spectrum = !isKnownFaction(slug)
  return {
  slug: 'na',
  // The ground is the fixed `.na-backdrop` wash the wrapper mounts.
  pageBackground: 'transparent',
  ink: 'var(--color-text-primary)',
  muted: 'var(--color-text-secondary)',
  accent: 'var(--color-text-primary)',
  surface: 'var(--color-bg-surface-alt)',
  border: 'var(--color-border)',
  displayFont: 'var(--font-display)',
  displayFontStyle: 'italic',
  eyebrowFont: 'var(--font-body)',
  bodyFont: 'var(--font-body)',

  /** Identity band: a FRAME, must KEEP ITS CHILDREN or `:empty` motion paints
   *  over the credential card; `.alb-profile-edge` is its one carrier (#2519). */
  headerFrame: (band, ornament) =>
    spectrum ? (
      <div className="spectrum-rule" style={BAND}>
        {ornament}
        {band}
      </div>
    ) : (
      <div style={{ ...BAND, ...factionFill(slug, 'bar') }}>
        {ornament}
        {band}
      </div>
    ),
  // The sheet inside the ramp; `factionSheet()` with no slug is na's stock.
  headerStyle: {
    borderRadius: 12,
    ...(spectrum ? factionSheet() : { background: 'var(--color-bg-surface-alt)' }),
    padding: 'var(--space-xl)',
  },
  taglineExtra: {
    ...ITALIC,
    color: spectrum ? 'var(--na-profile-body-ink)' : 'var(--color-text-primary)',
  },

  progressionStyle: {
    marginTop: 'var(--space-xl)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 12,
    padding: 'var(--space-lg)',
    background: 'var(--color-bg-surface-alt)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  /** Level-bar fill: an ORNAMENT, must stay CHILDLESS (epic #2496 ruling 3). */
  levelBar: (percent) =>
    spectrum ? (
      <div className="spectrum-rule" style={{ ...BAR, width: `${percent}%` }} />
    ) : (
      <div style={{ ...BAR, width: `${percent}%`, ...factionFill(slug, 'bar') }} />
    ),
  // Unread while `levelBar` is set; the type requires it.
  barFill: 'var(--faction-default-rainbow)',
  barTrack: 'var(--color-border)',

  sectionHeading: (title, eyebrow) => (
    <SectionHeading title={title} eyebrow={eyebrow} slug={slug} />
  ),

  emptyStateStyle: {
    border: '1.5px dashed var(--color-border-strong)',
    borderRadius: 12,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: 'var(--color-bg-surface-alt)',
  },
  laurel: <FdlLaurel />,

  badgeBoardStyle: {
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    background: 'var(--color-bg-surface-alt)',
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...EYEBROW,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    marginLeft: 'auto',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="var(--color-border)"
      nameStyle={{ fontFamily: 'var(--font-display)', ...ITALIC, color: 'var(--color-text-primary)', lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          className="spectrum-dial"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: ring thickness; 4px visibly shrinks the disc.
            padding: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--color-bg-surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
            }}
          >
            {glyph}
          </span>
        </span>
      )}
    />
  ),
  }
}

/**
 * `identityOrnament`: an inert layer inside the identity band, via
 * `headerFrame`. Albescent's whole delta here (ADR-0048: Default plus a
 * flourish, never a slug branch). Optional, so others render unchanged (#1153).
 */
interface DefaultProfileBodyProps extends ProfileBodyProps {
  identityOrnament?: ReactNode
}

export default function DefaultProfileBody({
  identityOrnament,
  ...props
}: DefaultProfileBodyProps) {
  return (
    <div style={{ ...ROLES, position: 'relative' }}>
      {/* Full-page fixed spectrum wash; the rule lives in the CSS tree. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ProfileSkin
          props={props}
          kit={naDress(props.character.faction_slug)}
          identityOrnament={identityOrnament}
        />
      </div>
    </div>
  )
}
