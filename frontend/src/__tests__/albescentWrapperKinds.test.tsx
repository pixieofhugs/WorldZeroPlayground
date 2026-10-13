/**
 * ALBESCENT'S WRAPPERS, EACH HELD TO THE KIND IT CLAIMS — the four #2531 added,
 * and the directory tile #2632 turned into a fifth.
 *
 * ## The seam
 *
 * `surfaceDispatch.test.ts` now proves Albescent registers every key in
 * `SURFACE_KEYS`. That is a question about the MAP, and it is answered by a row
 * existing. This file asks the other question — what the row DOES — and its seam
 * is the RENDERED MARKUP of a wrapper set against the Default it wraps.
 *
 * Owner ruling on #2531, and the whole reason both questions are asked:
 *
 *   • A RE-CUTTING wrapper changes pixels, deliberately. na already draws a
 *     mark; the wrapper re-cuts it. Something moves that did not move before.
 *     "A re-cut that shifts none did not do its job."
 *   • A PASS-THROUGH wrapper must change NOTHING. Where na draws no mark to
 *     re-cut, the registration exists so the manifest stops answering "does
 *     Albescent dress this?" by silence — and its acceptance test is that
 *     `renderToStaticMarkup` is BYTE-IDENTICAL to the Default. "A pass-through
 *     that shifts a pixel is a bug."
 *
 * Byte-identity is a strong claim on purpose. It fails on a stray wrapper
 * element, a re-ordered prop, a class added "while we are here" — every quiet way
 * a wrapper that was supposed to be inert starts dressing something. TWO of the
 * five are held to it unconditionally, and the comment leaf is held to it for an
 * UNREVEALED viewer only: ADR-0088 §3 turned that one from a pass-through into a
 * re-cut, and #1192 decision 13 and #2531 are reversed with it (#2732).
 *
 * ## Why the re-cuts are asserted from both ends
 *
 * `strip the dress and na is byte-identical` is the invariant on ALL FIVE — it
 * is what keeps Albescent's dress off unaffiliated players. For the two
 * pass-throughs there is nothing to strip and identity is the whole test. For a
 * re-cut, identity must hold with the dress removed and must FAIL with it in
 * place, so both halves are asserted: the delta is the wrapper's own and nothing
 * else, and it reaches mounts na draws.
 *
 * The tile and the leaf each add a question the others do not raise, and it is
 * the same question: the dress is CONDITIONAL. `.alb-prism` arrives with the
 * reveal (epic #2496 ruling 8) and so does the leaf's ring (ADR-0088 §3), so
 * "does it dress?" has two right answers on those surfaces and both are pinned.
 *
 * The leaf is also the one wrapper whose delta is NOT a class on a wrapper div:
 * na's cap is inline and computed from the slug, so the re-cut had to go through
 * a slot on the shared `Sheet`. Its identity half is therefore asserted against
 * `DefaultComment` unredacted rather than by stripping an element.
 *
 * ## Harness
 *
 * `renderToStaticMarkup`, no DOM (SPEC-testing.md) — so nothing here proves a
 * pixel travelled. The rest state and the travel are CSS, guarded as CSS by
 * `albescentSpectraMove.test.tsx`; that the two ends meet is what this file
 * checks. The pixels are visual QA and stated outstanding on the PR.
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

// The harness has no DOM, so a render always takes `useSyncExternalStore`'s
// server snapshot ('desktop'). The phone branch — where the one re-cut mark on
// character creation lives — is reachable only through this mock. Spread from
// the original rather than replaced wholesale: a bare factory blanks the
// module's sibling exports for every module in this file's graph.
vi.mock('../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

// The seal's stakes tiles read the era's duel modifiers. Both sides of every
// comparison below read the same fixture, so this only has to be present, not
// realistic — an unmocked resource would try to fetch.
const CONFIG = {
  factions: [
    { slug: 'wow', duel_win_modifier: 1.5, duel_loss_modifier: 0.5 },
    { slug: 'snide', duel_win_modifier: 2.0, duel_loss_modifier: 0.0 },
  ],
} as unknown as GameConfigOut

vi.mock('../hooks/useGameConfig', () => ({ useGameConfig: () => CONFIG }))

// Imported after the mocks are registered, the way every dispatcher test in the
// repo does it.
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

/**
 * Render a component at a chosen width and put it back. `useId` is deterministic
 * per tree, so two renders of the same shape produce the same ids and byte
 * comparison stays meaningful.
 */
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

  /**
   * The registration must not turn an Albescent profile's ground into a
   * "pattern". `useGroundIsBusy` reads a slug LIST, not the map, so this cannot
   * regress by accident — but it is the one behavioural thing a backdrop row
   * could have changed, so it is asserted rather than reasoned about.
   */
  it('leaves the ground a wash, so the ornament alternation is unmoved (#2195)', async () => {
    const { backdropIsOrnamented } = await import('../components/backdrop/ornamentedGrounds')
    expect(backdropIsOrnamented('albescent')).toBe(false)
  })
})

/**
 * THE COMMENT LEAF — RE-CUT, AND REVEAL-GATED (#2732, ADR-0088 §3).
 *
 * This block used to assert the opposite. It held `AlbescentComment` to
 * byte-identity with `DefaultComment` in both modes, on epic #1192 decision 13
 * and #2531 — both of which ADR-0088 reverses FOR THIS SURFACE. The finding
 * those rulings rested on is still true (the cap is `factionFill(slug,'bar')`
 * inline, so no wrapper class reaches it); what changed is the conclusion drawn
 * from it. na's `Sheet` grew an `edge` slot, the wrapper fills it, and the cap
 * steps aside when it does.
 *
 * ## The seam
 *
 * THREE RENDERS OF THE SAME `Sheet`, which is the whole of this issue:
 *
 *   • REVEALED Albescent — no cap, one `.alb-comment-edge` span.
 *   • UNREVEALED Albescent — today's sheet exactly, cap and all.
 *   • na — byte-identical to today, whatever the reveal says.
 *
 * The third is the one that would go unnoticed: the `edge` slot defaults to
 * undefined, so a slug that never asks for it renders the same bytes it always
 * did. It is asserted against `DefaultComment` given the SAME fixture, so a
 * change to na's own sheet moves both sides together.
 *
 * Nothing here proves a pixel travelled — `renderToStaticMarkup`, no DOM. The
 * ring's rest state, its carrier weight and its drift are CSS, guarded as CSS by
 * `spectrumRingCollapse.test.ts`, where the other nine mounts already live.
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

  /** The na leaf, for the identity half — an unaffiliated author, same shape. */
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
      // The CAP, named exactly — `--faction-default-rainbow-conic` is the
      // avatar disc two elements up and belongs to a different issue.
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

  /**
   * THE INVARIANT THE SLOT MUST KEEP. `Sheet` is shared with na and with every
   * unregistered slug; the prop that suppresses the cap defaults to today's
   * behaviour, so nobody who does not ask can be moved by it — in EITHER reveal
   * state, because the reveal is a fact about the viewer and na is not Albescent.
   */
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

  /**
   * NOT TOUCHED, and this is the assertion that says so out loud. #2531's second
   * reason still holds: resolved @mentions are `background-clip: text`, which the
   * epic's pre-painted-`::before` technique cannot dress at all, and they are a
   * player's own words. The ring is chrome; the ink is not.
   */
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

  /** Undo the wrapper: drop the one classed div the archetype adds. */
  const stripWrapper = (html: string) =>
    html.replace(/^<div class="alb-moves">/, '').replace(/<\/div>$/, '')

  /**
   * Scoped to the ring's own tag rather than to the whole page, and the reason
   * is a second conic on this screen that must NOT be classed: the calling
   * picker paints each faction's sigil by masking `--faction-default-rainbow-
   * conic`. A sigil is a MARK, "never part of the wrapper" (ADR-0083 §1), so it
   * keeps its inline paint and stays still. The ring is chrome; it does not.
   */
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
    // `.alb-moves .spectrum-dial` — two classes, so it wins with no
    // `!important` and no structural selector. Both ends have to be present for
    // that selector to match anything.
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-dial')
  })

  it('changes something — a re-cut that shifts nothing did not do its job', () => {
    expect(page(AlbescentCreateCharacter, 'mobile')).not.toBe(
      page(DefaultCreateCharacter, 'mobile'),
    )
  })

  /**
   * THE INVARIANT ON ALL FOUR. Strip the class and na is byte-identical — no
   * forked anatomy, no moved slot, no repaint, at either width. This is what
   * keeps a dress meant for a secret society off an unaffiliated player, and it
   * is what makes every future change to `DefaultCreateCharacter` reach
   * Albescent with no edit to the wrapper.
   */
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

/* ── The second re-cut, and the one that used to be a whole skin ─────────── */

/**
 * THE DIRECTORY TILE — RE-CUT: the vellum is gone and the ground blooms (#2632).
 *
 * This one arrived by DELETION rather than by registration. The tile was 140
 * lines of bespoke markup painted from a private vellum register, and the owner
 * ruled that register purged; what is left is the shape every other Albescent
 * row already has. So it owes the same two assertions as `createCharacter` —
 * strip the wrapper and no anatomy is forked, and keep it and something moves —
 * plus one that is this surface's own: the ground is CONDITIONAL, because
 * `[REDACTED]` is painted in its own ground's colour and a bloom makes that 1:1
 * pairing only approximately true (epic #2496 ruling 8).
 *
 * The identity half is asserted against `DefaultSelectCard` given the SAME slug,
 * which is the honest comparison: the tile is the na tile saying Albescent's
 * words and wearing Albescent's mark, and both of those come out of the na
 * component's own seams rather than out of the wrapper.
 */
describe('selectCard — RE-CUT: the tile is na, dressed', () => {
  const tile = (Card: typeof DefaultSelectCard, props = {}) =>
    renderToStaticMarkup(<Card state="locked" members={3} {...props} />)

  /** Undo the wrapper: drop the one classed div the archetype adds. */
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
    // `.alb-prism` repaints `--faction-default-card-sheet`; `.alb-moves
    // .spectrum-rule:empty` walks the hairline. Both ends have to be present for
    // either selector to match anything.
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

  /**
   * The other end of the collapse: `DefaultSelectCard` grew a `slug` prop and
   * two dressable mounts, and an unaffiliated player must not be able to tell.
   * The na tile still says na's words, wears na's ring and redacts nothing.
   */
  it('leaves the unaffiliated tile alone', () => {
    const html = tile(DefaultSelectCard)
    expect(html).toContain('Unaffiliated')
    expect(html).not.toContain('redacted')
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('labyrinth')
  })
})
