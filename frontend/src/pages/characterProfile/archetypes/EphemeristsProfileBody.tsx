/**
 * EphemeristsProfileBody — the VALLEY PLATE player-profile skin (#460, swept off
 * the illuminated codex by #1208). The night-band header ruled in brass over a
 * ghost graticule, roman-numeral "GRADE" levels, and papyrus plates below.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. Two grounds
 * carry ink: the band (`band-ink` 12.4:1, `gold` 9.4) and the plate under it
 * (`ink` 11.3, `quiet` 5.6, `nile` 5.0). The page beneath is `-plate-page`,
 * where only `ink`, `quiet` and `nile` clear — which is why the kit's `muted`
 * is `quiet` and not `-plate-muted`.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import {
  BAND,
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  DECO,
  DISC,
  GOLD,
  INK,
  LINE,
  MARGINALIA,
  NILE,
  PAGE,
  PLATE,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
} from '../../../components/cards/ephemeristsPlate'
import { toRoman } from '../../../utils/roman'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

/** Level 0 shows a mid-dot rather than a numeral — the codex's own convention. */
const grade = (value: number): string => (value > 0 ? toRoman(value) : '\u00b7')

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ fontFamily: MARGINALIA, fontStyle: 'italic', fontSize: 'var(--text-lg)', color: QUIET, marginBottom: 'var(--space-xs)' }}>
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

const kit: ProfileKit = {
  slug: 'ephemerists',
  pageBackground: PAGE,
  pageOverlay: `radial-gradient(color-mix(in srgb, ${INK} 6%, transparent) 1px, transparent 1px)`,
  ink: INK,
  muted: QUIET,
  accent: NILE,
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
  nameSize: 48,
  nameExtra: { color: BAND_INK, letterSpacing: '0.08em', textTransform: 'uppercase' },
  playerEyebrow: 'Player · The Ephemerists',
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
  ringLabel: 'grade',
  barFill: `linear-gradient(90deg, ${BRASS}, ${GOLD})`,
  barTrack: `color-mix(in srgb, ${BRASS} 30%, transparent)`,
  formatLevel: grade,
  levelUnitLabel: 'pvncta this grade',
  nextLevelLabel: (next) => `next · grade ${grade(next)}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `Filed to the codex by ${name}`,
  praxisEmpty: {
    title: 'The codex holds no entry yet',
    body: 'Walk a road, and set the first record down.',
  },
  emptyStateStyle: {
    border: `1.5px dashed ${BRASS}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PLATE,
  },
  laurel: <SpectrumLaurel centerBg={DISC} glyphColor={BRASS} />,
  badgeTitle: 'Concordances',
  badgeBoardStyle: {
    border: `1px solid ${LINE}`,
    background: PLATE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...SMALL_CAPS,
    fontSize: 'var(--text-sm)',
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
  return <ProfileSkin props={props} kit={kit} />
}
