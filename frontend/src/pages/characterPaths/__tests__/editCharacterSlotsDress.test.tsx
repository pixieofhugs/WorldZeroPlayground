/**
 * The dress an archetype hands the two edit-only slots (#2956).
 *
 * A supplied dress wins (props spread last); a mount that supplies none renders
 * the literal defaults, since drift there repaints every mount and `na` /
 * Albescent have no dress to notice with. The confirm branch needs a click, so
 * it is pinned as source; the filled DELETE key has no seam by ruling (ADR-0061).
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
          promptStyle={undefined}
        />,
      ),
    )
    // Literal defaults, measured by the wow/singularity edit guards.
    expect(bare).toContain('color:var(--color-text-secondary)')
    expect(bare).toContain('background:var(--color-bg-surface-alt)')
    expect(bare).toContain('border:1px solid var(--color-border-strong)')
    expect(bare).toContain('color:var(--color-text-tertiary)')
    expect(bare.startsWith('<div><span style=')).toBe(true)
  })

  it('lets the archetype repaint the plate, which is the ground-dependent half', () => {
    // WoW: the default well reads 1.06:1 on the charter sheet.
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
    // Singularity: four sites over three tiers, hence named props, not one `slotStyle`.
    const dressed = render(
      <FactionRow
        slug="singularity"
        labelStyle={{ color: 'var(--faction-singularity-term-ink)' }}
        rowStyle={{ color: 'var(--faction-singularity-term-ink)' }}
        chevronStyle={{ color: 'var(--faction-singularity-term-dim)' }}
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
    // `na` is seeded hidden, so `/factions/na` 404s.
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
    expect(render(<DeleteCharacter slug={null} deleting={false} onDelete={noop} />)).toContain(
      'var(--faction-default-card-alarm)',
    )
  })

  it('takes the ink an archetype re-measured on its own sheet', () => {
    // S.N.I.D.E.: `-card-alarm` is 1.24:1 on the wall, `-wall-alarm` 5.13:1.
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
    // Default first, prop second.
    expect(SOURCE.indexOf('...confirmPanel')).toBeLessThan(SOURCE.indexOf('...panelStyle'))
  })

  it('leaves the filled DELETE key with no seam over it (ADR-0061)', () => {
    // A ground and its ink; a prop that could carry an ink could repaint the pair.
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
