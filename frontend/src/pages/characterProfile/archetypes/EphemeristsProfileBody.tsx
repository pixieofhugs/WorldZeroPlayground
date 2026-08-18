/**
 * EphemeristsProfileBody — the VALLEY PLATE player-profile skin (#460, swept off
 * the illuminated codex by #1208). The night-band header ruled in brass over a
 * ghost graticule, roman-numeral levels, and papyrus plates below.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. THREE grounds
 * carry ink, and the header's is not the body's: the cornice band (`band-ink`
 * 14.00:1, `band-quiet` 8.97), the plate under it (`ink` 13.91, `quiet` 5.98,
 * `nile` 7.00) and the page beneath that (`ink` 14.84, `quiet` 6.38, `nile`
 * 7.47). Since #1627 the whole register is theme-invariant, so each of those is
 * one reading rather than two.
 *
 * The kit therefore names TWO quiet inks. `muted` is `-plate-quiet`, for the
 * body's plates and page; `headerMuted` is `-plate-band-quiet`, which is the
 * ink the band owns. They were one field until #1636, and the five quiet lines
 * inside `<header>` — eyebrow, handle, and the progression panel's four —
 * inherited the body's ink onto the band, where it read 2.07:1 in light.
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

/** Level 0 shows a mid-dot rather than a numeral — the codex's own convention. */
const romanLevel = (value: number): string => (value > 0 ? toRoman(value) : '\u00b7')

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

const dress: ProfileDress = {
  slug: 'ephemerists',
  pageBackground: PAGE,
  pageOverlay: `radial-gradient(color-mix(in srgb, ${INK} 6%, transparent) 1px, transparent 1px)`,
  ink: INK,
  muted: QUIET,
  headerMuted: BAND_QUIET,
  accent: BRASS_LIGHT,
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
  // BAND_INK, not `ink`: the slot sits on the plate's cornice band, which is a
  // different stock from the panel `ink` was measured for (#1636).
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
  // The level ring is a brass instrument, so its label is engraved rather than
  // whispered (#1630). Not free from #1645's card-* repoint, which is where this
  // was expected to fall out: that landed `--faction-ephemerists-card-accent` on
  // the brass, and this kit reads none of the `card-*` family — its accent is
  // the plate's link ink, which #2141 moved from the retired aqua to
  // `-plate-brass-light`, and this label was `-plate-quiet`. 5.09:1 on the
  // vellum sheet, 9.68:1 on the night plate.
  ringLabelInk: BRASS_LIGHT,
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
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
