/**
 * `DuelSealConfirm` dispatch × `useFormFactor()` (#1313): one responsive
 * component per faction. `useFormFactor` is mocked because static render always
 * takes the 'desktop' server snapshot.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    reads_the_array: false,
    takes_duel_ties: false,
  }
}

const CONFIG = {
  factions: [faction('wow', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

// Loaded after the mocks.
const { default: DuelSealConfirm, DefaultDuelSealConfirm } = await import('../DuelSealConfirm')
const { surfaceMap, SURFACE_KEYS } = await import('../../../factions')

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'wow',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  } as DuelSideOut
}

const DUEL = {
  id: 5,
  status: 'active',
  forfeited_by_character_id: null,
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

const PROPS = {
  duel: DUEL,
  viewerCharacterId: 1,
  taskPointValue: 60,
  onConfirm: () => {},
  onCancel: () => {},
} as const

function dispatch(slug: string | null): string {
  return renderToStaticMarkup(<DuelSealConfirm taskFactionSlug={slug} {...PROPS} />)
}

// Not na: na's row IS the Default (#2530).
const SEAL_SLUGS = Object.keys(surfaceMap('duelSeal')).filter((slug) => slug !== 'na')

/** Not albescent: its row is a pass-through to the Default by design (#2531). */
const SKIN_SLUGS = SEAL_SLUGS.filter((slug) => slug !== 'albescent')

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('the duel seal is one responsive component per faction', () => {
  it('no longer advertises a mobileDuelSeal surface', () => {
    expect(SURFACE_KEYS).not.toContain('mobileDuelSeal')
  })

  it('registers a seal for every faction that had one', () => {
    expect(SEAL_SLUGS.sort()).toEqual(
      ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua', 'wow', 'albescent'].sort(),
    )
  })

  it.each(SEAL_SLUGS)('%s reaches its own registered skin on a phone', (slug) => {
    mocks.formFactor = 'mobile'
    const Skin = surfaceMap('duelSeal')[slug]
    expect(dispatch(slug)).toBe(renderToStaticMarkup(<Skin {...PROPS} />))
  })

  it.each(SKIN_SLUGS)('%s keeps its own dress on a phone, not the Default', (slug) => {
    mocks.formFactor = 'mobile'
    expect(dispatch(slug)).not.toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })

  it.each(['desktop', 'mobile'] as const)('renders eight distinct sheets on %s', (formFactor) => {
    mocks.formFactor = formFactor
    const sheets = [renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />), ...SKIN_SLUGS.map(dispatch)]
    expect(new Set(sheets).size).toBe(sheets.length)
  })

  it.each(['desktop', 'mobile'] as const)('albescent is the Default sheet on %s, by design', (formFactor) => {
    mocks.formFactor = formFactor
    expect(dispatch('albescent')).toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })

  it.each(['desktop', 'mobile'] as const)('leaves na on the Default sheet on %s', (formFactor) => {
    mocks.formFactor = formFactor
    expect(dispatch(null)).toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })
})

describe('the shared chassis switches, and nothing else does', () => {
  const EVERY_SLUG = [null, ...SEAL_SLUGS]

  it.each(EVERY_SLUG)('%s is a centred, bounded card on a laptop', (slug) => {
    const html = dispatch(slug)
    expect(html, 'the bounded card').toContain('max-w-[460px]')
    expect(html, 'the centring shell').toContain('items-center justify-center')
  })

  it.each(EVERY_SLUG)('%s is full-bleed on a phone — no card, no scrim', (slug) => {
    mocks.formFactor = 'mobile'
    const html = dispatch(slug)
    expect(html, 'the bounded card').not.toContain('max-w-[460px]')
    expect(html, 'the centring shell').not.toContain('items-center justify-center')
    expect(html, 'the desktop scrim').not.toContain('rgba(0,0,0,0.')
  })

  // Radius/shadow belong in `card`, not `ground`. Only the root is read; inner
  // panels keep their own radii.
  it.each(EVERY_SLUG)('%s wears no card chrome on a phone', (slug) => {
    mocks.formFactor = 'mobile'
    const root = dispatch(slug).slice(0, dispatch(slug).indexOf('>') + 1)
    expect(root, 'radius on the phone shell').not.toContain('border-radius')
    expect(root, 'drop shadow on the phone shell').not.toContain('box-shadow')
  })

  it.each(EVERY_SLUG)('%s keeps the dialog contract on both form factors', (slug) => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const html = dispatch(slug)
      expect(html, formFactor).toContain('role="dialog"')
      expect(html, formFactor).toContain('aria-modal="true"')
    }
  })
})
