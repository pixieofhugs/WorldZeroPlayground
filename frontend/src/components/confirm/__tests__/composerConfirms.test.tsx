/**
 * #1082 — the composer's confirms, as copy and as a dialog. Each case is pinned
 * against its own consequence. No DOM, so Escape/backdrop/focus behaviour is
 * hand-verified; only the static a11y contract is asserted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import forms from '../../../locales/en/forms.json'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import ConfirmDialog from '../ConfirmDialog'
import {
  deleteCollabConfirm,
  dissolveDuelConfirm,
  dropDuelSideConfirm,
  dropTaskConfirm,
  duelDropsCoauthorsConfirm,
  kickMemberConfirm,
  leaveCollabConfirm,
  modeSwitchConfirm,
  reopenForEditConfirm,
  type ConfirmRequest,
} from '../composerConfirms'

const collab = forms.editPraxis.collab

function markup(request: ConfirmRequest): string {
  return renderToStaticMarkup(
    <ConfirmDialog
      request={request}
      factionSlug="coven"
      onConfirm={() => {}}
      onDismiss={() => {}}
    />,
  )
}

function text(request: ConfirmRequest): string {
  return markup(request)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

describe('composer confirms — each names its own consequence', () => {
  it('delete says the whole crew loses its work, and reuses #1074’s copy', () => {
    const request = deleteCollabConfirm('coven')
    expect(request.body).toBe(collab.deleteConfirm)
    expect(request.confirmLabel).toBe(collab.deleteAction)
    expect(request.danger).toBe(true)
    expect(request.body).toMatch(/everyone/i)
  })

  it('drop (no crew at stake) does not borrow the delete warning', () => {
    const request = dropTaskConfirm()
    expect(request.body).not.toBe(collab.deleteConfirm)
    expect(request.body).not.toMatch(/everyone|other members/i)
  })

  it('leave says the crew carries on — it is not a delete', () => {
    const request = leaveCollabConfirm('coven', 3)
    expect(request.body).toMatch(/carry on/i)
    expect(request.body).not.toMatch(/destroy/i)
    expect(request.danger).toBe(false)
    expect(request.note).toBeUndefined()
  })

  it('leave at two members says the praxis converts to solo (ADR-0060)', () => {
    const request = leaveCollabConfirm('coven', 2)
    expect(request.note).toBe(collab.leaveConfirmSolo)
    expect(request.note).toMatch(/solo/i)
  })

  it('leave as the last member says it drops the praxis (ADR-0060)', () => {
    const request = leaveCollabConfirm('coven', 1)
    expect(request.note).toBe(collab.leaveConfirmLast)
    expect(request.note).toMatch(/drop/i)
  })

  it('kick names the member and says every approval is cleared (ADR-0013)', () => {
    const request = kickMemberConfirm('coven', 'Bramblewick')
    expect(request.title).toContain('Bramblewick')
    expect(request.body).toContain('Bramblewick')
    // Domain noun (#1154): APPROVAL since ADR-0079.
    expect(request.body).toMatch(/every approval/i)
    // Kicking is only possible pre-submit (#1076).
    expect(request.body).not.toMatch(/unpublish|take it down/i)
  })

  it('re-opening your part says it clears everyone’s cast once saved', () => {
    const request = reopenForEditConfirm('coven')
    expect(request.body).toBe(collab.awaitingEditConfirm)
    expect(request.confirmLabel).toBe(collab.awaitingEditAction)
  })

  it('dissolving a duel says it ends for both sides with no forfeit', () => {
    const request = dissolveDuelConfirm()
    expect(request.body).toMatch(/both of you/i)
    expect(request.body).toMatch(/no forfeit/i)
  })

  it('dropping a duel side names the duel and the opponent, not a forfeit (#1831)', () => {
    const request = dropDuelSideConfirm()
    expect(request.title).toMatch(/duel/i)
    expect(request.body).toMatch(/duel/i)
    expect(request.body).toMatch(/draft/i)
    expect(request.note).toMatch(/opponent/i)
    expect(request.note).toMatch(/solo/i)
    // Not a forfeit (ADR-0011 §Forfeit, #718): the word may only appear denied.
    expect(`${request.title} ${request.body} ${request.note}`).not.toMatch(
      /(?<!no )forfeit/i,
    )
  })

  it('gives every case its own words', () => {
    const requests = [
      dropTaskConfirm(),
      dropDuelSideConfirm(),
      deleteCollabConfirm(null),
      leaveCollabConfirm(null, 3),
      kickMemberConfirm(null, 'Bramblewick'),
      reopenForEditConfirm(null),
      dissolveDuelConfirm(),
      duelDropsCoauthorsConfirm(),
      modeSwitchConfirm('solo', 'collab', 2, false)!,
      modeSwitchConfirm('collab', 'solo', 1, true)!,
    ]
    expect(new Set(requests.map((r) => r.kind)).size).toBe(requests.length)
    expect(new Set(requests.map((r) => r.body)).size).toBe(requests.length)
    for (const request of requests) {
      expect(request.title.trim()).not.toBe('')
      expect(request.confirmLabel.trim()).not.toBe('')
      expect(request.body.trim().length).toBeGreaterThan(20)
    }
  })

  it('resolves collab wording through collabCopy, so a faction may override it', () => {
    // An unknown slug must still get the shared words, never a raw key.
    expect(leaveCollabConfirm('not-a-faction', 3).body).toBe(collab.leaveConfirm)
    expect(kickMemberConfirm(undefined, 'Bramblewick').confirmLabel).toBe(
      collab.kickAction,
    )
  })
})

describe('ConfirmDialog — the static half of the accessibility contract', () => {
  it('is a labelled, described, modal dialog', () => {
    const html = markup(deleteCollabConfirm('coven'))
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1]
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1]
    expect(labelledBy).toBeTruthy()
    expect(describedBy).toBeTruthy()
    expect(html).toContain(`id="${labelledBy}"`)
    expect(html).toContain(`id="${describedBy}"`)
    expect(labelledBy).not.toBe(describedBy)
  })

  it('renders the title, the consequence and both named buttons', () => {
    const request = leaveCollabConfirm('coven', 2)
    const rendered = text(request)
    expect(rendered).toContain(request.title)
    expect(rendered).toContain(request.body)
    expect(rendered).toContain(request.note)
    expect(rendered).toContain(request.confirmLabel)
    expect(rendered).toContain(forms.editPraxis.confirm.dismiss)
  })

  it('puts the dismiss button before the affirmative one (#646 footer order)', () => {
    const request = deleteCollabConfirm('coven')
    const rendered = text(request)
    expect(rendered.indexOf(forms.editPraxis.confirm.dismiss)).toBeLessThan(
      rendered.lastIndexOf(request.confirmLabel),
    )
  })

  it('draws on both form factors', () => {
    mocks.formFactor = 'mobile'
    const mobile = markup(dropTaskConfirm())
    mocks.formFactor = 'desktop'
    const desktop = markup(dropTaskConfirm())
    for (const html of [mobile, desktop]) {
      expect(html).toContain('role="dialog"')
      expect(html).toContain(forms.editPraxis.confirm.dropTaskAction)
    }
    expect(mobile).not.toBe(desktop)
  })
})
