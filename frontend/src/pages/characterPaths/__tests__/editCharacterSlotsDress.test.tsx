/**
 * THE SEAM: the dress an archetype hands the two edit-only slots (#2956).
 *
 * `editCharacterSlots.tsx` designs `FactionRow` and `DeleteCharacter` once for
 * all eight edit archetypes, and its contract is that an archetype MOUNTS them
 * — *"where each one sits on the page is the dress and belongs to the
 * archetype"*. Until now it also painted them, in module-level inline styles
 * naming app-global neutrals measured on the na page's washed ground, and it
 * exposed no way in. So the paint decided the placement: six of the seven
 * lanes #2537 landed worked around it, in four different ways (Coven and UA
 * moved the slot off their own sheet at 4.06:1 and 4.15:1; S.N.I.D.E. and
 * Singularity repointed global tokens on a wrapper root they own). That is the
 * contract backwards.
 *
 * Two claims here, and the second is the one that makes the seam safe to land
 * before any dress uses it:
 *
 *   1. a mount that supplies a dress GETS it — the props spread last, over the
 *      defaults, so the archetype wins;
 *   2. a mount that supplies NOTHING renders exactly what it rendered before.
 *      That is the whole safety argument for a shared file with ten mounts: a
 *      default that drifts here quietly repaints ten surfaces, and `na` and
 *      Albescent have no dress to notice with. Asserted the way
 *      `__tests__/composerErrorBannerGround.test.tsx` asserts it — bare render
 *      against `undefined`-everywhere render, then the literal tokens.
 *
 * The confirm branch is behind local state and this harness has no DOM, so the
 * three styles only a click reaches are pinned as SOURCE instead: their spread
 * order, and the fact that the filled DELETE key has no seam over it at all.
 * That last one is a ruling rather than an omission (2026-08-27, ADR-0061) —
 * `--color-danger` / `--color-on-danger` is a ground and its ink, and a prop
 * generous enough to carry an ink is generous enough to repaint that pair.
 *
 * `renderToStaticMarkup` only — no jsdom, effects never run.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import { stripComments } from '../../../test/sourceScan'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'

/** Comments stripped: the file's own header names every token it draws. */
const SOURCE = stripComments(
  readFileSync(fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)), 'utf8'),
)

const render = (node: ReactElement): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const noop = () => {}

describe('the faction row takes a dress, and defaults to today', () => {
  it('keeps today’s rendering for a mount that supplies none', () => {
    const bare = render(<FactionRow slug="wow" />)
    expect(bare).toBe(
      render(
        <FactionRow
          slug="wow"
          style={undefined}
          labelStyle={undefined}
          rowStyle={undefined}
          chevronStyle={undefined}
          helpStyle={undefined}
        />,
      ),
    )
    // The literal defaults, so a "byte identical" seam cannot drift by being
    // re-tokenised. These are the six globals `wowEditCharacterContrast` and
    // `singularityEditCharacterTail` measure and repoint from the outside.
    expect(bare).toContain('color:var(--color-text-secondary)')
    expect(bare).toContain('background:var(--color-bg-surface-alt)')
    expect(bare).toContain('border:1px solid var(--color-border-strong)')
    expect(bare).toContain('color:var(--color-text-tertiary)')
    // And the wrapper still carries no style attribute of its own.
    expect(bare.startsWith('<div><span style=')).toBe(true)
  })

  it('lets the archetype repaint the plate, which is the ground-dependent half', () => {
    // WoW's case, and the one measurement gap the seam exists to let a dress
    // close: the default well reads 1.06:1 on the charter sheet and its
    // hairline 1.41/1.56, under 1.4.11's 3:1 for a graphical boundary.
    const dressed = render(
      <FactionRow
        slug="wow"
        rowStyle={{
          background: 'var(--faction-wow-card-bg)',
          border: '1px solid var(--faction-wow-card-edge)',
        }}
      />,
    )
    expect(dressed).toContain('background:var(--faction-wow-card-bg)')
    expect(dressed).toContain('border:1px solid var(--faction-wow-card-edge)')
    expect(dressed).not.toContain('var(--color-bg-surface-alt)')
    expect(dressed).not.toContain('var(--color-border-strong)')
  })

  it('lets it repaint every text tier, because they are three tiers and not one', () => {
    // Singularity's case, and the shape of it: the label, the NAME on the plate
    // (which travels with the plate, in `rowStyle`), the chevron and the help
    // are four sites over three tiers. That is why this is a small named set
    // rather than one `slotStyle` — the seam has to be able to send them to
    // different places, which `SLOT_INK`'s six-token repoint already does.
    const dressed = render(
      <FactionRow
        slug="singularity"
        labelStyle={{ color: 'var(--faction-singularity-term-ink)' }}
        rowStyle={{ color: 'var(--faction-singularity-term-ink)' }}
        chevronStyle={{ color: 'var(--faction-singularity-term-dim)' }}
        helpStyle={{ color: 'var(--faction-singularity-term-dim)' }}
      />,
    )
    expect(dressed).toContain('color:var(--faction-singularity-term-ink)')
    expect(dressed).toContain('color:var(--faction-singularity-term-dim)')
    expect(dressed).not.toContain('var(--color-text-secondary)')
    expect(dressed).not.toContain('var(--color-text-tertiary)')
  })

  it('and the wrapper takes the surrounding spacing, which is placement', () => {
    expect(render(<FactionRow slug="coven" style={{ marginTop: 'var(--space-lg)' }} />)).toContain(
      '<div style="margin-top:var(--space-lg)">',
    )
  })

  it('still sends an unaffiliated life to the DIRECTORY, not to /factions/na', () => {
    // Behaviour, not chrome. `na` is seeded hidden, so `/factions/na` renders
    // "Faction not found" for the one population the branch exists to serve.
    expect(render(<FactionRow slug={null} />)).toContain('href="/factions"')
    expect(render(<FactionRow slug="na" />)).toContain('href="/factions"')
    expect(render(<FactionRow slug="coven" />)).toContain('href="/factions/coven"')
  })
})

describe('the destructive slot takes an ink, and defaults to the faction’s', () => {
  it('keeps today’s rendering for a mount that supplies none', () => {
    const bare = render(<DeleteCharacter slug="coven" deleting={false} onDelete={noop} />)
    expect(bare).toBe(
      render(
        <DeleteCharacter
          slug="coven"
          deleting={false}
          onDelete={noop}
          alarm={undefined}
          buttonStyle={undefined}
          panelStyle={undefined}
          promptStyle={undefined}
          cancelStyle={undefined}
        />,
      ),
    )
    expect(bare).toContain('border:1px solid var(--faction-coven-card-alarm)')
    expect(bare).toContain('color:var(--faction-coven-card-alarm)')
  })

  it('still reads the alarm off the character’s own faction when none is given', () => {
    // The `na` default, which is the one every unaffiliated life gets.
    expect(render(<DeleteCharacter slug={null} deleting={false} onDelete={noop} />)).toContain(
      'var(--faction-default-card-alarm)',
    )
  })

  it('takes the ink an archetype re-measured on its own sheet', () => {
    // S.N.I.D.E.'s case: `-card-alarm` is 1.24:1 on the wall and `-wall-alarm`
    // is 5.13:1, which it had to reach by repointing a token on a wrapper root
    // because this control took no ink.
    const dressed = render(
      <DeleteCharacter
        slug="snide"
        deleting={false}
        onDelete={noop}
        alarm="var(--faction-snide-wall-alarm)"
      />,
    )
    expect(dressed).toContain('var(--faction-snide-wall-alarm)')
    expect(dressed).not.toContain('var(--faction-snide-card-alarm)')
  })

  it('lets the outline keep its own geometry and face', () => {
    expect(
      render(
        <DeleteCharacter
          slug="ua"
          deleting={false}
          onDelete={noop}
          buttonStyle={{ borderRadius: 0 }}
        />,
      ),
    ).toContain('border-radius:0')
  })
})

describe('the confirm branch, which no click can reach without a DOM', () => {
  it('spreads each supplied style LAST, so the archetype wins', () => {
    for (const pair of [
      '...confirmPanel',
      '...panelStyle',
      '...confirmPrompt, ...promptStyle',
      '...confirmCancel, ...cancelStyle',
    ]) {
      expect(SOURCE, `the confirm branch no longer carries ${pair}`).toContain(pair)
    }
    // Order matters and a `toContain` on two names in one object literal is the
    // only place it can be read: default first, prop second.
    expect(SOURCE.indexOf('...confirmPanel')).toBeLessThan(SOURCE.indexOf('...panelStyle'))
  })

  it('leaves the filled DELETE key with no seam over it (ADR-0061)', () => {
    // A ground and its ink rather than type on a wash. The 2026-08-27 ruling is
    // explicit, and this is the assertion that a later "just one more prop"
    // has to argue with.
    expect(SOURCE).toContain('style={confirmDelete}')
    expect(SOURCE).toContain("background: 'var(--color-danger)'")
    expect(SOURCE).toContain("color: 'var(--color-on-danger)'")
    expect(SOURCE).not.toContain('...confirmDelete')
  })

  it('takes the alarm from the faction unless one is handed in', () => {
    expect(SOURCE).toContain(
      "suppliedAlarm ?? factionCssVar(slug ?? UNAFFILIATED_FACTION_SLUG, 'card-alarm')",
    )
  })
})
