/**
 * Mobile composer UA dispatch + rendered identity (#525, #852).
 *
 * The registry half asserts the mobile map resolves a `ua` task to the bespoke
 * UA "Seal a praxis" composer and that everything else falls through to
 * Default. The rendered half asserts the MARKUP now the salon is dead (#788): the ensō at the head,
 * NO mandala (§5 puts the editor in the `absent` bucket), and no gold.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../../i18n'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import UAMobileEditPraxis from '../UaComposer'
import SnideMobileEditPraxis from '../SnideComposer'
import type { EditPraxisState } from '../../useEditPraxis'
import type { PraxisOut } from '../../../../api/praxis'
import type { TaskOut } from '../../../../api/tasks'

describe('mobile composer UA dispatch', () => {
  it('mobile + a UA task resolves to the bespoke UA composer', () => {
    expect(pickVariant(surfaceMap('mobileEditPraxis'), 'ua', DefaultMobileEditPraxis)).toBe(
      UAMobileEditPraxis,
    )
  })

  it('mobile + a S.N.I.D.E. task resolves to the bespoke SNIDE composer', () => {
    expect(pickVariant(surfaceMap('mobileEditPraxis'), 'snide', DefaultMobileEditPraxis)).toBe(
      SnideMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileEditPraxis'), slug, DefaultMobileEditPraxis)).toBe(
        DefaultMobileEditPraxis,
      )
    }
  })
})

const praxis = {
  id: 55,
  task_id: 7,
  task_title: 'Render the old library façade in charcoal',
  type: 'solo',
  status: 'in_progress',
  title: 'Charcoal study, north portico',
  body_text: 'Let the cornice go soft.',
  moderation_status: 'visible',
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut

const task: TaskOut = {
  id: 7,
  title: 'Render the old library façade in charcoal',
  description: 'Draw only what the light is doing.',
  point_value: 30,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: 'ua',
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: '2026-01-01T00:00:00Z',
  can_submit_praxis: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

function baseState(): EditPraxisState {
  return {
    loading: false,
    praxis,
    task,
    error: '',
    setError: () => {},
    title: 'Charcoal study, north portico',
    setTitle: () => {},
    body: 'Let the cornice go soft.',
    setBody: () => {},
    wordCount: 5,
    media: [],
    fileError: '',
    handleFileChange: () => {},
    removeMedia: async () => {},
    pendingImage: null,
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: '',
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    sendInvite: async () => {},
    cancelInvite: async () => {},
    kickMember: async () => {},
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    metaTasks: [],
    appliedMetatasks: new Set(),
    applyingMetatask: null,
    toggleMetatask: async () => {},
    appliedMetataskList: [],
    addMetatask: async () => {},
    metataskPickerOpen: false,
    openMetataskPicker: () => {},
    closeMetataskPicker: () => {},
    metataskRemovalTarget: null,
    requestRemoveMetatask: () => {},
    confirmRemoveMetatask: async () => {},
    cancelRemoveMetatask: () => {},
    submitting: false,
    publish: async () => {},
    pullBack: async () => {},
    leaveCollab: async () => {},
    collabSuccess: false,
    continueFromCollabSuccess: () => {},
    duelSealOpen: false,
    requestDuelSeal: () => {},
    cancelDuelSeal: () => {},
    cancel: async () => {},
    autosaveAt: null,
    saveStatus: 'idle',
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: false,
    canSealMetatask: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 3,
  }
}

function render(): { html: string; text: string } {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <UAMobileEditPraxis state={baseState()} />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('UA mobile composer — what it draws', () => {
  it('heads the form with the ensō', () => {
    const { html } = render()
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    expect(html).toContain('/factionMarks/enso.svg')
    expect(html).toContain('var(--faction-ua-glow)')
  })

  it('draws NO mandala — §5 puts the editor in the absent bucket', () => {
    const { html } = render()
    // The mandala's outer guide circle; the ensō draws no such hairline stroke.
    expect(html).not.toContain('stroke-width="0.6"')
  })

  it('keeps its slots: the task reference, the title and the body', () => {
    const { html, text } = render()
    expect(text).toContain('Render the old library façade in charcoal')
    expect(html).toContain('Charcoal study, north portico')
    expect(html).toContain('Let the cornice go soft.')
  })

  it('carries no gold: the legacy --ua-* palette and Cinzel are gone here', () => {
    const { html } = render()
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
    expect(html).not.toMatch(/--font-faction-engraved/)
  })
})
