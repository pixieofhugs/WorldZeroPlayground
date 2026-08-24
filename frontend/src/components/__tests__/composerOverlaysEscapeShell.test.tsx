/**
 * The composer's five full-screen overlays escape the shell's stacking context
 * (#2244, the same trap #1591 named for the two bottom sheets).
 *
 * WHAT THE DEFECT ACTUALLY IS
 * ---------------------------
 * #2244 reads as "the option to add a meta task is buried on Mobile", and the
 * screenshot shows the metatask picker with its title cut off behind the mobile
 * header and its footer — the line naming the pending choice, and Attach itself
 * — cut off behind the tab bar. Nothing in the picker is below a fold: it is
 * `position: fixed; inset: 0`, so it is exactly the viewport. It is UNDER the
 * chrome.
 *
 * `ShellContent`'s mobile region is `position: relative` + `z-index: 5`, which
 * opens a stacking context. Every overlay rendered from page content therefore
 * composites at 5 whatever it declares for itself, and `MobileHeader` /
 * `MobileTabBar` sit at 10 in the ROOT context — so they paint over it and stay
 * tappable behind its scrim. `drawAtRoot` is the escape this repo already
 * settled on; the composer's overlays simply never got it.
 *
 * All five are mounted from `EditPraxis` (`ImageEditModal` also from the two
 * character screens), all five are `fixed inset-0 z-50`, and all five were
 * capped. One helper each, so the sweep is the fix and not five fixes.
 *
 * SEAM, AND WHAT IT CANNOT PROVE
 * ------------------------------
 * Identical to `sheetsEscapeShell.test.tsx`: the harness is
 * `renderToStaticMarkup` in node with no DOM, so "is the Attach button inside
 * the visible viewport" is not measurable here and never will be — see the
 * ruling on #2244. What IS mechanically checkable is the thing the fix turns
 * on. `react-dom/server` REFUSES to render a portal, so "this component portals
 * when a document exists" reads as the static render throwing the server
 * renderer's own portal error, and the mirror case — no document, markup comes
 * back inline — is what keeps every other suite's assertions working.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import '../../i18n'
import type { EditPraxisState } from '../../pages/editPraxis/useEditPraxis'
import type { TaskOut } from '../../api/tasks'
import type { PraxisMemberOut } from '../../api/praxis'

const formFactorMock = vi.fn(() => 'mobile')
vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => formFactorMock(),
}))

import MetataskPicker from '../metataskSeal/MetataskPicker'
import MetataskRemoveConfirm from '../metataskSeal/MetataskRemoveConfirm'
import { CollabSuccess } from '../collab/CollabSuccess'
import DuelSealSheet from '../duel/DuelSealSheet'
import ImageEditModal from '../imageEdit/ImageEditModal'

/**
 * The smallest thing React accepts as a portal container: `isValidContainer`
 * reads `nodeType`, nothing more. A real Element would need jsdom.
 */
const FAKE_BODY = { nodeType: 1 } as unknown as HTMLElement

function withDocument<T>(run: () => T): T {
  vi.stubGlobal('document', { body: FAKE_BODY })
  try {
    return run()
  } finally {
    vi.unstubAllGlobals()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  formFactorMock.mockReturnValue('mobile')
})

function metatask(id: number, slug: string, title: string): TaskOut {
  return {
    id,
    title,
    description: `${title} — do the extra thing`,
    point_value: 10,
    level_required: 0,
    status: 'active',
    task_type: 'metatask',
    created_by: 1,
    primary_faction_slug: 'na',
    metatask_faction_slug: slug,
    created_at: '2026-01-01T00:00:00Z',
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    can_sign_up: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    start_here: false,
  } as unknown as TaskOut
}

const ROW = metatask(1, 'wow', 'Googly Eyes')

function mkState(partial: Partial<EditPraxisState>): EditPraxisState {
  return {
    metatasks: [ROW],
    appliedMetatasks: new Set<number>(),
    appliedMetataskList: [],
    applyingMetatask: null,
    canSealMetatask: true,
    metataskPickerOpen: true,
    metataskRemovalTarget: null,
    addMetatask: async () => {},
    openMetataskPicker: () => {},
    closeMetataskPicker: () => {},
    requestRemoveMetatask: () => {},
    confirmRemoveMetatask: async () => {},
    cancelRemoveMetatask: () => {},
    ...partial,
  } as unknown as EditPraxisState
}

const MEMBERS: PraxisMemberOut[] = [
  { id: 1, character_id: 1, has_cast: true },
  { id: 2, character_id: 2, has_cast: true },
] as unknown as PraxisMemberOut[]

/** A `File` with no bytes; the modal only reads it inside an effect. */
const FILE = new File([], 'shot.png', { type: 'image/png' })

/** Every overlay the composer raises from inside the shell's content band. */
const OVERLAYS: [name: string, render: () => string][] = [
  [
    'MetataskPicker',
    // The picker dresses its rows with read-only seals, and a seal's masthead
    // band is an anchor since #2562 — hence the router around this one overlay.
    () =>
      renderToStaticMarkup(
        <MemoryRouter>
          <MetataskPicker state={mkState({})} />
        </MemoryRouter>,
      ),
  ],
  [
    'MetataskRemoveConfirm',
    () =>
      renderToStaticMarkup(
        <MetataskRemoveConfirm state={mkState({ metataskRemovalTarget: ROW })} />,
      ),
  ],
  [
    'CollabSuccess',
    () =>
      renderToStaticMarkup(
        <CollabSuccess
          members={MEMBERS}
          currentCharacterId={1}
          factionSlug="coven"
          taskPointValue={20}
          onContinue={() => {}}
        />,
      ),
  ],
  [
    'DuelSealSheet',
    () =>
      renderToStaticMarkup(
        <DuelSealSheet label="Seal" ground={{}}>
          <p>body</p>
        </DuelSealSheet>,
      ),
  ],
  [
    'ImageEditModal',
    () =>
      renderToStaticMarkup(
        <ImageEditModal file={FILE} onConfirm={() => {}} onCancel={() => {}} />,
      ),
  ],
]

describe.each(OVERLAYS)('%s', (_name, render) => {
  it('portals — the shell can no longer cap it under the header and tab bar', () => {
    expect(() => withDocument(render)).toThrow(/[Pp]ortal/)
  })

  it('still renders its markup inline in the DOM-less harness', () => {
    const html = render()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })

  it('portals on the desktop too — one overlay, not a form-factor twin', () => {
    formFactorMock.mockReturnValue('desktop')
    expect(() => withDocument(render)).toThrow(/[Pp]ortal/)
  })
})

describe('MetataskPicker on a phone', () => {
  it('clears the home indicator, since it now covers the tab bar outright', () => {
    // Portalled, the sheet paints over `MobileTabBar` instead of under it — so
    // the bar's own `env(safe-area-inset-bottom)` no longer protects Attach.
    // The panel has to hold that gap itself or the confirm row sits under the
    // home indicator on every notched phone.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MetataskPicker state={mkState({})} />
      </MemoryRouter>,
    )
    expect(html).toContain('env(safe-area-inset-bottom)')
  })
})
