/**
 * THE SEAL'S MASTHEAD IS THE SHARED BAND (#2648).
 *
 * This is the seam the issue is a worked example of: a shared piece may travel
 * across surfaces only if it RESOLVES ITS OWN LOOK. `factionBands` does — each
 * band paints itself from tokens — so a third family can mount it without
 * authoring nine paints. The tests below hold the three things that would make
 * that false in practice:
 *
 *   1. the band names the ISSUING faction, never the host praxis's. That is the
 *      seal's whole contract (`SealSkinProps`) and the one thing a mistake here
 *      would break, so it is checked through a real praxis-card body whose
 *      faction differs from the metatask's.
 *   2. the band is a LINK and it is not nested inside another one. A seal lives
 *      inside a card that already links, which is exactly where a nested anchor
 *      appears (`taskCard/__tests__/mastheadFactionLink.test.tsx` and
 *      `praxisCard/__tests__/praxisMasthead.test.tsx` hold the same line on the
 *      two card kits).
 *   3. no skin draws a faction label of its own any more. Nine hand-drawn
 *      eyebrows is the state this issue deleted; a tenth would be the drift.
 *   4. every skin still says WHAT THE OBJECT IS. The deleted eyebrow was
 *      `"{{faction}} Metatask"`, so deleting it took the noun with the name —
 *      and the band can only give the name back. See the caption block below.
 *
 * SSR-only harness (`renderToStaticMarkup`), and the `MemoryRouter` is not
 * decoration: the band is a `<Link>`, so mounting it drags a router requirement
 * into every host that renders a seal.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'

import MetataskSeal from '../MetataskSeal'
import { PraxisBody } from '../../praxisCard/desktop/shared'
import praxisCopy from '../../../locales/en/praxis.json'
import { factionName } from '../../../utils/factions'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'

/** Every faction that can issue a metatask — all nine mount a band (#2648). */
const SLUGS = [
  'albescent',
  'coven',
  'ephemerists',
  'everymen',
  'na',
  'singularity',
  'snide',
  'ua',
  'wow',
] as const

function metatask(slug: string): TaskOut {
  return {
    id: 42,
    title: 'Sealmark',
    description: '',
    point_value: 45,
    level_required: 1,
    status: 'active',
    task_type: 'metatask',
    created_by: 1,
    primary_faction_slug: 'na',
    metatask_faction_slug: slug,
    created_at: '2026-01-01T00:00:00Z',
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
  }
}

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const seal = (slug: string) => render(<MetataskSeal metatasks={[metatask(slug)]} />)

const text = (html: string) => html.replace(/<[^>]*>/g, '')

const SKINS = 'src/components/metataskSeal/skins'

describe('every seal mounts the shared masthead band (#2648)', () => {
  for (const slug of SLUGS) {
    it(`${slug} renders one band, dispatched on the issuing faction`, () => {
      const html = seal(slug)
      const marks = html.match(/data-card-masthead="([a-z]+)"/g) ?? []
      expect(marks, `${slug}'s seal draws exactly one masthead`).toHaveLength(1)
      expect(marks[0]).toBe(`data-card-masthead="${slug}"`)
    })

    it(`${slug}'s band spells the faction's name and links to its page`, () => {
      const html = seal(slug)
      expect(text(html)).toContain(factionName(slug))
      expect(html).toContain(`href="/factions/${slug}"`)
    })

    it(`${slug}'s band is the seal's only anchor, never a nested one`, () => {
      const html = seal(slug)
      const anchors = html.match(/<a\b|<\/a>/g) ?? []
      // A flat sequence of open/close pairs: any `<a` arriving while one is
      // already open is a nested anchor, which is invalid HTML and the failure
      // `CardMasthead`'s docblock singles out.
      let depth = 0
      for (const tag of anchors) {
        if (tag === '</a>') depth -= 1
        else {
          depth += 1
          expect(depth, `${slug}'s seal nests an anchor inside another`).toBe(1)
        }
      }
      expect(depth, `${slug}'s seal leaves an anchor unclosed`).toBe(0)
    })
  }
})

describe('the band names the ISSUING faction, not the host card (#2648)', () => {
  /**
   * The one thing a mistake here would break. A WOW praxis carrying a Coven
   * metatask must show COVEN on the seal — rendered through the real card body
   * eight praxis archetypes compose, so the host's own dress is genuinely in
   * the tree rather than assumed absent.
   */
  const host = {
    id: 1,
    created_by_id: 7,
    created_by_display_name: 'Isolde',
    created_by_faction_slug: 'wow',
    created_by_avatar_url: '',
    task_faction_slug: 'wow',
    task_level_required: 0,
    task_point_value: 5,
    member_count: 1,
    score: 12.5,
    voter_count: 3,
    applied_metatasks: [metatask('coven')],
  } as PraxisCardOut

  it('a Coven seal on a WOW praxis wears the Coven band', () => {
    const html = render(
      <PraxisBody
        praxis={host}
        tint="var(--faction-wow-card-accent)"
        muted="var(--faction-wow-card-muted)"
      />,
    )
    expect(html).toContain('data-card-masthead="coven"')
    expect(html).not.toContain('data-card-masthead="wow"')
    expect(text(html)).toContain(factionName('coven'))
  })
})

describe('no seal skin draws a faction label of its own (#2648)', () => {
  const skins = readdirSync(SKINS).filter((file) => file.endsWith('.tsx'))

  it('finds all nine skins', () => {
    expect(skins).toHaveLength(9)
  })

  for (const file of skins) {
    it(`${file} leaves the faction's name to the band`, () => {
      const source = readFileSync(`${SKINS}/${file}`, 'utf8')
      expect(
        source,
        'the seal names its issuer through the shared band now — a hand-drawn eyebrow is the drift #2648 deleted',
      ).not.toContain('detail.seal.label')
      expect(source, 'the label eyebrow class went with the label').not.toContain(
        'label-heading',
      )
    })
  }
})

/**
 * EVERY SEAL STILL SAYS WHAT IT IS (owner ruling, 2026-08-25).
 *
 * The eyebrow this issue deleted was `praxis:detail.seal.label` —
 * `"{{faction}} Metatask"` — so a change described as "the faction label" also
 * deleted the NOUN. The band gives the name back and cannot give back the word:
 * `CardMasthead` prints a faction's wordmark and nothing else.
 *
 * That is a real loss on two of the seal's four hosts. The praxis DETAIL sits
 * the stack under `detail.metatasks.heading`, and the composer slot says
 * "+ Add a metatask" — but the praxis CARD and the Tasks-page metatask list
 * (`pages/Tasks.tsx`, which mounts `MetataskSeal` directly) give the seal no
 * surrounding heading at all. On a stranger's Ephemerists praxis card, a Coven
 * band over a condition with no explanatory word reads as "this praxis is
 * Coven's" — the exact misattribution `SealSkinProps`'s foreign-sticker
 * contract exists to prevent.
 *
 * So the caption is `detail.seal.kind` — THE WORD ALONE, with no `{{faction}}`
 * to interpolate, because naming the issuer is the band's job now and a seal
 * that said it twice would be the doubling #2648 removed. This block is the
 * reason it cannot be deleted quietly a second time: a caption missing from one
 * skin of nine is precisely what went unnoticed before.
 */
describe('every seal captions itself with the word the band cannot say', () => {
  const KIND = praxisCopy.detail.seal.kind

  it('the key is the noun alone — no faction interpolation', () => {
    expect(KIND).not.toContain('{{')
  })

  for (const slug of SLUGS) {
    it(`${slug}'s seal prints the caption once, and the faction's name once`, () => {
      const body = text(seal(slug))
      const captions = body.split(KIND).length - 1
      expect(captions, `${slug}'s seal prints "${KIND}" ${captions} times`).toBe(1)
      // The band already spells the issuer. A caption that spelled it again
      // would be the hand-drawn eyebrow coming back through the noun's door.
      const name = factionName(slug)
      expect(body.split(name).length - 1, `${slug}'s seal names its faction twice`).toBe(1)
    })
  }

  const skins = readdirSync(SKINS).filter((file) => file.endsWith('.tsx'))

  for (const file of skins) {
    it(`${file} draws the caption in its own hand`, () => {
      const source = readFileSync(`${SKINS}/${file}`, 'utf8')
      expect(
        source,
        'each skin letters the caption in its own caption register — a shared tenth treatment is the uniformity the kit exists to refuse',
      ).toContain('detail.seal.kind')
    })
  }
})
