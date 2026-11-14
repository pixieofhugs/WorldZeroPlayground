/**
 * Every profile kit renders the same shared words (#1911). A kit that kept a raw
 * literal or lost a slot still typechecks; only rendering catches it.
 * Empty `submissions` on purpose, to reach the praxis empty-state copy.
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
  // Strip tags, then unescape entities.
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/** Resolved from the catalog so copy edits don't break the suite. */
const SHARED_COPY: readonly string[] = [
  i18n.t('common:profile.lvl'),
  i18n.t('common:profile.ptsThisLevel', { current: 380, span: 500 }),
  i18n.t('common:profile.nextLevel', { level: 8 }),
  i18n.t('common:profile.praxisEmptyTitle'),
  i18n.t('common:profile.praxisEmptyBody'),
  i18n.t('common:profile.badgesHeading'),
]

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

  // #2231: the page is the character's own praxis, so the byline is redundant.
  // The key stays for surfaces where authorship is in question.
  it('names no submitter under the praxis heading, on any kit', () => {
    const byline = i18n.t('common:profile.praxisEyebrow', { name: 'Reza' })
    for (const slug of SLUGS) {
      expect(renderText(slug), `${slug} byline`).not.toContain(byline)
    }
  })

  // Singularity's eyebrow draws a `> ` prompt; an empty one must draw none.
  it('leaves singularity no empty command prompt over the praxis heading', () => {
    expect(renderText('singularity')).not.toMatch(/>\s*Praxis/)
  })
})
