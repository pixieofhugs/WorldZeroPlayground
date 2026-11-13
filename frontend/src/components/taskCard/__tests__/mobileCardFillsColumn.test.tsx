/**
 * BELOW 768px A CARD FILLS ITS COLUMN (#2763, owner ruling). Asserts the width
 * each skin asks for per form factor, and the media conditions of the two CSS
 * rules that let it be honoured. A mobile-only exemption from §6: desktop keeps
 * its ragged widths, so every assertion comes in a pair.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CardProps } from '../TaskCard'

const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

// PARTIAL: keep the real `MOBILE_QUERY` and `formFactorFor`.
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
 * Off the registry (#2815). Typed as a tuple array: `Object.entries` otherwise
 * widens and `it.each` can't match the two-arg callback.
 */
const SKINS: [string, ComponentType<CardProps>][] = Object.entries(surfaceMap('taskCard'))

function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

/** The opening tag of the OUTERMOST box — the one the row lays out. */
function outerTag(Card: ComponentType<CardProps>): string {
  const out = markup(
    <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
  )
  return out.slice(0, out.indexOf('>') + 1)
}

/** The tag's OWN `width`, never `max-width` (which every card also carries). */
function widthOf(tag: string): string | undefined {
  return /[;"]width:([^;"]+)/.exec(tag)?.[1]
}

describe('below 768px every task card asks for the whole column (#2763)', () => {
  it('covers every skin the app can dispatch taskCard to', () => {
    expect(SKINS).toHaveLength(9)
  })

  it.each(SKINS)('%s: the outermost box fills the line on a phone', (_name, Card) => {
    dispatch.formFactor = 'mobile'
    expect(widthOf(outerTag(Card)), 'the card fills the content column').toBe('100%')
  })

  it.each(SKINS)('%s: the desktop width is untouched', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    // Albescent shrink-wraps the na card; the rest draw 384.
    expect(widthOf(outerTag(Card)), 'the desktop keeps its own width').toMatch(
      /^(384px|fit-content)$/,
    )
  })
})

const CSS = readIndexCss()

/**
 * `@media` preludes around the first rule containing `needle`, outermost first.
 *
 * ponytail: a brace counter, not a parser. Fooled by a brace in a string or
 * `url()`; none exist, and adding one fails this loudly.
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
    // The 50% cap (#2229) always bites on a one-card phone row.
    expect(enclosingMedia('.praxis-gallery > *')).toContain('@media (min-width: 768px)')
  })

  it('the row hands its item the full line below 768px', () => {
    // `width: 100%` resolves against the flex item; this rule makes the item's
    // width definite, or a short card falls back to max-content.
    expect(enclosingMedia('.task-card-row > * {')).toContain('@media (max-width: 767px) and (pointer: coarse)')
  })
})
