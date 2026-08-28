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
 *
 * -------------------------------------------------------------------------- *
 * #2774 SUPERSEDES §2 OF THAT: EVERY LETTER NAMES ONE PERK, AND IT IS THE
 * MECHANIC. This is a decision, not an oversight — read it before "fixing" the
 * two nameless rows back.
 *
 * The two flavour perks either side of the mechanic never had names in the
 * catalog: all sixteen shipped as `PLACEHOLDER — name for: <the desc>`, waiting
 * on the owner. #2298 §2 then muted them deliberately — the mechanic's name in
 * the faction accent-ink, the flavour names in `--color-text-tertiary` — so
 * that the real perk would read first. This file's own guard used to assert
 * exactly that, under the title *"marks the mechanic and mutes the two flavour
 * names, so the real perk reads first"*.
 *
 * The owner's ruling on #2774: deleting the flavour names is **the honest end of
 * that same gradient**. Muting a name towards invisible so it stops competing
 * achieves the goal by degree; removing it achieves it outright. So the sixteen
 * placeholders are not written — they are cut, `name` becomes optional on the
 * perk contract, and the muted tier has nothing left to mute.
 *
 * What that costs the guards, and what replaced each one:
 *   - "prints every perk as a name over a description" → name-over-description
 *     for the mechanic, description-only for the other two.
 *   - the box's `expect(body).toContain(perk.name)` → the descriptions carry the
 *     box now; only the mechanic's name is looked for in it.
 *   - the mute assertion → **only the mechanic renders a name span at all**,
 *     which is a stronger statement than a colour tier and cannot go vacuous
 *     the way #2619 found the old row-scoped `toContain` had.
 *
 * Albescent needed no change: #2782 had already cut its letter to a single
 * perk, and that one is its mechanic, named.
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

/** Where the mechanic sits in every letter (`MECHANIC_INDEX`). */
const MECHANIC = 1

/** `name` is optional since #2774 — only the mechanic row carries one. */
interface Perk {
  name?: string
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
  it('prints the mechanic as a name over a description, and the flavour rows as description alone (#2774)', () => {
    const html = letter(slug)
    const perks = perksOf(slug)
    expect(perks).toHaveLength(3)
    // Every row still says what it gets you — the deletion took names, not copy.
    for (const perk of perks) expect(html).toContain(escaped(perk.desc))
    // Exactly one name in the catalog, on the mechanic, and it reaches the page.
    expect(perks.filter((perk) => perk.name !== undefined)).toHaveLength(1)
    expect(html).toContain(escaped(perks[MECHANIC].name as string))
    // The shape change's own failure mode: the element rendered whole. A perk
    // whose `name` is gone must not print `undefined` in its place either.
    expect(html).not.toContain('[object Object]')
    expect(html).not.toContain('undefined')
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
    // The box is proved by what all three rows still have — their descriptions
    // — plus the one name that survived (#2774). It used to be proved by three
    // names; two of those no longer exist to look for.
    for (const perk of perksOf(slug)) expect(body).toContain(escaped(perk.desc))
    expect(body).toContain(escaped(perksOf(slug)[MECHANIC].name as string))
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

  it('renders a name on the mechanic row and on NO other row (#2774)', () => {
    const html = letter(slug)
    const rows = [...html.matchAll(/<li style="[^"]*">([\s\S]*?)<\/li>/g)].map((m) => m[1])
    expect(rows).toHaveLength(3)
    // THE ASSERTION IS ON THE NAME SPAN, NOT THE ROW (#2619). Asserting
    // `toContain` against the whole `<li>` was vacuous for the name's ink: the
    // perk DESCRIPTION beneath it also prints `--color-text-primary`, so the row
    // carried that string whatever the name did, and this test stayed green
    // across the very repaint it exists to pin. The name is the only span in the
    // row that is `text-transform:uppercase`.
    const nameSpan = (row: string) =>
      /<span style="([^"]*text-transform:uppercase[^"]*)"/.exec(row)?.[1] ?? null

    // #2774 supersedes #2298 §2 (see the header). The mechanic keeps its ink —
    // `-accent-ink` and never the bare hue, because `local/no-faction-hue-as-ink`
    // is right that the spine hue is 2.19:1 to 4.46:1 as type here — and the
    // hue itself keeps the BULLET, which is a fill. What changed is the other
    // two rows: there is no muted name any more, there is no name.
    expect(rows[MECHANIC]).toContain(`color:var(--faction-${slug})`)
    expect(nameSpan(rows[MECHANIC])).toContain(`color:var(--faction-${slug}-accent-ink)`)
    for (const idx of [0, 2]) {
      expect(rows[idx]).not.toContain(`color:var(--faction-${slug})`)
      // Not "muted to tertiary" — ABSENT. An empty name span left behind would
      // still take its line box and its margin on the page.
      expect(nameSpan(rows[idx])).toBeNull()
    }
  })
})

describe("Albescent's letter takes the same four cuts on its own key names (#2298)", () => {
  it('prints each perk as a name over a description', () => {
    const html = albescentLetter()
    const perks = factions.albescent.letter.perks as unknown as Record<string, Perk>
    expect(Object.keys(perks)).toEqual(['record'])
    for (const perk of Object.values(perks)) {
      // Albescent needed no #2774 cut: #2782 had already reduced this letter to
      // one perk, and that one is the mechanic — so it is the faction that
      // already ships the shape the other seven just moved to.
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
    // `cta.joined` survives here and only here: Albescent's letter renders it
    // in place after accepting, where the seven shared letters never had a
    // call site for theirs.
    expect(block.cta.joined).toBe('You have been chosen')
  })
})

/* -------------------------------------------------------------------------- *
 * §3's eight mechanics are FINISHED COPY, pinned by value.
 *
 * Every other perk in the catalog is a placeholder the owner fills in the file,
 * so these eight are the only rows a copy edit here would be reverting rather
 * than writing. The corrections are the point: `lose` not "loose", the serial
 * comma, `who` not "that" for witches, `read-only` hyphenated. (UA's row is the
 * owner's own 2026-08-26 rewrite, which is why "aplenty" is no longer here.)
 * -------------------------------------------------------------------------- */
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
    const perk = perksOf(slug as (typeof SLUGS)[number])[MECHANIC]
    expect(perk.name).toBe(name)
    expect(perk.desc).toBe(desc)
  })

  it("Albescent's mechanic is named and written, and says nothing about levels", () => {
    // It was `perks.duties`, named "Enlightenment", until #2782's copy pass cut
    // `duties` and `witnessed` and left `record` the only perk the letter
    // carries. That pass also sent this description back to a placeholder, for
    // stopping mid-clause ("You know how to task").
    //
    // OWNER, 2026-08-28 (#2828): the description is RESTORED VERBATIM, ending
    // and all. Shown the mid-clause objection and #2782's own diff, she
    // re-affirmed it and renamed the perk "Transcendence" — the pitch's word for
    // those who have "transcended the factional competition". THE ENDING IS
    // DELIBERATE: do not finish the clause, and do not send it back to a
    // placeholder. That round trip has now happened once.
    const perk = factions.albescent.letter.perks.record as unknown as Perk
    expect(perk.name).toBe('Transcendence')
    expect(perk.desc).not.toMatch(/^PLACEHOLDER/)
    expect(perk.desc).toMatch(/^You see the value in working together,/)
    expect(perk.desc).toMatch(/You know how to task$/)
    // The owner's draft opened "From levels 1-7…" and closed on level 8. Both
    // sentences were cut deliberately: `inherits_faction_perks` carries no
    // level condition, and `albescent_level_required` is the door in, not a
    // point where what you hold changes. Nothing about levels may come back.
    expect(perk.desc).not.toMatch(/\blevel/i)
  })
})

/* -------------------------------------------------------------------------- *
 * WHAT IS STILL OWED — one slot, and it is a DESCRIPTION.
 *
 * #2298 §4 shipped 15 owed slots as hinted `PLACEHOLDER — …` strings on the
 * owner's ruling of 2026-08-23. #2774 closed 14 of them without writing 12 of
 * them: the twelve owed NAMES were the flavour rows, and those were deleted
 * rather than written (see the header), while WoW's two owed descriptions were
 * written. Albescent's mechanic description is the remainder — the one row
 * where a placeholder is still the honest state, because a description is copy
 * and the letter would say nothing there without it.
 * -------------------------------------------------------------------------- */
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

  // Vacuous today by design — nothing is owed. It is a forward guard: it costs
  // nothing while the ledger is empty and bites the moment a bare PLACEHOLDER
  // is added back.
  it('hints any placeholder, so the file says what it wants', () => {
    for (const [id, perk] of allPerks()) {
      for (const field of ['name', 'desc'] as const) {
        if (!perk[field]?.startsWith('PLACEHOLDER')) continue
        // `PLACEHOLDER — <hint>`. A bare one is legal and wastes the slot.
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
      // A key present but empty is the same defect wearing a different mask.
      expect(named[0][1].name, slug).not.toBe('')
    }
  })
})
