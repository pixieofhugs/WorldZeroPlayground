/**
 * #1082 — the composer's confirms, as copy and as a dialog.
 *
 * These consequences were unassertable while they lived inside
 * `window.confirm`: the harness never saw the string, and nothing stopped the
 * three collab exits from drifting into one generic "are you sure". So the
 * table below pins each case against the rule it is describing:
 *
 *  - **delete** destroys the whole praxis with every member's part in it
 *    (`delete_praxis`, creator-only), and reuses #1074's existing three keys
 *    rather than a second set;
 *  - **leave** costs the crew nothing — except at two members, where ADR-0060
 *    converts the praxis to solo for whoever stays, and at one, where there is
 *    nobody to carry on;
 *  - **kick** clears EVERY member's cast, the kicker's included (ADR-0013), and
 *    is only offered while the collab is still open (#1076);
 *  - **re-open** cancels the publish window and clears every cast the moment
 *    the edit is saved (ADR-0012);
 *  - the mode-switch and dissolve-duel confirms name their own losses.
 *
 * NOT COVERED HERE — this harness is `renderToStaticMarkup` with no DOM and no
 * effects, so Escape-to-dismiss, backdrop-to-dismiss, the opening focus move
 * and the Tab cycle cannot run. What is asserted is the static contract they
 * hang off: the dialog role, the accessible name and description wiring, and
 * the rendered words for each case. The behaviours are hand-verified.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import forms from '../../../locales/en/forms.json'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
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
    // Leaving costs nobody else their work, so it is not painted destructive.
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
    // Shared-tier mechanics copy, so it reads in the domain noun (#1154) — and
    // the noun is APPROVAL since ADR-0079 split `has_submitted`'s three jobs.
    expect(request.body).toMatch(/every approval/i)
    // #1076 restricted kicking to in_progress/pending, and the roster hides the
    // × on a submitted collab — so the copy must not offer to unpublish one.
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
    // The act has two consequences and the dialog must state both: the draft
    // goes (as the plain drop always said) AND the challenge ends. The plain
    // `dropTaskConfirm` stated only the first, and the delete it promised was
    // then refused by the duel FKs.
    expect(request.title).toMatch(/duel/i)
    expect(request.body).toMatch(/duel/i)
    expect(request.body).toMatch(/draft/i)
    // What happens to the other player is a consequence of some drops only,
    // so it rides in the note — the same slot `leaveCollabConfirm` uses.
    expect(request.note).toMatch(/opponent/i)
    expect(request.note).toMatch(/solo/i)
    // NOT a forfeit: that exists only at `settled` (ADR-0011 §Forfeit), and
    // the word was rejected in #718 and #1071 decision 3. Cancelling at
    // compose stage costs neither side anything, so the copy may only ever use
    // the word to deny it — exactly as `dissolveDuelConfirm` does.
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
      // A confirm that only says "are you sure" is the thing this replaced.
      expect(request.body.trim().length).toBeGreaterThan(20)
    }
  })

  it('resolves collab wording through collabCopy, so a faction may override it', () => {
    // Nothing overrides these today (they are SHARED_DEFAULT_COLLAB_KEYS), but
    // the resolver is what a faction override would land on — an unknown slug
    // must still come back with the shared words, never a raw key.
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
    // The name and description must point at elements this dialog renders —
    // an aria-labelledby naming nothing is worse than no name at all.
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
    // Dismissal is a real, named control, not just a backdrop click.
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
    // Same dialog, two chromes: the phone gets the bottom sheet.
    expect(mobile).not.toBe(desktop)
  })
})
