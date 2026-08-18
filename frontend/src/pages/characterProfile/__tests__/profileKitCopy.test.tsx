/**
 * The seam: `<Faction>ProfileBody` → `ProfileSkin` → rendered words (#1858 →
 * #1911).
 *
 * #1858 moved the seven kits' English out of raw `.tsx` literals and into
 * `common.json` `profile.<slug>.*`, and this suite pinned each kit's own words
 * so the MOVE could be read as a move. #1911 collapsed those seven families to
 * one shared string each, so there are no per-kit words left — and the question
 * inverts. It is no longer "does each kit read its OWN key"; it is "do all
 * EIGHT kits render the SAME words".
 *
 * That is the harder question after a 300-site sweep, and the one a catalog
 * check cannot answer: a kit that kept a raw literal, or quietly lost a slot
 * when its knob was removed, still typechecks and still renders. Only rendering
 * all eight and reading the words back catches it.
 *
 * Empty `submissions` on purpose: the praxis empty state is copy on every kit
 * and is otherwise only reachable on a brand-new character.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import i18n from '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

function renderText(factionSlug: string): string {
  const character: CharacterOut = {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: factionSlug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    invitations: [],
  }
  const props: ProfileBodyProps = {
    character,
    submissions: [],
    proposedTasks: [],
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      pointsIntoLevel: 380,
      levelSpan: 500,
      progressPercent: 76,
    },
    identityActions: null,
  }
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
  // Tags out, then the entities React escapes on the way in — `&` in "Honours &
  // Credentials", `>` in Singularity's terminal prompts, `'` in Snide's body.
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/**
 * Every word `ProfileSkin` now draws for a level-7 character 380/500 into the
 * level, resolved from the catalog rather than written out — a copy edit to the
 * shared string moves this suite with it instead of breaking it.
 */
const SHARED_COPY: readonly string[] = [
  i18n.t('common:profile.lvl'),
  i18n.t('common:profile.ptsThisLevel', { current: 380, span: 500 }),
  i18n.t('common:profile.nextLevel', { level: 8 }),
  i18n.t('common:profile.praxisEmptyTitle'),
  i18n.t('common:profile.praxisEmptyBody'),
  i18n.t('common:profile.badgesHeading'),
]

/** The eight kits `FactionProfileBody` dispatches to. */
const SLUGS = ['na', 'ua', 'snide', 'wow', 'coven', 'ephemerists', 'everymen', 'singularity']

describe('every profile kit renders the one shared set of words (#1911)', () => {
  it('has words to look for, so the loop below cannot pass by asserting nothing', () => {
    expect(SHARED_COPY).toHaveLength(6)
    for (const word of SHARED_COPY) expect(word.length).toBeGreaterThan(0)
  })

  for (const slug of SLUGS) {
    it(`${slug} draws all seven, and none of them blank`, () => {
      const text = renderText(slug)
      for (const expected of SHARED_COPY) {
        expect(text, `${slug}: "${expected}"`).toContain(expected)
      }
    })
  }

  it('keeps the shared praxis section heading ProfileSkin owns', () => {
    expect(renderText('coven')).toContain(i18n.t('common:profile.praxisHeading'))
  })

  // #2231: a character page shows that character's OWN praxis, so a byline
  // naming them is a line that can never say anything else. The catalog key
  // stays — `common:profile.praxisEyebrow` is the right words for any surface
  // where authorship IS in question — it is this MOUNT that stops asking for
  // it, in ProfileSkin and in DefaultProfileBody alike.
  it('names no submitter under the praxis heading, on any kit', () => {
    const byline = i18n.t('common:profile.praxisEyebrow', { name: 'Reza' })
    for (const slug of SLUGS) {
      expect(renderText(slug), `${slug} byline`).not.toContain(byline)
    }
  })

  // Singularity is the one kit whose eyebrow slot draws INK of its own — a
  // `> ` command prompt. Handed nothing to say (the praxis heading above, and
  // the About block, which both ask for a bare heading) it printed a prompt
  // with no command. An empty eyebrow now draws no prompt at all.
  it('leaves singularity no empty command prompt over the praxis heading', () => {
    expect(renderText('singularity')).not.toMatch(/>\s*Praxis/)
  })

  it('speaks none of the retired per-kit words', () => {
    // One from each collapsed family, chosen where the kit's own wording was
    // most distinct — a kit that kept a literal instead of losing its knob
    // renders exactly these, and nothing else in this suite would notice.
    const RETIRED = [
      'anno', // ua ringLabel + levelUnit
      'pvncta', // ephemerists levelUnit
      'huzzahs toward the next rank', // wow levelUnit
      'next · rank', // wow nextLevel
      'next // lvl', // singularity nextLevel
      'NEXT · LVL', // everymen nextLevel
      'cases closed by', // snide praxisEyebrow
      'Filed to the codex by', // ephemerists praxisEyebrow
      'No spells sealed yet', // coven praxisEmptyTitle
      '> NO OUTPUT SEALED', // singularity praxisEmptyTitle
      'The codex holds no entry yet', // ephemerists praxisEmptyTitle
      'Charms earned', // coven badgeTitle
      'Concordances', // ephemerists badgeTitle
      'Seals of the practice', // ua badgeTitle
      'The record', // snide badgeTitle
    ]
    const all = SLUGS.map(renderText).join(' ')
    for (const word of RETIRED) expect(all, word).not.toContain(word)
  })
})
