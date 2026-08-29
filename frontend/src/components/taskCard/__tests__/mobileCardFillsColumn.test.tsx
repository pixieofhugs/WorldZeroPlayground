/**
 * BELOW 768px A CARD FILLS ITS COLUMN (#2763, owner ruling).
 *
 * THE SEAM: the `useFormFactor()` branch inside each task-card archetype, where
 * the skin root's inline `width` is chosen — plus the two stylesheet rules that
 * decide whether that width can be honoured. Nothing here measures anything:
 * the harness is `renderToStaticMarkup` in node, so this asserts the DECISION
 * (what width each skin asks for, at which form factor) and the CONDITION each
 * CSS rule is written under. VISUAL QA AT ~375px AND ~700px IS OUTSTANDING and
 * is stated as such on the PR.
 *
 * Why this is a mobile-only exemption from §6's "do not regularize card sizes":
 * on a phone the row wraps to one card per line, so a card that keeps its own
 * 340px inside a ~552px column is not ragged, it is misaligned — it sits
 * narrower than, and left-flush against, the plate above it. Desktop keeps the
 * ragged widths, the left-flush wrap and the rotations, which is why every
 * assertion here comes in a pair.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CardProps } from '../TaskCard'

const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

// PARTIAL: `MOBILE_QUERY` and `formFactorFor` are real — a wholesale factory
// would blank them for anything else this tree pulls in.
vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => dispatch.formFactor,
}))

// Imported after the mock is registered.
import { surfaceMap } from '../../../factions'
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from '../../../test/indexCss'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

/**
 * Albescent is in the table as itself: its own wrapper is the outermost box.
 *
 * Read off `surfaceMap('taskCard')` rather than typed (#2815) — a card that a
 * tenth kit registers has the same column to fill, and a table naming nine
 * components is a range someone has to remember to widen. Annotated as a tuple
 * array rather than inferred, the way `duelSkinSlots.test.tsx` does it:
 * `Object.entries` widens to `(string | ComponentType)[]` otherwise and
 * `it.each` then cannot match the two-arg callback.
 */
const SKINS: [string, ComponentType<CardProps>][] = Object.entries(surfaceMap('taskCard'))

function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

/** The opening tag of the card's OUTERMOST box — the one the row lays out. */
function outerTag(Card: ComponentType<CardProps>): string {
  const out = markup(
    <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
  )
  return out.slice(0, out.indexOf('>') + 1)
}

/**
 * The value of the tag's OWN `width`, never `max-width`. Every one of these
 * cards carries `max-width:100%` as well, and a plain substring test reads that
 * as the fix having landed — the boundary is the whole point of this helper.
 */
function widthOf(tag: string): string | undefined {
  return /[;"]width:([^;"]+)/.exec(tag)?.[1]
}

describe('below 768px every task card asks for the whole column (#2763)', () => {
  it('covers every skin the app can dispatch taskCard to', () => {
    expect(SKINS).toHaveLength(9)
  })

  it.each(SKINS)('%s: the outermost box fills the line on a phone', (_name, Card) => {
    dispatch.formFactor = 'mobile'
    // 340px is the number the report is about, and `fit-content` is
    // Albescent's wrapper shrinking to whatever the card inside it chose —
    // either one puts the card back inside its column, left-flush.
    expect(widthOf(outerTag(Card)), 'the card fills the content column').toBe('100%')
  })

  it.each(SKINS)('%s: the desktop width is untouched', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    // Albescent still shrink-wraps the na card on the desktop; the other eight
    // draw the 384 their archetype chose. Both are the ragged row §6 protects.
    expect(widthOf(outerTag(Card)), 'the desktop keeps its own width').toMatch(
      /^(384px|fit-content)$/,
    )
  })
})

const CSS = readIndexCss()

/**
 * The `@media` preludes wrapping the first rule whose selector contains
 * `needle`, outermost first. Comments are stripped before the scan: this
 * stylesheet's prose is longer than its declarations and it contains braces.
 *
 * ponytail: a brace counter, not a parser (none is installed). Ceiling: it
 * would be fooled by a brace inside a string or a `url()`; neither exists in
 * this file, and adding one breaks this guard loudly rather than quietly.
 */
function enclosingMedia(needle: string): string[] {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const at = css.indexOf(needle)
  expect(at, `${needle} is still in index.css`).toBeGreaterThan(-1)
  const stack: string[] = []
  let prelude = ''
  for (let i = 0; i < at; i++) {
    const ch = css[i]
    if (ch === '{') {
      stack.push(prelude.trim())
      prelude = ''
    } else if (ch === '}') {
      stack.pop()
      prelude = ''
    } else if (ch === ';') {
      prelude = ''
    } else {
      prelude += ch
    }
  }
  return stack.filter((p) => p.startsWith('@media'))
}

describe('the two stylesheet rules the widen depends on (#2763)', () => {
  it('the praxis gallery half-row cap is desktop-only', () => {
    // `.praxis-gallery > * { max-width: 50% }` (#2229) is right on a desktop —
    // one card of three may not eat the row — and always wrong on a phone,
    // where every row holds one card and is always under-filled, so the cap
    // always bites. It is the 278px-of-552 praxis card in the report.
    expect(enclosingMedia('.praxis-gallery > *')).toContain('@media (min-width: 768px)')
  })

  it('the row hands its item the full line below 768px', () => {
    // The skin root's `width: 100%` resolves against the flex ITEM (the
    // dispatcher's wrapper), whose own width is auto — a percentage against an
    // indefinite parent falls back to max-content, so a short card could sit
    // narrower than the line and let a second card share it. This rule is what
    // makes the item's width definite; without it the archetype change is
    // right only by accident.
    expect(enclosingMedia('.task-card-row > * {')).toContain('@media (max-width: 767px)')
  })
})
