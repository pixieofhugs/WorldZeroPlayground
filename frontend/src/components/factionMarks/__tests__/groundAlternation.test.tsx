/**
 * The ornament-alternation law every faction's cards share (#2394-#2399, #2499): worn on an
 * unthemed route or a wash, dropped on a patterned ground, kept under the faction-page
 * exemption. The predicate is in `groundIsBusy.test.tsx`; each faction's own extras (what
 * stays bare, which chrome survives) live in its own file.
 */
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

// `useTheme()` throws outside a `ThemeProvider` (#701).
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import { BackdropContext } from '../../backdrop/BackdropContext'
import CovenTaskCard from '../../taskCard/CovenTaskCard'
import SnideTaskCard from '../../taskCard/SnideTaskCard'
import EphemeristsTaskCard from '../../taskCard/EphemeristsTaskCard'
import AlbescentTaskCard from '../../taskCard/AlbescentTaskCard'
import SingularityTaskCard from '../../taskCard/SingularityTaskCard'
import CovenPraxisCard from '../../praxisCard/desktop/CovenPraxisCard'
import SnidePraxisCard from '../../praxisCard/desktop/SnidePraxisCard'
import EphemeristsPraxisCard from '../../praxisCard/desktop/EphemeristsPraxisCard'
import AlbescentPraxisCard from '../../praxisCard/desktop/AlbescentPraxisCard'
import { SingularityPraxisCard } from '../../praxisCard/desktop/SingularityPraxisCard'
import { aTask, aPraxisCard } from '../../../test/fixtures'

type AnyCard = ComponentType<Record<string, unknown>>
type Row = [slug: string, Task: AnyCard, Praxis: AnyCard, worn: (html: string) => boolean]

const firstClasses = (html: string) => html.match(/class="([^"]*)"/)?.[1] ?? ''

const FACTIONS = [
  ['coven', CovenTaskCard, CovenPraxisCard, (h: string) => h.includes('class="cvn-wheel"')],
  ['snide', SnideTaskCard, SnidePraxisCard, (h: string) => h.includes('--faction-snide-note-grain')],
  ['ephemerists', EphemeristsTaskCard, EphemeristsPraxisCard, (h: string) => h.includes('d="M-6 ')],
  ['albescent', AlbescentTaskCard, AlbescentPraxisCard, (h: string) => /\balb-prism\b/.test(firstClasses(h))],
  [
    'singularity',
    SingularityTaskCard,
    SingularityPraxisCard,
    (h: string) => h.includes('repeating-linear-gradient(0deg, var(--faction-singularity-term-scan)'),
  ],
] as unknown as Row[]

describe.each(FACTIONS)('%s cards alternate their ornament with the ground', (slug, Task, Praxis, worn) => {
  const task = aTask({ primary_faction_slug: slug })
  const praxis = aPraxisCard({ task_faction_slug: slug, created_by_faction_slug: slug })
  const adminProps = { praxis, showAdminControls: false, onHide: () => {}, onDelete: () => {}, onFail: () => {} }
  const cards = {
    task: (
      <Task task={task} basePoints={task.point_value} multiplier={1} inProgressCount={0} onSignup={() => {}} />
    ),
    praxis: <Praxis praxis={praxis} adminProps={adminProps} />,
  }

  const on = (card: keyof typeof cards, ground: string | null, keep = false) =>
    renderToStaticMarkup(
      <BackdropContext.Provider value={{ slug: ground, cardsKeepOrnament: keep, setGround: () => {} }}>
        <MemoryRouter>{cards[card]}</MemoryRouter>
      </BackdropContext.Provider>,
    )

  it.each(['task', 'praxis'] as const)('%s card: worn on an unthemed route and on a wash', (card) => {
    expect(worn(on(card, null)), 'unthemed').toBe(true)
    expect(worn(on(card, 'coven')), 'a wash ground').toBe(true)
  })

  it.each(['task', 'praxis'] as const)('%s card: dropped on any patterned ground', (card) => {
    for (const busy of ['everymen', 'wow']) expect(worn(on(card, busy)), busy).toBe(false)
  })

  it.each(['task', 'praxis'] as const)('%s card: kept under the faction-page exemption', (card) => {
    expect(worn(on(card, 'everymen', true))).toBe(true)
  })
})
