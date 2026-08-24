/* ========================================================================== *
 * #2298 — THE LETTER IS ONE BOX, AND THE BOX HOLDS NAMED PERKS.
 *
 * THE SEAM IS THE RENDERED MARKUP OF THE TWO LETTER COMPONENTS, read against
 * the catalog they resolve from. It has to be both at once, because the defect
 * this change can ship is invisible to either alone:
 *
 *   - `perks` went from `string[]` to `{name, desc}[]`. A component still
 *     reading the element itself renders `[object Object]`, and one reading
 *     `.desc` off a string renders NOTHING. i18next resolves a miss to the key
 *     or to an empty string rather than throwing, so `tsc` sees neither — the
 *     perk box just comes out blank and ships.
 *   - The 55 deleted leaves are only half a deletion until the call sites go
 *     with them. A `t('invitation.termsHeading')` left behind prints the key
 *     onto the paper.
 *
 * The harness is renderToStaticMarkup with no jsdom (same as
 * `invitationLetterPopupScroll.test.tsx`), so what is asserted is the markup
 * string and its inline styles, not layout.
 *
 * Parametrised over all seven shared letters plus Albescent's own component,
 * because "one adaptive prospectus skinned per faction" means a per-slug break
 * is a catalog break, and Albescent's letter is the one that does NOT share the
 * code path — it carries the same four cuts on differently-named keys.
 * ========================================================================== */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import factions from '../../locales/en/factions.json'
import { AuthContext } from '../../auth/AuthContext'
import InvitationLetterPopup from '../InvitationLetterPopup'
import AlbescentInvitation from '../AlbescentInvitation'
import type { CharacterOut, CurrentUser } from '../../api/auth'

/** The seven slugs with an `invitation` block — the shared popup's whole range. */
const SLUGS = ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua', 'wow'] as const

/** Where the mechanic sits in every letter (`MECHANIC_INDEX` / `PERK_KEYS`). */
const MECHANIC = 1

interface Perk {
  name: string
  desc: string
}

function perksOf(slug: (typeof SLUGS)[number]): Perk[] {
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

describe.each(SLUGS)('the %s letter spends its one box on the perks (#2298)', (slug) => {
  it('prints every perk as a name over a description', () => {
    const html = letter(slug)
    const perks = perksOf(slug)
    expect(perks).toHaveLength(3)
    for (const perk of perks) {
      expect(html).toContain(escaped(perk.name))
      expect(html).toContain(escaped(perk.desc))
    }
    // The shape change's own failure mode: the element rendered whole.
    expect(html).not.toContain('[object Object]')
  })

  it('puts all three perks inside the ONE tinted box the terms slip vacated', () => {
    const html = letter(slug)
    const boxes = [...html.matchAll(/<ul style="([^"]*)">([\s\S]*?)<\/ul>/g)]
    expect(boxes).toHaveLength(1)
    const [, style, body] = boxes[0]
    // Same border, radius, padding and faction tint the slip carried.
    expect(style).toContain(`background:var(--faction-${slug}-light)`)
    expect(style).toContain(`border:1px solid var(--faction-${slug}-border)`)
    expect(style).toContain('border-radius:8px')
    for (const perk of perksOf(slug)) expect(body).toContain(escaped(perk.name))
  })

  it('carries no heading on the box, and none of the chrome that was cut', () => {
    const html = letter(slug)
    // The four shared strings, by their retired wording — a heading is exactly
    // what #2298 rejected, so a re-added one has to fail here.
    for (const gone of ['a prospectus', 'Terms of matriculation', 'Required skills', 'Expected output', 'What you gain']) {
      expect(html).not.toContain(gone)
    }
    const invitation = (factions as unknown as Record<string, { invitation: Record<string, unknown> }>)[slug].invitation
    expect(invitation).not.toHaveProperty('kicker')
    expect(invitation).not.toHaveProperty('terms')
    expect(invitation.cta).not.toHaveProperty('joined')
  })

  it('marks the mechanic and mutes the two flavour names, so the real perk reads first', () => {
    const html = letter(slug)
    const rows = [...html.matchAll(/<li style="[^"]*">([\s\S]*?)<\/li>/g)].map((m) => m[1])
    expect(rows).toHaveLength(3)
    // The hue stays on the bullet — it is a FILL, not an ink (#1932/#2108) —
    // and the name takes a text tier: primary for the mechanic, tertiary for
    // the flavour, which is what makes one of the three read first.
    expect(rows[MECHANIC]).toContain(`color:var(--faction-${slug})`)
    expect(rows[MECHANIC]).toContain('color:var(--color-text-primary)')
    for (const idx of [0, 2]) {
      expect(rows[idx]).not.toContain(`color:var(--faction-${slug})`)
      expect(rows[idx]).toContain('color:var(--color-text-tertiary)')
    }
  })
})

describe("Albescent's letter takes the same four cuts on its own key names (#2298)", () => {
  it('prints each perk as a name over a description', () => {
    const html = albescentLetter()
    const perks = factions.albescent.letter.perks as unknown as Record<string, Perk>
    expect(Object.keys(perks)).toEqual(['record', 'duties', 'witnessed'])
    for (const perk of Object.values(perks)) {
      expect(html).toContain(escaped(perk.name))
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
    // `cta.joined` survives here and only here: Albescent's letter renders it
    // in place after accepting, where the seven shared letters never had a
    // call site for theirs.
    expect(block.cta.joined).toBe('You are of the Order')
  })
})

/* -------------------------------------------------------------------------- *
 * §3's eight mechanics are FINISHED COPY, pinned by value.
 *
 * Every other perk in the catalog is a placeholder the owner fills in the file,
 * so these eight are the only rows a copy edit here would be reverting rather
 * than writing. The corrections are the point: `lose` not "loose", `aplenty`
 * not "a plenty", the serial comma, `who` not "that" for witches, `read-only`
 * hyphenated.
 * -------------------------------------------------------------------------- */
describe('the eight real perks ship the corrected copy (#2298 §3)', () => {
  const MECHANICS: ReadonlyArray<readonly [string, string, string]> = [
    ['ua', 'Set Your Art Free',
      'Make a practice of making praxis and you will have points aplenty'],
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
    const perk = perksOf(slug as (typeof SLUGS)[number])[MECHANIC]
    expect(perk.name).toBe(name)
    expect(perk.desc).toBe(desc)
  })

  it("Albescent's mechanic is the inheritance, with no level talk in it", () => {
    const perk = factions.albescent.letter.perks.duties as unknown as Perk
    expect(perk.name).toBe('Enlightenment')
    expect(perk.desc).toBe(
      'You see the value in working together, competing, gathering information, '
      + 'being consistent, trying again, and being in the right place at the right time '
      + '(even if that involves a little messing around with the timeline). You know how to task',
    )
    // The owner's draft opened "From levels 1-7…" and closed on level 8. Both
    // sentences were cut deliberately: `inherits_faction_perks` carries no
    // level condition, and `albescent_level_required` is the door in, not a
    // point where what you hold changes. Nothing about levels may come back.
    expect(perk.desc).not.toMatch(/\blevel/i)
  })
})

/* -------------------------------------------------------------------------- *
 * The 16 owed names, shipped as literal placeholders (owner ruling 2026-08-23).
 * -------------------------------------------------------------------------- */
describe('the owed copy ships as hinted placeholders, and nothing else does (#2298 §4)', () => {
  function allPerks(): Array<[string, Perk]> {
    const shared = SLUGS.flatMap((slug) =>
      perksOf(slug).map((perk, idx) => [`${slug}.invitation.perks.${idx}`, perk] as [string, Perk]),
    )
    const alb = Object.entries(
      factions.albescent.letter.perks as unknown as Record<string, Perk>,
    ).map(([key, perk]) => [`albescent.letter.perks.${key}`, perk] as [string, Perk])
    return [...shared, ...alb]
  }

  it("leaves exactly the 16 slots owed — 14 names, plus WoW's two full pairs", () => {
    const owed = allPerks().flatMap(([id, perk]) =>
      (['name', 'desc'] as const)
        .filter((field) => perk[field].startsWith('PLACEHOLDER'))
        .map((field) => `${id}.${field}`),
    )
    // The issue counts SLOTS: 14 name-only, plus two WoW perks owed whole.
    // That is 18 FIELDS, because WoW's two contribute a desc each — the only
    // two descriptions in the catalog that were not already written.
    expect(new Set(owed.map((id) => id.replace(/\.(name|desc)$/, ''))).size).toBe(16)
    expect(owed).toHaveLength(18)
    expect(owed.filter((id) => id.endsWith('.desc'))).toEqual([
      'wow.invitation.perks.0.desc',
      'wow.invitation.perks.2.desc',
    ])
  })

  it('hints every placeholder, so the file says what it wants', () => {
    for (const [id, perk] of allPerks()) {
      for (const field of ['name', 'desc'] as const) {
        if (!perk[field].startsWith('PLACEHOLDER')) continue
        // `PLACEHOLDER — <hint>`. A bare one is legal and wastes the slot.
        expect(perk[field], `${id}.${field}`).toMatch(/^PLACEHOLDER — .+/)
      }
    }
  })

  it('drops no interpolation tag: perk copy is plain, and stays plain', () => {
    for (const [id, perk] of allPerks()) {
      expect(perk.name, id).not.toMatch(/<\d/)
      expect(perk.desc, id).not.toMatch(/<\d/)
    }
  })

  it('names the 14 owed names after the description beside them', () => {
    const named = allPerks().filter(([, perk]) => perk.name.startsWith('PLACEHOLDER — name for: '))
    expect(named).toHaveLength(14)
    for (const [id, perk] of named) {
      expect(perk.name, id).toBe(`PLACEHOLDER — name for: ${perk.desc}`)
    }
  })
})
