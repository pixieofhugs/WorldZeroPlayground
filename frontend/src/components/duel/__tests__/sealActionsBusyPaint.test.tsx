/**
 * `SealActions`' busy commit drops its paint for `.control-off` instead of
 * fading (#3011, #2486): opacity loses contrast twice. `.control-off` rides
 * unconditionally (it acts only under `:disabled`), so assert `paintedOff()`
 * live vs busy, not a bare `toContain`. Theme-invariant skins wire
 * `confirmClassName` one layer up, so they're rendered directly below.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { SealActions, type DuelSlotTheme } from '../shared'
import { readIndexCss } from '../../../test/indexCss'
import { readThemes, resolveVar } from '../../../utils/__tests__/cssVars'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'

const THEME: DuelSlotTheme = { accent: 'var(--color-accent)' }

function commitTag(busy: boolean, danger: boolean, confirmClassName?: string): string {
  const html = renderToStaticMarkup(
    <SealActions
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      danger={danger}
      theme={THEME}
      confirmClassName={confirmClassName}
    />,
  )
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

const paintedOff = (tag: string): boolean =>
  tag.includes('disabled=""') && tag.includes('control-off')

describe('the duel commit drops its paint instead of fading while busy (#2486)', () => {
  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — is not painted off live, and is painted off while busy', (_name, danger) => {
    const live = commitTag(false, danger)
    const busy = commitTag(true, danger)
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
    expect(busy, 'the shared button chrome survives').toContain('btn-primary')
  })

  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — declares no inline opacity while busy', (_name, danger) => {
    const tag = commitTag(true, danger)
    expect(tag, 'no fade on the CTA').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
  })

  it('carries an optional confirmClassName alongside .control-off, never instead of it', () => {
    const live = commitTag(false, false, 'sg-control-off')
    const busy = commitTag(true, false, 'sg-control-off')
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
    expect(busy, 'the caller class rides alongside').toContain('sg-control-off')
    expect(busy, 'the shared button chrome survives').toContain('btn-primary')
  })
})

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    reads_the_array: false,
    takes_duel_ties: false,
  }
}

const CONFIG = {
  factions: [faction('singularity', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

const { default: SingularityDuelSealConfirm } = await import('../SingularityDuelSealConfirm')

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'singularity',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  } as DuelSideOut
}

const DUEL = {
  id: 5,
  status: 'active',
  forfeited_by_character_id: null,
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'singularity' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

function singularityCommitTag(busy: boolean): string {
  const html = renderToStaticMarkup(
    <SingularityDuelSealConfirm
      duel={DUEL}
      viewerCharacterId={1}
      taskPointValue={60}
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      mode="submit"
    />,
  )
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

describe('the Singularity duel commit does not take the house neutral (#3011, review of #3068)', () => {
  it('wears .sg-control-off alongside .control-off, only while busy', () => {
    const live = singularityCommitTag(false)
    const busy = singularityCommitTag(true)
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
    expect(busy, "the Singularity's own repoint rides alongside").toContain('sg-control-off')
  })
})

const { default: SnideDuelSealConfirm } = await import('../SnideDuelSealConfirm')

const SNIDE_DUEL = {
  ...DUEL,
  challenger: side({ character_id: 1, display_name: 'Rax', faction_slug: 'snide' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Ada', faction_slug: 'singularity' }),
} as unknown as DuelDetailOut

function snideHtml(busy: boolean, mode: 'submit' | 'forfeit'): string {
  return renderToStaticMarkup(
    <SnideDuelSealConfirm
      duel={SNIDE_DUEL}
      viewerCharacterId={1}
      taskPointValue={60}
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      mode={mode}
    />,
  )
}

function tagOf(html: string): string {
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

describe('the S.N.I.D.E. seal and forfeit buttons (#3090)', () => {
  it.each(['submit', 'forfeit'] as const)(
    '%s — busy wears .control-off and .snd-control-off, no fade',
    (mode) => {
      const live = tagOf(snideHtml(false, mode))
      const busy = tagOf(snideHtml(true, mode))
      expect(paintedOff(live), 'not painted off live').toBe(false)
      expect(paintedOff(busy), 'painted off while busy').toBe(true)
      expect(busy).toContain('snd-control-off')
      expect(busy, 'no inline opacity').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
    },
  )

  it('scopes the paint with a wrapper; the forfeit form opts out of the acid confirm', () => {
    expect(snideHtml(false, 'submit')).toMatch(/class="snd-seal-actions"/)
    expect(snideHtml(false, 'forfeit')).toMatch(/class="snd-seal-actions snd-seal-danger"/)
  })

  it('idle paint is theme-invariant S.N.I.D.E. tokens, and the busy `!important` still wins', () => {
    const css = readIndexCss()
    const body = (sel: string) => {
      const at = css.indexOf(sel + ' {')
      expect(at, sel).toBeGreaterThan(-1)
      return css.slice(at, css.indexOf('}', at))
    }
    const confirm = body('.snd-seal-actions:not(.snd-seal-danger) .btn-primary:not(:disabled)')
    expect(confirm).toContain('background: var(--faction-snide-acid)')
    expect(confirm).toContain('color: var(--faction-snide-ink)')
    expect(confirm).toContain('3px 3px 0 var(--faction-snide-pink)')
    const cancel = body('.snd-seal-actions .btn-outline')
    expect(cancel).toContain('background: transparent')
    expect(cancel).toContain('color: var(--faction-snide-paper)')
    expect(cancel).toContain('border-color: var(--faction-snide-card-muted)')
    const themes = readThemes(css)
    for (const t of ['acid', 'ink', 'paper', 'pink', 'ink-raised', 'card-muted']) {
      const light = resolveVar(`--faction-snide-${t}`, 'light', themes)
      expect(light, `--faction-snide-${t} resolves`).not.toBeNull()
      if (t !== 'card-muted') {
        // card-muted differs by theme; both clear 4.5:1.
        expect(resolveVar(`--faction-snide-${t}`, 'dark', themes), t).toBe(light)
      }
    }
    const off = body('.control-off:disabled')
    expect(off).toMatch(/background:[^;]*!important/)
    expect(off).toMatch(/color:[^;]*!important/)
    expect(off).toMatch(/box-shadow:[^;]*!important/)
  })
})

describe('the hover arm does not reopen the fade `.control-off:disabled` just closed', () => {
  it('.btn-primary:hover is guarded by :not(:disabled)', () => {
    // Hover opacity would re-fade a busy commit. Source text: no DOM to hover.
    const css = readIndexCss()
    const rule = /\.btn-primary:hover(:not\(:disabled\))?\s*\{/.exec(css)
    expect(rule, '.btn-primary:hover exists').not.toBeNull()
    expect(rule![1], '.btn-primary:hover is guarded by :not(:disabled)').toBe(':not(:disabled)')
  })
})
