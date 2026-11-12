/**
 * Everymen wears ONE burst, and it alternates (#2393). One drawing: `.em-burst`
 * in index.css, transcribed by no component. The alternation drops the texture
 * and ONLY the texture. "Either burst, or plain": the retired ruled paper, dot
 * grid and hatch stay gone.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import EverymenTaskCard from '../EverymenTaskCard'
import EverymenPraxisCard from '../../praxisCard/desktop/EverymenPraxisCard'
import type { ArchetypeProps } from '../../praxisCard/desktop/shared'
import { BackdropContext } from '../../backdrop/BackdropContext'
import { aTask, aPraxisCard } from '../../../test/fixtures'
import { sourceFiles, toRelative } from '../../../test/sourceScan'
import { ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const SRC = fileURLToPath(new URL('../../../', import.meta.url))
const CSS = stripComments(readIndexCss())

/** The canonical drawing, owner-named: the task card's own conic. */
const CONIC =
  'repeating-conic-gradient(from 0deg at 50% 50%, var(--em-burst-ray, var(--faction-everymen-bill-ray)) 0 5.2deg, transparent 5.2deg 10.4deg)'
const MASK = 'radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)'

const EVERYMEN_SOURCES = sourceFiles().filter((path) => /Everymen/.test(path))

const adminProps = {
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as ArchetypeProps['adminProps']

function onGround(
  node: ReactElement,
  slug: string | null,
  cardsKeepOrnament = false,
): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>{node}</MemoryRouter>
    </BackdropContext.Provider>,
  )
}

const task = aTask({ description: 'Fix the lamp on the corner nobody owns.' })
const taskCard = (
  <EverymenTaskCard
    task={task}
    basePoints={task.point_value}
    multiplier={1}
    inProgressCount={0}
    onSignup={() => {}}
  />
)
const praxis = aPraxisCard({ task_faction_slug: 'everymen' })
const praxisCard = (
  <EverymenPraxisCard praxis={praxis} adminProps={{ ...adminProps, praxis }} showCrown />
)

const CARDS: [string, ReactElement][] = [
  ['task card', taskCard],
  ['praxis card', praxisCard],
]

describe('Everymen draws ONE burst (#2195)', () => {
  it('keeps the canonical geometry in a single stylesheet rule', () => {
    const bodies = ruleBodies(CSS, '.em-burst')
    expect(bodies, 'one `.em-burst` rule, not one per surface').toHaveLength(1)
    const burst = bodies[0]!
    expect(burst, 'the rays converge on the sheet centre (#2034)').toContain(CONIC)
    expect(burst, 'the gold corner glow').toContain(
      'radial-gradient(40% 32% at 100% 0, var(--faction-everymen-bill-glow-gold), transparent 70%)',
    )
    expect(burst, 'the olive corner glow').toContain(
      'radial-gradient(44% 38% at 0 100%, var(--faction-everymen-bill-glow-olive), transparent 70%)',
    )
    // Both spellings: Safari needs the prefix.
    expect(burst).toContain(`-webkit-mask-image: ${MASK}`)
    expect(burst).toContain(`mask-image: ${MASK}`)
    expect(burst).toContain('pointer-events: none')
  })

  it('draws that conic exactly once in the stylesheet', () => {
    expect(CSS.split(CONIC).length - 1, 'one drawing, not one per surface').toBe(1)
    for (const selector of ['.em-backdrop', '.em-broadsheet', '.em-dispatch']) {
      expect(
        ruleBodies(CSS, selector).join('\n'),
        `${selector} mounts the burst, it does not re-draw it`,
      ).not.toContain('repeating-conic-gradient')
    }
  })

  it('lets no Everymen component transcribe a burst of its own', () => {
    expect(EVERYMEN_SOURCES.length, 'the Everymen kit is in the scan').toBeGreaterThan(8)
    for (const path of EVERYMEN_SOURCES) {
      // `/* */` stripped: files may NAME the geometry they retired.
      const code = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(
        code,
        `${toRelative(path)} draws its own conic — mount \`em-burst\` instead`,
      ).not.toContain('repeating-conic-gradient')
    }
  })
})

describe('Everymen alternates on a busy ground (#2393)', () => {
  it.each(CARDS)('%s wears the burst on a plain ground', (_name, card) => {
    // `null` = unthemed routes; WASH profiles (Coven, UA) are plain too.
    for (const slug of [null, 'coven', 'ua', 'albescent']) {
      expect(onGround(card, slug), `plain ground ${slug}`).toContain('em-burst')
    }
  })

  it.each(CARDS)('%s goes plain on a patterned ground', (_name, card) => {
    for (const slug of ['everymen', 'snide', 'singularity']) {
      expect(onGround(card, slug), `busy ground ${slug}`).not.toContain('em-burst')
    }
  })

  it.each(CARDS)('%s keeps the burst where the page claimed the exemption', (_name, card) => {
    // `useFactionDetail` is the one caller that claims it.
    expect(onGround(card, 'everymen', true)).toContain('em-burst')
  })

  it.each(CARDS)('%s changes NOTHING but the texture', (_name, card) => {
    const plain = onGround(card, null).replace(
      /<div aria-hidden="true" class="em-burst"[^>]*><\/div>/,
      '',
    )
    expect(onGround(card, 'everymen'), 'chrome never branches on the ground').toBe(plain)
  })
})

describe('either burst, or plain — no third texture (#2195)', () => {
  it('leaves the praxis card no ruled paper', () => {
    // Owner ruling on #2195: the kit's ornament or nothing.
    const source = readFileSync(
      join(SRC, 'components/praxisCard/desktop/EverymenPraxisCard.tsx'),
      'utf8',
    )
    expect(source, 'the ruled line is retired, not merely recoloured').not.toContain(
      'repeating-linear-gradient',
    )
    expect(source, 'and its raw ink went with it').not.toContain('rgba(100,140,200')
  })

  it('leaves the dispatch sheet its margin rule and nothing else', () => {
    const body = ruleBodies(CSS, '.em-dispatch').join('\n')
    expect(body, 'the red margin rule is a single left-edge line, and stays').toContain('21px 23px')
    expect(body, 'the ledger rules are gone').not.toContain('repeating-linear-gradient')
    expect(body, 'and so is the dot grid').not.toContain('0.6px, transparent 0.9px')
    expect(CSS, 'the rule ink was the ledger lines’ only reader').not.toContain(
      '--faction-everymen-dispatch-rule',
    )
  })

  it('leaves the feed slip bare newsprint', () => {
    const source = readFileSync(join(SRC, 'components/feed/EverymenFeedFrame.tsx'), 'utf8')
    expect(source, 'the 45/-45 hatch is retired').not.toContain('repeating-linear-gradient(45deg')
    expect(source).not.toContain('repeating-linear-gradient(-45deg')
  })
})
