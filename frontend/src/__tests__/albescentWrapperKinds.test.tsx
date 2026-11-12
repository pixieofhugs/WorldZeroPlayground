/**
 * What each Albescent wrapper DOES, by rendered markup vs. its Default
 * (`surfaceDispatch.test.ts` only checks the row exists). Owner ruling #2531:
 *   • RE-CUT: changes pixels; strip the dress and na is byte-identical, keep
 *     it and something differs.
 *   • PASS-THROUGH: byte-identical to the Default.
 * Tile and comment leaf dress conditionally on the reveal (ADR-0088 §3).
 * CSS travel is guarded in `albescentSpectraMove.test.tsx`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'

import '../i18n'
import type { CommentOut } from '../api/comments'
import type { CharacterOut } from '../api/auth'
import type { DuelDetailOut, DuelSideOut } from '../api/duel'
import type { GameConfigOut } from '../api/gameConfig'
import type { CreateCharacterState } from '../pages/characterPaths/useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

// No DOM means the server snapshot ('desktop'); the mock reaches the phone
// branch. Spread the original: a bare factory blanks sibling exports.
vi.mock('../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

// Present, not realistic: both sides read it; unmocked it would fetch.
const CONFIG = {
  factions: [
    { slug: 'wow', duel_win_modifier: 1.5, duel_loss_modifier: 0.5 },
    { slug: 'snide', duel_win_modifier: 2.0, duel_loss_modifier: 0.0 },
  ],
} as unknown as GameConfigOut

vi.mock('../hooks/useGameConfig', () => ({ useGameConfig: () => CONFIG }))

// Imported after the mocks are registered.
const WatercolorBackground = (await import('../components/layout/WatercolorBackground')).default
const AlbescentBackdrop = (await import('../components/backdrop/AlbescentBackdrop')).default
const { DefaultComment } = await import('../components/comments/CommentThread')
const AlbescentComment = (await import('../components/comments/voices/AlbescentComment')).default
const { DefaultDuelSealConfirm } = await import('../components/duel/DuelSealConfirm')
const AlbescentDuelSealConfirm = (
  await import('../components/duel/AlbescentDuelSealConfirm')
).default
const DefaultCreateCharacter = (
  await import('../pages/characterPaths/archetypes/DefaultCreateCharacter')
).default
const AlbescentCreateCharacter = (
  await import('../pages/characterPaths/archetypes/AlbescentCreateCharacter')
).default
const DefaultSelectCard = (await import('../components/selectCard/DefaultSelectCard')).default
const AlbescentSelectCard = (await import('../components/selectCard/AlbescentSelectCard')).default
const { setAlbescentRevealed } = await import('../utils/factions')

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'thank you @bo — seedlings along the estuary',
  is_edited: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'albescent',
  },
  mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Adabel',
  avatar_url: '',
  faction_slug: 'albescent',
  bio: '',
  tagline: '',
  location: '',
  level: 8,
  score: 0,
  all_time_score: 0,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const side = (overrides: Partial<DuelSideOut>): DuelSideOut =>
  ({
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'wow',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  }) as DuelSideOut

const DUEL = {
  id: 5,
  status: 'active',
  forfeited_by_character_id: null,
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

const SETTLED_DUEL = {
  ...DUEL,
  status: 'settled',
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow', is_submitted: true }),
  opponent: side({
    character_id: 2,
    praxis_id: 11,
    display_name: 'Rax',
    faction_slug: 'snide',
    is_submitted: true,
  }),
} as unknown as DuelDetailOut

const characterState = (): CreateCharacterState => ({
  displayName: 'Molly',
  setDisplayName: () => {},
  bio: '',
  setBio: () => {},
  tagline: '',
  setTagline: () => {},
  factionSlug: 'albescent',
  setFactionSlug: () => {},
  invited: ['albescent'],
  avatarFile: null,
  avatarPreview: null,
  avatarSource: null,
  setAvatarSource: () => {},
  avatarError: '',
  setAvatarError: () => {},
  handleAvatarChange: () => {},
  handleAvatarConfirm: () => {},
  error: null,
  submitting: false,
  canSubmit: true,
  handleSubmit: () => {},
  handle: 'molly',
  showPicker: true,
})

/** `useId` is deterministic per tree, so byte comparison stays meaningful. */
function at(width: 'mobile' | 'desktop', markup: () => string): string {
  factor.value = width
  try {
    return markup()
  } finally {
    factor.value = 'desktop'
  }
}

/* ── The two pass-throughs, and the one that stopped being a third ─────── */

describe('backdrop — PASS-THROUGH: the watercolour, unchanged', () => {
  it('renders the na fallback byte for byte', () => {
    expect(renderToStaticMarkup(<AlbescentBackdrop />)).toBe(
      renderToStaticMarkup(<WatercolorBackground />),
    )
  })

  it('leaves the ground a wash, so the ornament alternation is unmoved (#2195)', async () => {
    const { backdropIsOrnamented } = await import('../components/backdrop/ornamentedGrounds')
    expect(backdropIsOrnamented('albescent')).toBe(false)
  })
})

/**
 * Comment leaf: re-cut, reveal-gated (#2732, ADR-0088 §3). na's cap is inline
 * per-slug, so the ring goes through `Sheet`'s `edge` slot.
 *   • revealed Albescent: no cap, one `.alb-comment-edge`.
 *   • unrevealed Albescent: identical to DefaultComment.
 *   • na: unchanged in either reveal state.
 * Ring CSS: `spectrumRingCollapse.test.ts`.
 */
describe('comment — RE-CUT: the leaf trades na\'s cap for the travelling ring', () => {
  const row = (Voice: typeof DefaultComment) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <Voice mode="row" comment={COMMENT} />
      </MemoryRouter>,
    )

  const composer = (Voice: typeof DefaultComment) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <Voice
          mode="composer"
          character={CHARACTER}
          value="a draft"
          onChange={() => {}}
          onSubmit={() => {}}
          submitting={false}
        />
      </MemoryRouter>,
    )

  const naRow = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <DefaultComment
          mode="row"
          comment={{ ...COMMENT, author: { ...COMMENT.author, faction_slug: 'na' } }}
        />
      </MemoryRouter>,
    )

  afterEach(() => setAlbescentRevealed(false))

  for (const [name, render] of [
    ['row', row],
    ['composer', composer],
  ] as const) {
    it(`${name} mode: a revealed viewer gets the ring and loses the cap`, () => {
      setAlbescentRevealed(true)
      const html = render(AlbescentComment)
      expect(html, 'the tenth mount of the shared ring').toContain('alb-comment-edge')
      // Exact match: `-rainbow-conic` is the avatar disc, not the cap.
      expect(html, "na's 3px cap is the carrier that comes off").not.toContain(
        'background:var(--faction-default-rainbow)',
      )
      expect(html, 'a re-cut that shifts nothing did not do its job').not.toBe(
        render(DefaultComment),
      )
    })

    it(`${name} mode: an unrevealed viewer sees today's sheet exactly`, () => {
      setAlbescentRevealed(false)
      expect(render(AlbescentComment)).toBe(render(DefaultComment))
    })
  }

  for (const revealed of [false, true]) {
    it(`na's own leaf is untouched with the reveal ${revealed ? 'on' : 'off'}`, () => {
      setAlbescentRevealed(revealed)
      const html = naRow()
      expect(html, 'na keeps its spectrum cap').toContain(
        'background:var(--faction-default-rainbow)',
      )
      expect(html, 'and never wears Albescent chrome').not.toContain('alb-comment-edge')
    })
  }

  /** Mentions are `background-clip: text` and a player's words: chrome only (#2531). */
  it('leaves the @mention ink alone, revealed or not', () => {
    setAlbescentRevealed(true)
    expect(row(AlbescentComment), "the mention ink stays na's clipped spectrum").toContain(
      'rainbow-ink',
    )
  })
})

describe('duelSeal — PASS-THROUGH: na draws no spectrum on this dialog', () => {
  const seal = (
    Skin: typeof DefaultDuelSealConfirm,
    mode: 'submit' | 'forfeit',
    duel: DuelDetailOut,
    width: 'mobile' | 'desktop',
  ) =>
    at(width, () =>
      renderToStaticMarkup(
        <Skin
          duel={duel}
          viewerCharacterId={1}
          taskPointValue={60}
          onConfirm={() => {}}
          onCancel={() => {}}
          mode={mode}
        />,
      ),
    )

  const cases = [
    ['submit', DUEL],
    ['forfeit', SETTLED_DUEL],
  ] as const

  for (const [mode, duel] of cases) {
    for (const width of ['desktop', 'mobile'] as const) {
      it(`${mode} mode on ${width} is byte-identical to the Default`, () => {
        expect(seal(AlbescentDuelSealConfirm, mode, duel, width)).toBe(
          seal(DefaultDuelSealConfirm, mode, duel, width),
        )
      })
    }
  }

  it('the na seal carries no spectrum at all, which is why', () => {
    const html = seal(DefaultDuelSealConfirm, 'submit', DUEL, 'desktop')
    expect(html).not.toContain('spectrum-rule')
    expect(html).not.toContain('spectrum-dial')
    expect(html).not.toContain('--faction-default-rainbow')
  })
})

/* ── The one re-cut ─────────────────────────────────────────────────────── */

describe('createCharacter — RE-CUT: the credential card’s portrait ring turns', () => {
  const page = (Archetype: typeof DefaultCreateCharacter, width: 'mobile' | 'desktop') =>
    at(width, () =>
      renderToStaticMarkup(
        <MemoryRouter>
          <Archetype state={characterState()} />
        </MemoryRouter>,
      ),
    )

  const stripWrapper = (html: string) =>
    html.replace(/^<div class="alb-moves">/, '').replace(/<\/div>$/, '')

  /** Scoped to the ring: the picker's sigils are marks and keep inline paint (ADR-0083 §1). */
  it("na's ring wears the class the dresser reaches, not an inline ramp (#2497)", () => {
    const html = page(DefaultCreateCharacter, 'mobile').replace(/\s*([:;,])\s*/g, '$1')
    const ring = /<button[^>]*class="spectrum-dial"[^>]*>/.exec(html)?.[0]
    expect(ring, "the credential card's portrait ring is the mount this re-cut reaches").toBeTruthy()
    expect(
      ring,
      'an inline background is the one paint a stylesheet cannot reach',
    ).not.toContain('background')
  })

  it('the dresser and the mount land in one tree, so the ring can turn', () => {
    const html = page(AlbescentCreateCharacter, 'mobile')
    // Both ends of `.alb-moves .spectrum-dial`.
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-dial')
  })

  it('changes something — a re-cut that shifts nothing did not do its job', () => {
    expect(page(AlbescentCreateCharacter, 'mobile')).not.toBe(
      page(DefaultCreateCharacter, 'mobile'),
    )
  })

  for (const width of ['mobile', 'desktop'] as const) {
    it(`strip the class and na is byte-identical on ${width}`, () => {
      expect(stripWrapper(page(AlbescentCreateCharacter, width))).toBe(
        page(DefaultCreateCharacter, width),
      )
    })
  }

  it('adds no colour and no copy of its own', () => {
    const html = page(AlbescentCreateCharacter, 'mobile')
    expect(html, 'ADR-0027/0048: a hue of its own puts it back in the spectrum').not.toContain(
      '--faction-albescent-',
    )
    expect(html, 'no reveal register on a page a stranger reaches').not.toContain(
      '--albescent-reveal-',
    )
  })
})

/* ── The second re-cut ──────────────────────────────────────────────────── */

/**
 * Directory tile, re-cut (#2632). The ground is withheld while redacted:
 * `[REDACTED]` is painted in its ground's colour and a bloom breaks that.
 * Identity is against `DefaultSelectCard` with the SAME slug (words and mark
 * come from na's own seams).
 */
describe('selectCard — RE-CUT: the tile is na, dressed', () => {
  const tile = (Card: typeof DefaultSelectCard, props = {}) =>
    renderToStaticMarkup(<Card state="locked" members={3} {...props} />)

  const stripWrapper = (html: string) =>
    html.replace(/^<div class="[^"]*" style="[^"]*">/, '').replace(/<\/div>$/, '')

  afterEach(() => setAlbescentRevealed(false))

  it('forks no anatomy — strip the wrapper and it is the na tile', () => {
    setAlbescentRevealed(true)
    expect(stripWrapper(tile(AlbescentSelectCard))).toBe(
      tile(DefaultSelectCard, { slug: 'albescent' }),
    )
  })

  it('changes something — a re-cut that shifts nothing did not do its job', () => {
    setAlbescentRevealed(true)
    expect(tile(AlbescentSelectCard)).not.toBe(tile(DefaultSelectCard, { slug: 'albescent' }))
  })

  it('the dresser and the mounts land in one tree, so both deltas can bite', () => {
    setAlbescentRevealed(true)
    const html = tile(AlbescentSelectCard)
    // Both ends of each selector must be present.
    expect(html).toContain('alb-prism')
    expect(html).toContain('--faction-default-card-sheet')
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-rule')
  })

  it('withholds the ground while redacted, and never the motion', () => {
    setAlbescentRevealed(false)
    const html = tile(AlbescentSelectCard)
    expect(html, 'a redacted tile keeps a FLAT ground').not.toContain('alb-prism')
    expect(html, 'motion reveals nothing a redaction hides').toContain('alb-moves')
  })

  it('adds no colour and no register of its own', () => {
    setAlbescentRevealed(true)
    const html = tile(AlbescentSelectCard)
    expect(html).not.toContain('--faction-albescent-')
    expect(html).not.toContain('--albescent-reveal-')
  })

  it('leaves the unaffiliated tile alone', () => {
    const html = tile(DefaultSelectCard)
    expect(html).toContain('Unaffiliated')
    expect(html).not.toContain('redacted')
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('labyrinth')
  })
})
