/**
 * The composer's five overlays escape `ShellContent`'s stacking context via
 * `drawAtRoot` (#2244; same trap as #1591), else the mobile chrome paints over them.
 *
 * Seam (as `sheetsEscapeShell.test.tsx`): `react-dom/server` refuses portals, so
 * "portals when a document exists" = the static render throws; no document = inline markup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import '../../i18n'
import type { EditPraxisState } from '../../pages/editPraxis/useEditPraxis'
import { anEditPraxisState } from '../../test/fixtures'
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

/** The smallest portal container: `isValidContainer` reads only `nodeType`. */
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
  return anEditPraxisState({
    metatasks: [ROW],
    canSealMetatask: true,
    metataskPickerOpen: true,
    ...partial,
  })
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
    // A seal preview mounts a `<Link>` (#2648).
    () =>
      renderToStaticMarkup(
        <MemoryRouter>
          <MetataskPicker {...mkState({})} />
        </MemoryRouter>,
      ),
  ],
  [
    'MetataskRemoveConfirm',
    () =>
      renderToStaticMarkup(
        <MetataskRemoveConfirm {...mkState({ metataskRemovalTarget: ROW })} />,
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
    // Over the tab bar now, so the panel must hold the safe-area gap itself.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MetataskPicker {...mkState({})} />
      </MemoryRouter>,
    )
    expect(html).toContain('env(safe-area-inset-bottom)')
  })
})
