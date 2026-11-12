/**
 * #2106: the praxis-detail byline shows the author's portrait, falling back to
 * each archetype's own monogram frame. `bylineFaces()` is the shared rule;
 * walked across the registry so every skin mounts the portrait branch.
 * (`FactionAvatar` is deliberately not used; kits keep their bespoke frames.)
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


/** Two words so the monogram is a distinctive pair. */
const NAME = 'Zev Quist'
const MONOGRAM = 'ZQ'
const PORTRAIT = 'avatars/zev.png'
const CREWMATE = { id: 44, name: 'Ilse Ronan', portrait: 'avatars/ilse.png' }

const render = (element: ReactElement): string => markup(element).html


function state(over: Partial<Parameters<typeof aPraxis>[0]> = {}): PraxisDetailState {
  return aPraxisDetailState({
    praxis: aPraxis({
      created_by_display_name: NAME,
      // Member row and top-level field are one server column; keep them equal.
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

const AUTHOR_FACE = aMember({
  character_display_name: NAME,
  character_avatar_url: PORTRAIT,
})

/** '' is the monogram fallback. */
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
      // At least once: `CollabRoster` may draw the same faces again.
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

  // `avatar_url` defaults to "", so this is the ordinary case.
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

  // A stale cached row lacks the key; `undefined` must never reach `img src`.
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
