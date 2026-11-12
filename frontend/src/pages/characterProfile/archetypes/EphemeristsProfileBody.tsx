/**
 * EphemeristsProfileBody — Valley Plate profile kit (#460, #1208): brass-ruled
 * night band, roman levels, papyrus plates. Theme-invariant (#1627).
 *
 * The header sits on the cornice BAND, a different ground from the plates, so
 * every header ink is a band ink (`headerMuted`, `accent`, `taglineExtra`;
 * #1636). Plate inks read ~2-3:1 there.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import {
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  DECO,
  DISC,
  GOLD,
  INK,
  LINE,
  MARGINALIA,
  PAGE,
  PLATE,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
} from '../../../components/factionMarks/ephemeristsPlate'
import { toRoman } from '../../../utils/roman'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** Level 0 shows a mid-dot rather than a numeral — the codex's own convention. */
const romanLevel = (value: number): string => (value > 0 ? toRoman(value) : '\u00b7')

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ fontFamily: MARGINALIA, fontSize: 'var(--text-lg)', color: QUIET, marginBottom: 'var(--space-xs)' }}>
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: DECO,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.04em',
          color: INK,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'ephemerists',
  pageVars: factionBodyVars('ephemerists'),
  pageBackground: PAGE,
  pageOverlay: `radial-gradient(color-mix(in srgb, ${INK} 6%, transparent) 1px, transparent 1px)`,
  ink: INK,
  muted: QUIET,
  headerMuted: BAND_QUIET,
  // Band ink: the level numeral sits on the transparent panel over the band.
  accent: BAND_INK,
  surface: PLATE,
  border: BRASS,
  displayFont: DECO,
  eyebrowFont: MARGINALIA,
  bodyFont: READING,
  headerStyle: {
    background: BAND,
    border: `1px solid ${BRASS}`,
    boxShadow: SHADOW,
    padding: 'var(--space-2xl) var(--space-3xl)',
    marginBottom: 'var(--space-4xl)',
    marginTop: 'var(--space-sm)',
  },
  headerDecoration: (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: BRASS, zIndex: 3 }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            `repeating-linear-gradient(0deg, transparent, transparent 22px, color-mix(in srgb, ${BRASS_LIGHT} 12%, transparent) 22px, color-mix(in srgb, ${BRASS_LIGHT} 12%, transparent) 23px), repeating-linear-gradient(90deg, transparent, transparent 22px, color-mix(in srgb, ${BRASS_LIGHT} 12%, transparent) 22px, color-mix(in srgb, ${BRASS_LIGHT} 12%, transparent) 23px)`,
        }}
      />
    </>
  ),
  taglineExtra: { color: BAND_INK, letterSpacing: '0.08em', textTransform: 'uppercase' },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: 'transparent',
    border: `1px solid ${BRASS}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, ${BRASS}, ${GOLD})`,
  barTrack: `color-mix(in srgb, ${BRASS} 30%, transparent)`,
  formatLevel: romanLevel,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1.5px dashed ${BRASS}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PLATE,
  },
  laurel: <SpectrumLaurel centerBg={DISC} glyphColor={BRASS} />,
  badgeBoardStyle: {
    border: `1px solid ${LINE}`,
    background: PLATE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...SMALL_CAPS,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.14em',
    color: QUIET,
    marginLeft: 'auto',
    border: `1px solid ${LINE}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={RULE}
      nameStyle={{ fontFamily: DECO, color: INK, lineHeight: 1.2, letterSpacing: '0.03em' }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: BAND,
            border: `1px solid ${BRASS}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: GOLD,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function EphemeristsProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
