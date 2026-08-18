/**
 * #2106 — the praxis-detail byline shows the author's FACE, not just a letter.
 *
 * The reported symptom: the top of a praxis drew the author as `H` while the
 * comment box at the bottom of the same page drew their portrait. Every
 * archetype called its local `initials`/`initialsOf` unconditionally; the `img`
 * branch each one's *"Initials fallback for a member with no uploaded avatar"*
 * comment promised was never written, and `created_by_avatar_url` only reached
 * the CARD wire until #2172 put it on `PraxisOut` too.
 *
 * ## The seam
 *
 * `bylineFaces()` — the shared list of who the byline draws — plus each
 * archetype's own monogram frame. Walked across `surfaceMap('praxisDetail')`
 * rather than asserted once, for the reason `archetypeSlots.test.tsx` gives:
 * the rule has to reach all nine dressed pages, and the portrait branch is
 * exactly what a bespoke skin can quietly fail to mount. The FALLBACK is
 * asserted in the same loop because it is the half a screenshot cannot show.
 *
 * `FactionAvatar` is deliberately NOT mounted: it would bring one generic disc
 * (plus its sigil corner badge) in place of eight bespoke kit monograms —
 * S.N.I.D.E.'s tilted xerox square, the Ephemerists' brass octagon, Everymen's
 * framed plate, Singularity's terminal cell. What travels is the RULE, drawn
 * inside each archetype's existing frame.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the catalog so shared-chrome copy keys resolve to English.
import '../../../i18n'
import { surfaceMap } from '../../../factions'
import DefaultPraxisDetail from '../archetypes/DefaultPraxisDetail'
import { bylineFaces } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import { aPraxis, aMember, AUTHOR } from '../../../test/fixtures'
import { mediaUrl } from '../../../utils/media'

/** A two-word name so the monogram is a distinctive pair a substring can find. */
const NAME = 'Zev Quist'
const MONOGRAM = 'ZQ'
const PORTRAIT = 'avatars/zev.png'
/** A second member, who has no avatar field on the wire at all (see below). */
const CREWMATE = { id: 44, name: 'Ilse Ronan' }

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

function state(over: Partial<Parameters<typeof aPraxis>[0]> = {}): PraxisDetailState {
  return {
    loading: false,
    praxis: aPraxis({
      created_by_display_name: NAME,
      members: [aMember({ character_display_name: NAME })],
      ...over,
    }),
    fetchError: null,
    comments: null,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: '',
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: '',
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
  }
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

// Default is a registered renderable too — walk it alongside the map.
const archetypes = { ...surfaceMap('praxisDetail'), __default__: DefaultPraxisDetail }

describe('praxis-detail byline portrait (#2106)', () => {
  const src = mediaUrl(PORTRAIT)

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws the author's portrait when they have one`, () => {
      const html = render(<Archetype state={state({ created_by_avatar_url: PORTRAIT })} />)
      expect(html, 'the portrait is mounted').toContain(`src="${src}"`)
      expect(html, 'alt is the display name').toContain(`alt="${NAME}"`)
      expect(html, 'and the monogram gives way to it').not.toContain(MONOGRAM)
    })

    it(`${slug} keeps its own monogram when they have none`, () => {
      const html = render(<Archetype state={state({ created_by_avatar_url: '' })} />)
      expect(html, "the archetype's bespoke initials still draw").toContain(MONOGRAM)
      expect(html, 'and no empty portrait is mounted').not.toContain('src=""')
    })
  }
})

// ─── The collab limitation, asserted rather than assumed ─────────────────────
//
// `PraxisMemberOut` carries no avatar field, so only the CREATOR can get a
// face. On a collab byline that is one portrait among monograms. That is the
// narrow read of #2106 and it is flagged on the issue; this test pins the
// behaviour so the day the members' avatars reach the wire, it fails here and
// says where to look.
describe('collab byline: only the creator has a face today', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws exactly one portrait on a two-member collab`, () => {
      const html = render(
        <Archetype
          state={state({
            type: 'collab',
            created_by_avatar_url: PORTRAIT,
            members: [
              aMember({ character_display_name: NAME }),
              aMember({
                id: 102,
                character_id: CREWMATE.id,
                character_display_name: CREWMATE.name,
                joined_at: '2026-01-02T00:00:00Z',
              }),
            ],
          })}
        />,
      )
      expect(occurrences(html, `src="${mediaUrl(PORTRAIT)}"`), 'one face').toBe(1)
      expect(html, "the crewmate keeps a monogram").toContain('IR')
    })
  }
})

// ─── The shared rule, unit-tested once ───────────────────────────────────────
describe('bylineFaces', () => {
  it('gives the portrait to the creator and to nobody else', () => {
    const faces = bylineFaces(
      aPraxis({
        created_by_display_name: NAME,
        created_by_avatar_url: PORTRAIT,
        members: [
          aMember({ character_display_name: NAME }),
          aMember({
            id: 102,
            character_id: CREWMATE.id,
            character_display_name: CREWMATE.name,
            joined_at: '2026-01-02T00:00:00Z',
          }),
        ],
      }),
    )
    expect(faces).toEqual([
      { id: AUTHOR.id, name: NAME, avatarUrl: PORTRAIT },
      { id: CREWMATE.id, name: CREWMATE.name, avatarUrl: '' },
    ])
  })

  it('credits the creator when the payload carries no member rows', () => {
    const faces = bylineFaces(
      aPraxis({
        created_by_display_name: NAME,
        created_by_avatar_url: PORTRAIT,
        members: [],
      }),
    )
    expect(faces).toEqual([{ id: AUTHOR.id, name: NAME, avatarUrl: PORTRAIT }])
  })

  it('falls back to `#id` for a member with no display name', () => {
    const faces = bylineFaces(
      aPraxis({
        created_by_avatar_url: '',
        members: [aMember({ character_display_name: '' })],
      }),
    )
    expect(faces).toEqual([{ id: AUTHOR.id, name: `#${AUTHOR.id}`, avatarUrl: '' }])
  })
})
