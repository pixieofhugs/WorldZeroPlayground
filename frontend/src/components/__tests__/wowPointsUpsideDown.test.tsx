/**
 * Warriors of Whimsy hang their points upside down (#1716) — an owner ruling,
 * deliberate whimsy rather than a defect.
 *
 * The ruling draws a line by SURFACE, not by component: a player who is
 * SCANNING may be played with; a player CHECKING what they earned may not. So
 * the marks turn on the tasks list, the field desk and home, and stay upright
 * on the character profile, the faction page, the task detail, the praxis
 * detail and the composer's waiting slip — even though several of those mount
 * the very same card.
 *
 * That is why nothing here decides its own angle. Both marks read
 * `rotate(var(--wow-points-flip, 0deg))` and the MOUNT declares the value —
 * `.scanning-surface` in `index.css` for the browsing pages, `WowPraxisCard`'s
 * own frame for the praxis total (the checking surfaces mount the shared stamp
 * directly, never the card). This is §1.2's inherited-custom-property rule
 * (#1137) spent on a rotation instead of a width. The direction matters: unset
 * is upright, so an exempt surface — and any page built tomorrow — is right way
 * up BY CONSTRUCTION rather than by an exclusion list someone has to maintain.
 *
 * The a11y contract is the other half. A rotation is a TRANSFORM on the
 * presentation: the characters keep their reading order in the DOM, so the
 * numeral is still announced correctly and still selectable. Every case below
 * pins the literal figure inside the turned element for exactly that reason —
 * a skin that "flips" by reversing or substituting characters passes an
 * eyeball check and fails here.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md). No CSS
 * engine either, which is why the mount half is asserted against the SOURCE:
 * markup can only show that the knob is read and where it is declared.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceFiles as scanSource } from '../../test/sourceScan'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import { aPraxisCard, aTask } from '../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => mocks.formFactor }))

// Imported after the mock so the card picks it up.
const { default: WowTaskCard } = await import('../taskCard/WowTaskCard')
const { default: WowScoreStamp } = await import('../praxisCard/scoreStamp/WowScoreStamp')
const { WowPraxisCard } = await import('../praxisCard/desktop/WowPraxisCard')

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')

const TASK = aTask({
  created_by: 3,
  primary_faction_slug: 'wow',
  created_by_display_name: '',
})

const PRAXIS = aPraxisCard({
  id: 1,
  created_by_id: 7,
  created_by_display_name: 'Isolde',
  created_by_faction_slug: 'wow',
  task_faction_slug: 'wow',
  task_title: 'Photosynthesis',
  score: 13.6,
  voter_count: 3,
})

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

/**
 * The deferring element, with its digits still inside it and still in order.
 * Written as one regex rather than two `toContain`s on purpose: "the markup
 * reads the knob somewhere" and "the numeral reads 18" are both true of a card
 * that wired up the wrong box.
 */
const flippableNumeral = (figure: string) =>
  new RegExp(
    `<span style="[^"]*transform:rotate\\(var\\(--wow-points-flip, 0deg\\)\\)[^"]*">${figure}</span>`,
  )

/** Every `.ts`/`.tsx` under `frontend/src`, tests included. */
const sourceFiles = () => scanSource({ dir: SRC, includeTests: true })

describe('the WOW marks defer their angle to the mount (#1716)', () => {
  for (const formFactor of ['desktop', 'mobile'] as const) {
    it(`the task card reads the knob and keeps the plaque's two-degree tilt — ${formFactor}`, () => {
      mocks.formFactor = formFactor
      const html = render(
        <WowTaskCard task={TASK} basePoints={18} multiplier={1} inProgressCount={0} />,
      )

      // The figure itself is what turns, and only when a mount says so.
      expect(html).toMatch(flippableNumeral('18'))
      // The plaque's own strike survives — this composes with it, on a
      // separate element, rather than replacing it.
      expect(html).toContain('transform:rotate(-2deg)')
      // ...and the plaque is still the thing wearing the tilt, not the numeral.
      expect(html).not.toContain('rotate(-2deg) rotate(')
      mocks.formFactor = 'desktop'
    })
  }

  it('the task card declares no angle of its own, so an unlisted mount is upright', () => {
    // The character profile, the faction page and the task detail all mount
    // this card and are exempt. None of them is named anywhere in the card —
    // they are upright because the card asks rather than decides.
    const html = render(
      <WowTaskCard task={TASK} basePoints={18} multiplier={1} inProgressCount={4} />,
    )
    expect(html).not.toContain('180deg')
    expect(html.match(/--wow-points-flip/g)).toHaveLength(1)
  })

  it('the stamp reads the flip off its mount and resolves to 0deg unset', () => {
    const bare = renderToStaticMarkup(<WowScoreStamp praxis={PRAXIS} />)
    // The figure is inside the deferring element, digits in reading order.
    expect(bare).toMatch(flippableNumeral('13\\.6'))
    // The fallback is today's render: a stamp nobody flips is upright, which is
    // what the praxis detail and the composer's waiting slip mount.
    expect(bare).not.toContain('180deg')
    // The stamp's own two-degree strike is untouched.
    expect(bare).toContain('transform:rotate(-2deg)')
  })

  it('the praxis CARD declares the flip, because only a browsing surface mounts it', () => {
    const html = render(
      <WowPraxisCard
        praxis={PRAXIS}
        adminProps={{
          praxis: PRAXIS,
          showAdminControls: false,
          onHide: () => {},
          onFail: () => {},
          moderateError: null,
        }}
        showCrown
      />,
    )
    expect(html).toContain('--wow-points-flip:180deg')
    // And the figure is still the figure: 13.6, in that order, in the DOM.
    expect(html.replace(/<[^>]*>/g, '')).toContain('13.6')
  })
})

describe('only the browsing surfaces declare the flip (#1716)', () => {
  it('`.scanning-surface` is what carries the angle', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8')
    expect(css).toMatch(/\.scanning-surface\s*\{[^}]*--wow-points-flip:\s*180deg/)
  })

  /**
   * The opt-in list, asserted as an EXACT set. A browsing page that loses the
   * class silently stops being whimsical; a checking page that gains one
   * silently starts. Both are the same failure and this is the only place that
   * can see either, because there is no CSS engine in this harness.
   */
  it('exactly the tasks list, the field desk and home opt in', () => {
    // The class WORN, not merely named — several files discuss it in prose.
    const worn = /className="[^"]*\bscanning-surface\b/
    const wearers = sourceFiles()
      .filter((path) => worn.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1).replace(/\\/g, '/'))
      .sort()

    expect(wearers).toEqual([
      'pages/FieldDesk.tsx',
      'pages/Home.tsx',
      'pages/Tasks.tsx',
      'pages/tasks/mobileArchetypes/DefaultTasks.tsx',
    ])
  })
})
