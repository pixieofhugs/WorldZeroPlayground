/**
 * #2161 — the two props the delete-account confirm added to the shared dialog.
 *
 * SEAM: `ConfirmDialog` itself, statically rendered. The card that mounts it
 * cannot open its own dialog in this harness (`renderToStaticMarkup` runs no
 * effects and dispatches no events), so the contract that matters — a
 * destructive button that is genuinely disabled until the caller says
 * otherwise, and a slot whose content lands INSIDE the panel rather than beside
 * it — is asserted here, on the component that owns both.
 *
 * `disabled` and not merely `aria-disabled`: this is the one control in the app
 * where a click that gets through is unrecoverable, so it must be inert to the
 * browser, not only to a screen reader. That is the opposite of the Appearance
 * switch's rule next door, and deliberately so — that control stays in the tab
 * order because it has something to explain; this one has nothing to say until
 * the reader has typed their address.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import ConfirmDialog from '../ConfirmDialog'

const REQUEST = {
  kind: 'delete-account',
  title: 'Delete your account',
  body: 'Type pilgrim@example.com below to confirm.',
  confirmLabel: 'Delete account',
  danger: true,
}

function markup(props: { confirmDisabled?: boolean } = {}): string {
  return renderToStaticMarkup(
    <ConfirmDialog
      request={REQUEST}
      factionSlug={null}
      onConfirm={() => {}}
      onDismiss={() => {}}
      {...props}
    >
      <p>This ends WZ Pilgrim, and 2 other lives.</p>
    </ConfirmDialog>,
  )
}

const accept = (html: string) =>
  /<button[^>]*data-testid="confirm-accept"[^>]*>/.exec(html)?.[0] ?? ''

describe('the held confirm', () => {
  it('renders the affirmative button genuinely disabled when asked', () => {
    expect(accept(markup({ confirmDisabled: true }))).toMatch(/\sdisabled(=|\s|>)/)
  })

  it('paints it with the repo disabled state rather than the live destructive fill', () => {
    expect(
      accept(markup({ confirmDisabled: true })),
      '.control-off is the only rule that says what disabled looks like',
    ).toContain('control-off')
  })

  it('leaves it live by default, so the composer confirms are unchanged', () => {
    expect(accept(markup())).not.toMatch(/\sdisabled(=|\s|>)/)
  })
})

describe('the content slot', () => {
  it('renders inside the panel, so it is inside the trap and the description', () => {
    const html = markup()
    const panel = html.indexOf('data-testid="confirm-dialog"')
    const slot = html.indexOf('This ends WZ Pilgrim')
    const footer = html.indexOf('data-testid="confirm-accept"')
    expect(panel).toBeGreaterThan(-1)
    expect(slot).toBeGreaterThan(panel)
    expect(slot, 'the slot sits above the footer, not after it').toBeLessThan(footer)
  })

  it('renders nothing extra when no caller passes one', () => {
    const bare = renderToStaticMarkup(
      <ConfirmDialog
        request={REQUEST}
        factionSlug={null}
        onConfirm={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(bare).not.toContain('This ends')
  })
})
