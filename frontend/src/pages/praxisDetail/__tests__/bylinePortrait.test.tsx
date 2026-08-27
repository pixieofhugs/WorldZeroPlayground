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
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import { surfaceMap } from '../../../factions'
import DefaultPraxisDetail from '../archetypes/DefaultPraxisDetail'
import { bylineFaces } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisMemberOut } from '../../../api/praxis'
import { aPraxis, aMember, AUTHOR } from '../../../test/fixtures'
import { aPraxisDetailState, markup } from '../../../test/praxisDetail'
import { mediaUrl } from '../../../utils/media'


/** A two-word name so the monogram is a distinctive pair a substring can find. */
const NAME = 'Zev Quist'
const MONOGRAM = 'ZQ'
const PORTRAIT = 'avatars/zev.png'
/** A second member, who since #2318 carries a portrait of their own. */
const CREWMATE = { id: 44, name: 'Ilse Ronan', portrait: 'avatars/ilse.png' }

const render = (element: ReactElement): string => markup(element).html


function state(over: Partial<Parameters<typeof aPraxis>[0]> = {}): PraxisDetailState {
  return aPraxisDetailState({
    praxis: aPraxis({
      created_by_display_name: NAME,
      // The author's own member row carries the same portrait the top-level
      // field does. On the server they are one column of one Character row, so
      // a fixture that lets them disagree is describing a payload that cannot
      // arrive — and since #2318 the byline reads the member row, which would
      // make that impossible fixture the thing under test.
      members: [
        aMember({
          character_display_name: NAME,
          character_avatar_url: over.created_by_avatar_url ?? '',
        }),
      ],
      ...over,
    }),
  })
}

/** The author's own member row, carrying the same portrait the byline reads. */
const AUTHOR_FACE = aMember({
  character_display_name: NAME,
  character_avatar_url: PORTRAIT,
})

/** The second member. The portrait is the axis: '' is the monogram fallback. */
const crewmate = (portrait: string): PraxisMemberOut =>
  aMember({
    id: 102,
    character_id: CREWMATE.id,
    character_display_name: CREWMATE.name,
    character_avatar_url: portrait,
    joined_at: '2026-01-02T00:00:00Z',
  })

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

// ─── Every member wears their own face (#2318) ───────────────────────────────
//
// This block used to pin the opposite: `PraxisMemberOut` carried no avatar
// column, so only the CREATOR could get a face and a collab byline was one
// portrait among monograms. The comment here said that the day the members'
// avatars reached the wire it should fail and say where to look. They have, so
// it did, and this is what it became.
describe('collab byline: every member wears their own face (#2318)', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws both portraits on a two-member collab`, () => {
      const html = render(
        <Archetype
          state={state({
            type: 'collab',
            created_by_avatar_url: PORTRAIT,
            members: [AUTHOR_FACE, crewmate(CREWMATE.portrait)],

          })}
        />,
      )
      // Counted as "at least once", not "exactly once": several archetypes mount
      // `CollabRoster` below the byline, and since #2318 that panel draws the
      // same faces. Two appearances of one person is the fix working twice, not
      // a duplicate.
      expect(
        occurrences(html, `src="${mediaUrl(PORTRAIT)}"`),
        "the author's face",
      ).toBeGreaterThan(0)
      expect(
        occurrences(html, `src="${mediaUrl(CREWMATE.portrait)}"`),
        "the crewmate's face",
      ).toBeGreaterThan(0)
      expect(html, 'no monogram is left standing').not.toContain('>IR<')
    })
  }

  // The fallback did not go anywhere: `avatar_url` is `nullable=False,
  // server_default=""`, so a portrait-less crewmate is the ordinary case.
  it('a crewmate with no portrait still gets their monogram', () => {
    const html = render(
      <DefaultPraxisDetail
        state={state({
          type: 'collab',
          created_by_avatar_url: PORTRAIT,
          members: [AUTHOR_FACE, crewmate('')],

        })}
      />,
    )
    expect(
      occurrences(html, `src="${mediaUrl(PORTRAIT)}"`),
      "the author's face",
    ).toBeGreaterThan(0)
    expect(html, 'the crewmate keeps a monogram').toContain('IR')
  })
})

// ─── The shared rule, unit-tested once ───────────────────────────────────────
describe('bylineFaces', () => {
  it('gives every member their own portrait (#2318)', () => {
    const faces = bylineFaces(
      aPraxis({
        created_by_display_name: NAME,
        created_by_avatar_url: PORTRAIT,
        members: [AUTHOR_FACE, crewmate(CREWMATE.portrait)],

      }),
    )
    expect(faces).toEqual([
      { id: AUTHOR.id, name: NAME, avatarUrl: PORTRAIT },
      { id: CREWMATE.id, name: CREWMATE.name, avatarUrl: CREWMATE.portrait },
    ])
  })

  // A member row from a cache written before this field existed has no such
  // key. `undefined` must never reach `img src`, so it degrades to the monogram
  // and heals on the next fetch — the same guard the author's path already had.
  it('degrades a pre-#2318 cached member row to the monogram', () => {
    const stale = aMember({ character_display_name: NAME })
    delete (stale as Partial<typeof stale>).character_avatar_url
    const faces = bylineFaces(
      aPraxis({ created_by_avatar_url: PORTRAIT, members: [stale] }),
    )
    expect(faces).toEqual([{ id: AUTHOR.id, name: NAME, avatarUrl: '' }])
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
