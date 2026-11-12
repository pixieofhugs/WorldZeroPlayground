/**
 * #2298: the letter's one box holds the perks. Rendered markup read against the
 * catalog: a perk-shape mismatch renders `[object Object]` or blank, and a stale
 * `t()` call prints its key, and neither `tsc` nor i18next will complain.
 *
 * #2774 (owner ruling, deliberate): only the MECHANIC perk has a name; the two
 * flavour rows are description-only. Do not "fix" the nameless rows back.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import factions from '../../locales/en/factions.json'
import { AuthContext } from '../../auth/AuthContext'
import InvitationLetterPopup from '../InvitationLetterPopup'
import AlbescentInvitation from '../AlbescentInvitation'
import type { CharacterOut, CurrentUser } from '../../api/auth'
import { FACTION_MANIFESTS } from '../../factions'

/**
 * Every kit whose catalog entry has an `invitation` block (#2815). `na` has none;
 * `albescent` keeps its own letter, tested below.
 */
const CATALOG = factions as unknown as Record<string, { invitation?: unknown }>
const SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug).filter(
  (slug) => CATALOG[slug]?.invitation !== undefined,
)

/** Where the mechanic sits in every letter (`MECHANIC_INDEX`). */
const MECHANIC = 1

/** `name` is optional since #2774 — only the mechanic row carries one. */
interface Perk {
  name?: string
  desc: string
}

function perksOf(slug: string): Perk[] {
  return (factions as unknown as Record<string, { invitation: { perks: Perk[] } }>)[slug]
    .invitation.perks
}

/** React's own text escaping, so an apostrophe in the copy still matches. */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function viewer(): CurrentUser {
  return { character: { faction_slug: 'na' } } as unknown as CurrentUser
}

function withAuth(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user: viewer(),
        loading: false,
        refetch: async () => {},
        applyUser: () => {},
        signOut: async () => {},
      }}
    >
      {node}
    </AuthContext.Provider>,
  )
}

function letter(slug: string): string {
  return withAuth(<InvitationLetterPopup factionSlug={slug} onClose={() => {}} />)
}

function albescentLetter(): string {
  const life = {
    id: 1,
    display_name: 'Tess',
    username: 'tess',
    level: 2,
    status: 'active',
    faction_slug: 'coven',
  } as unknown as CharacterOut
  return withAuth(<AlbescentInvitation lives={[life]} onJoined={() => {}} />)
}

// Guards against `describe.each([])` passing vacuously.
it('resolves to every kit that ships a shared letter', () => {
  expect(SLUGS).toHaveLength(7)
})

describe.each(SLUGS)('the %s letter spends its one box on the perks (#2298)', (slug) => {
  it('prints the mechanic as a name over a description, and the flavour rows as description alone (#2774)', () => {
    const html = letter(slug)
    const perks = perksOf(slug)
    expect(perks).toHaveLength(3)
    for (const perk of perks) expect(html).toContain(escaped(perk.desc))
    expect(perks.filter((perk) => perk.name !== undefined)).toHaveLength(1)
    expect(html).toContain(escaped(perks[MECHANIC].name as string))
    expect(html).not.toContain('[object Object]')
    expect(html).not.toContain('undefined')
  })

  // #3294: read via the `data-perk` hooks every letter carries
  // (`invitation/letterTypes.ts`); paint is `factionContrast.test.ts`'s.
  it('puts all three perks in the letter, one row each, the mechanic named', () => {
    const html = letter(slug)
    const rows = [...html.matchAll(/<li[^>]*data-perk="([a-z]+)"[^>]*>([\s\S]*?)<\/li>/g)]
    expect(rows.map((row) => row[1])).toEqual(['flavour', 'mechanic', 'flavour'])
    perksOf(slug).forEach((perk, idx) => expect(rows[idx][2]).toContain(escaped(perk.desc)))
    expect(rows[MECHANIC][2]).toContain(escaped(perksOf(slug)[MECHANIC].name as string))
  })

  it('carries no heading on the box, and none of the chrome that was cut', () => {
    const html = letter(slug)
    // Retired wording; #2298 rejected a heading on the box.
    for (const gone of ['a prospectus', 'Terms of matriculation', 'Required skills', 'Expected output', 'What you gain']) {
      expect(html).not.toContain(gone)
    }
    const invitation = (factions as unknown as Record<string, { invitation: Record<string, unknown> }>)[slug].invitation
    expect(invitation).not.toHaveProperty('kicker')
    expect(invitation).not.toHaveProperty('terms')
    expect(invitation.cta).not.toHaveProperty('joined')
  })

  it('renders a name on the mechanic row and on NO other row (#2774)', () => {
    const html = letter(slug)
    const rows = [...html.matchAll(/<li[^>]*data-perk="[a-z]+"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])
    expect(rows).toHaveLength(3)
    // On the name element, not the row (#2619): an empty name would still take space.
    const named = (row: string) => row.includes('data-perk-name')
    expect(named(rows[MECHANIC])).toBe(true)
    for (const idx of [0, 2]) expect(named(rows[idx])).toBe(false)
  })
})

describe("Albescent's letter takes the same four cuts on its own key names (#2298)", () => {
  it('prints each perk as a name over a description', () => {
    const html = albescentLetter()
    const perks = factions.albescent.letter.perks as unknown as Record<string, Perk>
    expect(Object.keys(perks)).toEqual(['record'])
    for (const perk of Object.values(perks)) {
      // #2782 already cut this letter to one named perk, the mechanic.
      expect(perk.name).toBeDefined()
      expect(html).toContain(escaped(perk.name as string))
      expect(html).toContain(escaped(perk.desc))
    }
    expect(html).not.toContain('[object Object]')
  })

  it('loses the letterhead, the extended hand and the whole terms slip', () => {
    const html = albescentLetter()
    for (const gone of [
      'Faction no. 7',
      'A hand is extended',
      'The terms, plainly',
      'toll of entry',
      'one duty, quietly kept',
      'accounts, entered plainly',
    ]) {
      expect(html).not.toContain(gone)
    }
    const { letter: block } = factions.albescent
    expect(block).not.toHaveProperty('letterhead')
    expect(block).not.toHaveProperty('handExtended')
    expect(block).not.toHaveProperty('termsHeading')
    expect(block).not.toHaveProperty('terms')
    // Only Albescent renders `cta.joined`, in place after accepting.
    expect(block.cta.joined).toBe('You have been chosen')
  })
})

/** Finished owner copy, pinned by value (`lose` not "loose", serial comma, `read-only`). */
describe('the eight real perks ship the corrected copy (#2298 §3)', () => {
  const MECHANICS: ReadonlyArray<readonly [string, string, string]> = [
    ['ua', 'Bonus points for persistence',
      'Practice doing art daily, the inertia will drive you to continued more practice and be rewarded'],
    ['snide', 'Going Hard',
      'Duels you win bring glory. Duels you lose bring despair'],
    ['wow', 'Foolhardy Courage',
      'Levels and common sense do not stop you from biting off more than you can chew'],
    ['coven', 'The Power of Friendship',
      'Witches who task together will always find a little extra magic ✦'],
    ['ephemerists', 'Time Travel',
      'Enjoy access to tasks of the past, present, and future'],
    ['everymen', 'Tireless Determination',
      'The only person you need to beat is yourself. Only you can do the task again, but better this time'],
    ['singularity', 'Hack the System',
      'This is read-only. See what no one else sees'],
  ]

  it.each(MECHANICS)('%s states its mechanic in the middle slot', (slug, name, desc) => {
    const perk = perksOf(slug)[MECHANIC]
    expect(perk.name).toBe(name)
    expect(perk.desc).toBe(desc)
  })

  it("Albescent's mechanic is named and written, and says nothing about levels", () => {
    // Owner ruling #2828: the mid-clause ending is DELIBERATE. Do not finish the
    // clause or send it back to a placeholder.
    const perk = factions.albescent.letter.perks.record as unknown as Perk
    expect(perk.name).toBe('Transcendence')
    expect(perk.desc).not.toMatch(/^PLACEHOLDER/)
    expect(perk.desc).toMatch(/^You see the value in working together,/)
    expect(perk.desc).toMatch(/You know how to task$/)
    // `inherits_faction_perks` has no level condition, so levels stay out.
    expect(perk.desc).not.toMatch(/\blevel/i)
  })
})

describe('no perk slot is owed any more (#2298 §4, #2774, #2828)', () => {
  function allPerks(): Array<[string, Perk]> {
    const shared = SLUGS.flatMap((slug) =>
      perksOf(slug).map((perk, idx) => [`${slug}.invitation.perks.${idx}`, perk] as [string, Perk]),
    )
    const alb = Object.entries(
      factions.albescent.letter.perks as unknown as Record<string, Perk>,
    ).map(([key, perk]) => [`albescent.letter.perks.${key}`, perk] as [string, Perk])
    return [...shared, ...alb]
  }

  it('leaves no owed slot: every perk name and description is written', () => {
    const owed = allPerks().flatMap(([id, perk]) =>
      (['name', 'desc'] as const)
        .filter((field) => perk[field]?.startsWith('PLACEHOLDER'))
        .map((field) => `${id}.${field}`),
    )
    expect(owed).toEqual([])
  })

  // Vacuous by design while nothing is owed; a forward guard.
  it('hints any placeholder, so the file says what it wants', () => {
    for (const [id, perk] of allPerks()) {
      for (const field of ['name', 'desc'] as const) {
        if (!perk[field]?.startsWith('PLACEHOLDER')) continue
        expect(perk[field], `${id}.${field}`).toMatch(/^PLACEHOLDER — .+/)
      }
    }
  })

  it('drops no interpolation tag: perk copy is plain, and stays plain', () => {
    for (const [id, perk] of allPerks()) {
      expect(perk.name ?? '', id).not.toMatch(/<\d/)
      expect(perk.desc, id).not.toMatch(/<\d/)
    }
  })

  it('names one perk per letter, and it is the mechanic (#2774)', () => {
    for (const slug of SLUGS) {
      const named = perksOf(slug)
        .map((perk, idx) => [idx, perk] as const)
        .filter(([, perk]) => perk.name !== undefined)
      expect(named.map(([idx]) => idx), slug).toEqual([MECHANIC])
      expect(named[0][1].name, slug).not.toBe('')
    }
  })
})
