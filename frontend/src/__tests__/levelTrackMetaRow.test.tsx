/**
 * The level track's caption row is ONE component, and it wraps (#2767).
 *
 * WHAT BROKE
 * ----------
 * At the top of the era's curve the left caption is
 * `"Nowhere to go from here but the top"` — 35 characters at `--text-base`
 * (10px), uppercase, `0.12em` tracking, so roughly 262px. The right caption
 * (`"3,886 all-time"`) is roughly 105px. The rail is about 272px and the mobile
 * Field Desk's column is narrower still, so the pair has no fitting solution at
 * any gap. On `align-items: center` the two wrapped blocks interleave and the
 * 8px gap between them disappears; the captions read as one paragraph.
 *
 * The mid-curve branch (`"114 TO LEVEL 9"`, ~105px) fits comfortably, which is
 * why this survived: the defect appears only when `LevelTrack.nextLevel` is
 * `null` (`utils/levelTrack.ts`).
 *
 * WHY A SOURCE SCAN AND NOT A RENDER
 * ----------------------------------
 * This harness is `renderToStaticMarkup` in node. There is no layout, so
 * NOTHING here can see two captions collide — that check is a pair of eyes at
 * 320px and 375px, and the PR says which surfaces got them. What a scan CAN
 * see is the thing that made a three-property fix expensive: the row was
 * hand-authored in nine files, so nine copies had to be found before any of
 * them could be fixed, and a tenth could appear tomorrow.
 *
 * So the guard pins the seam rather than the pixels:
 *
 * - the row's i18n keys are named in exactly one component, so a new caller
 *   mounts `LevelTrackMeta` instead of copying the row again;
 * - that component carries the three properties the fix consists of.
 *
 * `WowFieldDesk.tsx` is why the scan anchors on the i18n keys and not on
 * `className="flex items-center gap-2"`: it spelled the same row as an inline
 * style object, so a class-name census missed it. `AlbescentFieldDesk.tsx` is
 * NOT a site — it renders `DefaultFieldDesk` whole and inherits whatever that
 * draws.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { CSSProperties } from 'react'
import '../i18n'

import LevelTrackMeta from '../components/LevelTrackMeta'
import { levelTrack } from '../utils/levelTrack'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

/** The component that owns the row. Every other file must go through it. */
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

/**
 * The captions, by the keys they are drawn from — the spelling-proof anchor.
 *
 * `topLevel` is deliberately NOT here. The character profile draws the same
 * sentence in its own body voice at `--text-content`, where #2383 already gave
 * it the whole row and there is no all-time span beside it; that is a different
 * surface, not a tenth copy of this one. These two keys appear nowhere but the
 * row, so they identify it without help.
 */
const CAPTION_KEYS = ['sidebar.characterCard.allTime', 'sidebar.characterCard.toNextLevel']

/** Where the shared `topLevel` sentence is legitimately drawn outside the row. */
const TOP_LEVEL_ELSEWHERE = [
  'pages/characterProfile/archetypes/DefaultProfileBody.tsx',
  'pages/characterProfile/archetypes/profileSkin.tsx',
]

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

  // The row keeps the eight desks' Tailwind spelling, so the properties are in
  // the class list rather than a style attribute — vitest compiles no CSS, so
  // the class names are as close to the cascade as this harness gets.
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
