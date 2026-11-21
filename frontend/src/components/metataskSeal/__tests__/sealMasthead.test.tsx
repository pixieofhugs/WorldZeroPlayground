/**
 * The seal's masthead is the shared band (#2648). Held here: it names the
 * ISSUING faction, not the host's; it is a link never nested in another; no skin
 * draws its own faction label; every skin still captions what the object is.
 * `MemoryRouter` is required: the band is a `<Link>`.
 */
import { basename } from 'node:path'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'

import MetataskSeal from '../MetataskSeal'
import { PraxisBody } from '../../praxisCard/desktop/shared'
import praxisCopy from '../../../locales/en/praxis.json'
import { FACTION_MANIFESTS } from '../../../factions'
import { factionName } from '../../../utils/factions'
import { sourceFiles } from '../../../test/sourceScan'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'

const SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug).sort()

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
    viewer_faction_multiplier: 1,
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
  // Through the real card body, so the host's dress is genuinely in the tree.
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

/**
 * Every seal still says what it is (owner ruling, 2026-08-25). On the praxis
 * card and Tasks list there is no surrounding heading, so without the noun a
 * Coven band reads as "this praxis is Coven's". The caption `detail.seal.kind`
 * is the word alone: the band already names the issuer.
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
      const name = factionName(slug)
      expect(body.split(name).length - 1, `${slug}'s seal names its faction twice`).toBe(1)
    })
  }

  const skins = sourceFiles({ dir: SKINS, match: /\.tsx$/ }).map((path) => basename(path))

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
