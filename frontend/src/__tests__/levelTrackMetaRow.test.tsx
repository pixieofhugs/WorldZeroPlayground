/**
 * The level track's caption row is ONE component, and it wraps (#2767).
 *
 * At the top of the curve (`nextLevel === null`) the left caption is too wide
 * for the rail, and on `align-items: center` the wrapped captions interleave.
 * No layout in node, so this pins the seam, not pixels: the row's i18n keys
 * live in one component (keys, not class names — some sites used inline
 * styles), and that component carries the wrap fix.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { CSSProperties } from 'react'
import '../i18n'

import LevelTrackMeta from '../components/LevelTrackMeta'
import { levelTrack } from '../utils/levelTrack'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

const OWNER = 'components/LevelTrackMeta.tsx'

/** The nine surfaces that mount the row (`AlbescentFieldDesk` inherits it). */
const SITES = [
  'components/layout/Sidebar.tsx',
  'pages/fieldDesk/mobileArchetypes/CovenFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/DefaultFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/EphemeristsFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/EverymenFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/SingularityFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/SnideFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/UaFieldDesk.tsx',
  'pages/fieldDesk/mobileArchetypes/WowFieldDesk.tsx',
]

/** Not `topLevel`: the character profile draws that sentence on its own row. */
const CAPTION_KEYS = ['sidebar.characterCard.allTime', 'sidebar.characterCard.toNextLevel']

/** Where `topLevel` is legitimately drawn outside the row. */
const TOP_LEVEL_ELSEWHERE = ['pages/characterProfile/archetypes/profileSkin.tsx']

const filesNaming = (key: string): string[] =>
  sourceFiles()
    .filter((path) => readStripped(path).includes(key))
    .map(toRelative)
    .sort()

/** A curve with a top: level 8 is the last rung. */
const THRESHOLDS = [0, 10, 20, 30, 40, 50, 60, 70, 80]

const MARKER: CSSProperties = { letterSpacing: '0.12em' }

describe('one component owns the caption row', () => {
  for (const key of CAPTION_KEYS) {
    it(`\`${key}\` is drawn in exactly one file`, () => {
      expect(filesNaming(key)).toEqual([OWNER])
    })
  }

  it('leaves the character profile copy of the top-of-curve sentence alone', () => {
    expect(filesNaming('sidebar.characterCard.topLevel')).toEqual(
      [OWNER, ...TOP_LEVEL_ELSEWHERE].sort(),
    )
  })

  it('all nine sites mount it', () => {
    const mounts = sourceFiles()
      .filter((path) => /<LevelTrackMeta[\s/>]/.test(readStripped(path)))
      .map(toRelative)
      .sort()

    expect(mounts).toEqual([...SITES].sort())
  })
})

describe('the shared row wraps instead of interleaving', () => {
  const markup = renderToStaticMarkup(
    <LevelTrackMeta track={levelTrack(8, 3886, THRESHOLDS)} allTimeScore={3886} style={MARKER} />,
  )

  // Tailwind classes: as close to the cascade as a no-CSS harness gets.
  it('lets the captions wrap onto a second line', () => {
    expect(markup).toContain('flex-wrap')
  })

  it('aligns on the baseline, so wrapped lines cannot interleave', () => {
    expect(markup).toContain('items-baseline')
    expect(markup).not.toContain('items-center')
  })

  it('keeps `3,886 ALL-TIME` on one line and flush right', () => {
    expect(markup).toContain('white-space:nowrap')
    expect(markup).toContain('margin-left:auto')
  })

  it('draws the top-of-curve caption, not a level to climb to', () => {
    expect(markup).toContain('Nowhere to go from here but the top')
    expect(markup).toContain('3,886')
  })
})

describe('the faction voice arrives through the style prop', () => {
  it('is spread onto both captions, not re-derived', () => {
    const markup = renderToStaticMarkup(
      <LevelTrackMeta track={levelTrack(3, 35, THRESHOLDS)} allTimeScore={35} style={MARKER} />,
    )

    expect(markup.match(/letter-spacing:0\.12em/g)).toHaveLength(2)
  })

  it('draws only the all-time caption when there is no track', () => {
    const markup = renderToStaticMarkup(
      <LevelTrackMeta track={null} allTimeScore={35} style={MARKER} />,
    )

    expect(markup).not.toContain('to Level')
    expect(markup).not.toContain('Nowhere to go')
    expect(markup).toContain('35')
  })
})
