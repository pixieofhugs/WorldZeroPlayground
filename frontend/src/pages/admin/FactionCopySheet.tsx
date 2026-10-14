/**
 * The faction copy sheet (`/admin/copy/:slug`) — every surface one faction owns,
 * stacked on one scrolling page, so the live copy editor can reach all of its
 * wording in one place.
 *
 * It adds NO editing mechanism. Turn on admin mode, press the editor's "edit
 * copy" control, and click any string: `CopyEditor` resolves it through the same
 * `copyRegistry` it uses on every other page. This page's whole job is to put the
 * surfaces on screen — including the popups, which only ever exist for a moment
 * in the live app.
 *
 * Surfaces resolve through `surfaceMap(<key>)` by SLUG, so another faction is a
 * different URL, not a rewrite. A surface the faction does not override renders
 * na's `Default*` row, exactly as the live app would draw it.
 *
 * TWO SAFETY RULES
 * ----------------
 * 1. Nothing here may write. Every handler in the fixtures is a no-op, and the
 *    sheet root swallows clicks and submits in the capture phase whenever the
 *    copy editor is NOT armed (when it is armed, its own document-level capture
 *    listener has already stopped the event). Without that, a stray press on the
 *    invitation letter's ENLIST would really join a faction.
 * 2. Popups sit INLINE, in a bounded frame. Most portal to `document.body` and
 *    are `position: fixed`; `Frame` hands them a container through
 *    `RootContainerContext` and a `transform` so their `fixed` resolves against
 *    the frame. The seam is default-off (`ui/drawAtRoot`).
 *
 * Strings that appear here but are not editable are hardcoded in a component
 * (not in a catalog) — the editor answers "not editable wording" for them.
 */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { surfaceMap, type FactionSurface } from '../../factions'
import { resolveVariant } from '../../utils/factionDispatch'
import { factionName } from '../../utils/factions'
import { RootContainerContext } from '../../components/ui/drawAtRoot'
import PageTitle from '../../components/ui/PageTitle'
import i18n from '../../i18n'
import type { ConfirmRequest } from '../../components/confirm/ConfirmDialog'
import ConfirmDialog from '../../components/confirm/ConfirmDialog'
import {
  deleteCollabConfirm,
  dissolveDuelConfirm,
  dropDuelSideConfirm,
  dropTaskConfirm,
  duelDropsCoauthorsConfirm,
  editCancelsProposalConfirm,
  kickMemberConfirm,
  leaveCollabConfirm,
  proposePublishConfirm,
  reopenForEditConfirm,
} from '../../components/confirm/composerConfirms'
import InvitationLetterPopup from '../../components/InvitationLetterPopup'
import LevelUpPopup from '../../components/LevelUpPopup'
import CharacterSwitcherSheet from '../../components/CharacterSwitcherSheet'
import { CollabSuccess } from '../../components/collab/CollabSuccess'
import FeedBankFullModal from '../../components/feed/FeedBankFullModal'
import ImageEditModal from '../../components/imageEdit/ImageEditModal'
import MetataskPicker from '../../components/metataskSeal/MetataskPicker'
import MetataskRemoveConfirm from '../../components/metataskSeal/MetataskRemoveConfirm'
import {
  characterFor,
  duelFor,
  makePraxis,
  makePraxisCard,
  metataskFor,
  mockCollaboration,
  mockComments,
  noop,
  praxisCardsFor,
  taskFor,
} from './copySheet/sheetFixtures'
import {
  createCharacterState,
  editCharacterState,
  editPraxisState,
  factionDetailState,
  fieldDeskState,
  praxisDetailState,
  profileProps,
  proposeTaskState,
  taskDetailState,
} from './copySheet/sheetState'

const anoop = async () => {}

/** A 1x1 PNG, so the crop modal has a real `File` to open without a picker. */
const PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
function aPixelFile(): File {
  const bytes = Uint8Array.from(atob(PIXEL_PNG), (c) => c.charCodeAt(0))
  return new File([bytes], 'pixel.png', { type: 'image/png' })
}

/**
 * A box whose `fixed` children are positioned against IT, not the viewport, and
 * whose portal-bound children land inside it. `{container && children}` holds
 * the content back one commit so the container is known before the first
 * overlay renders.
 */
function Frame({
  height,
  width,
  children,
}: {
  height: number | string
  width?: number | string
  children: ReactNode
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        overflow: 'hidden',
        height,
        width: width ?? '100%',
        border: '1.5px dashed var(--color-border)',
      }}
    >
      <div ref={setContainer} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <RootContainerContext.Provider value={container}>
        {container && children}
      </RootContainerContext.Provider>
    </div>
  )
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section data-sheet-surface={id} className="flex flex-col gap-3 mb-10">
      <h2 className="label-heading">{id}</h2>
      {children}
    </section>
  )
}

/** One labelled state of a surface (empty vs full, locked vs eligible…). */
function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="card-meta">{label}</p>
      {children}
    </div>
  )
}

const adminPropsFor = (praxis: ReturnType<typeof makePraxisCard>) => ({
  praxis,
  showAdminControls: false,
  onHide: noop,
  onFail: noop,
  moderateError: null,
})

/**
 * The surface sections, in reading order. A surface added to a faction manifest
 * with no entry here fails `factionCopySheet.test` — that test reads the
 * manifest, not `SURFACE_KEYS`, because a faction owns only what it declares.
 */
export const COPY_SHEET_SURFACES: ReadonlyArray<{
  key: FactionSurface
  render: (slug: string) => ReactNode
}> = [
  {
    key: 'factionSelectCard',
    render: (slug) => {
      const Card = resolveVariant(surfaceMap('factionSelectCard'), slug)
      return (
        <div className="flex flex-wrap gap-6">
          {(['locked', 'eligible', 'member'] as const).map((state) => (
            <State key={state} label={state}>
              <Card state={state} members={12} onVisit={noop} />
            </State>
          ))}
        </div>
      )
    },
  },
  {
    key: 'createCharacter',
    render: (slug) => {
      const Create = resolveVariant(surfaceMap('createCharacter'), slug)
      return <Create state={createCharacterState(slug)} />
    },
  },
  {
    key: 'editCharacter',
    render: (slug) => {
      const Edit = resolveVariant(surfaceMap('editCharacter'), slug)
      return <Edit state={editCharacterState(slug)} />
    },
  },
  {
    key: 'mobileFieldDesk',
    render: (slug) => {
      const Desk = resolveVariant(surfaceMap('mobileFieldDesk'), slug)
      return (
        <Frame height={900} width={390}>
          <Desk state={fieldDeskState(slug)} />
        </Frame>
      )
    },
  },
  {
    key: 'taskCard',
    render: (slug) => {
      const Card = resolveVariant(surfaceMap('taskCard'), slug)
      return (
        <div className="flex flex-wrap gap-6">
          <State label="open">
            <Card task={taskFor(slug)} basePoints={30} multiplier={1} inProgressCount={2} onSignup={noop} />
          </State>
          <State label="metatask">
            <Card task={metataskFor(slug)} basePoints={15} multiplier={1} inProgressCount={0} onSignup={noop} />
          </State>
        </div>
      )
    },
  },
  {
    key: 'taskDetail',
    render: (slug) => {
      const Detail = resolveVariant(surfaceMap('taskDetail'), slug)
      const state = taskDetailState(slug)
      return (
        <>
          <State label="open to sign up">
            <Detail state={state} />
          </State>
          <State label="in progress">
            <Detail state={{ ...state, isInProgress: true, canSignUp: false, inProgressPraxisId: 602 }} />
          </State>
        </>
      )
    },
  },
  {
    key: 'proposeTask',
    render: (slug) => {
      const Propose = resolveVariant(surfaceMap('proposeTask'), slug)
      return <Propose state={proposeTaskState(slug)} />
    },
  },
  {
    key: 'praxisCard',
    render: (slug) => {
      const Card = resolveVariant(surfaceMap('praxisCard'), slug)
      const full = makePraxisCard({
        task_faction_slug: slug,
        created_by_faction_slug: slug,
        type: 'collab',
        member_count: 3,
        members: mockCollaboration.members,
        applied_metatasks: [metataskFor(slug)],
        metatask_points: 15,
        score: 57,
      })
      const draft = praxisCardsFor(slug)[1]
      return (
        <div className="flex flex-wrap gap-6">
          <State label="submitted, with votes and a metatask seal">
            <Card praxis={full} adminProps={adminPropsFor(full)} />
          </State>
          <State label="in progress">
            <Card praxis={draft} adminProps={adminPropsFor(draft)} />
          </State>
        </div>
      )
    },
  },
  {
    key: 'scoreStamp',
    render: (slug) => {
      const Stamp = resolveVariant(surfaceMap('scoreStamp'), slug)
      return <Stamp praxis={makePraxisCard({ task_faction_slug: slug })} />
    },
  },
  {
    key: 'metataskSeal',
    render: (slug) => {
      const Seal = resolveVariant(surfaceMap('metataskSeal'), slug)
      return (
        <div className="flex flex-wrap gap-6">
          <Seal metatask={metataskFor(slug)} />
          <Seal metatask={metataskFor(slug)} removable onRemove={noop} />
        </div>
      )
    },
  },
  {
    key: 'praxisDetail',
    render: (slug) => {
      const Detail = resolveVariant(surfaceMap('praxisDetail'), slug)
      const state = praxisDetailState(slug)
      return (
        <>
          <State label="submitted, voted, commented, metatask sealed">
            <Detail
              state={{
                ...state,
                praxis: state.praxis && {
                  ...state.praxis,
                  applied_metatasks: [metataskFor(slug)],
                  metatask_points: 15,
                },
              }}
            />
          </State>
          <State label="in a duel">
            <Detail state={{ ...state, duel: duelFor(slug) }} />
          </State>
        </>
      )
    },
  },
  {
    key: 'editPraxis',
    render: (slug) => {
      const Edit = resolveVariant(surfaceMap('editPraxis'), slug)
      const state = editPraxisState(slug)
      const sealed = metataskFor(slug)
      const collab = makePraxis({
        task_faction_slug: slug,
        created_by_faction_slug: slug,
        type: 'collab',
        status: 'in_progress',
        submitted_at: null,
        members: mockCollaboration.members,
      })
      return (
        <>
          <State label="composing, metatask sealed">
            <Edit
              state={{
                ...state,
                appliedMetataskList: [sealed],
                appliedMetatasks: new Set([sealed.id]),
                showSealStack: true,
              }}
            />
          </State>
          <State label="composing a collaboration, invite box open">
            <Edit
              state={{ ...state, praxis: collab, showInviteBox: true, inviteOpen: true, inviteQuery: 'pip' }}
            />
          </State>
          <State label="duel">
            <Edit state={{ ...state, duel: duelFor(slug), duelMode: true, duelChipVisible: true }} />
          </State>
          <State label="waiting on the crew">
            <Edit state={{ ...state, phase: 'waiting', praxis: collab }} />
          </State>
          <State label="completed">
            <Edit state={{ ...state, phase: 'completed', praxis: collab }} />
          </State>
        </>
      )
    },
  },
  {
    key: 'vote',
    render: (slug) => {
      const Vote = resolveVariant(surfaceMap('vote'), slug)
      return (
        <div className="flex flex-wrap gap-6">
          <State label="not yet voted">
            <Vote praxisId={501} points={42} totalVotes={8} viewerCanVote />
          </State>
          <State label="voted">
            <Vote praxisId={501} currentValue={4} points={42} totalVotes={8} viewerCanVote />
          </State>
        </div>
      )
    },
  },
  {
    key: 'comment',
    render: (slug) => {
      const Comment = resolveVariant(surfaceMap('comment'), slug)
      return (
        <>
          <State label="rows">
            <div className="flex flex-col gap-3">
              {mockComments.map((comment) => (
                <Comment key={comment.id} mode="row" comment={comment} />
              ))}
            </div>
          </State>
          <State label="composer">
            <Comment
              mode="composer"
              character={characterFor(slug)}
              value="Looks great"
              onChange={noop}
              onSubmit={noop}
              submitting={false}
            />
          </State>
        </>
      )
    },
  },
  {
    key: 'feedFrame',
    render: (slug) => {
      const FeedFrame = resolveVariant(surfaceMap('feedFrame'), slug)
      return (
        <FeedFrame kicker="Collaboration" time="2h ago" tag="New" archive={null}>
          <p className="content-text">{i18n.t('feed:collabInvite.bankFull.title')}</p>
        </FeedFrame>
      )
    },
  },
  {
    key: 'factionHero',
    render: (slug) => {
      const Hero = resolveVariant(surfaceMap('factionHero'), slug)
      return <Hero slug={slug} name={factionName(slug)} members={42} tasks={12} praxes={87} />
    },
  },
  {
    key: 'factionBody',
    render: (slug) => {
      const Body = resolveVariant(surfaceMap('factionBody'), slug)
      const state = factionDetailState(slug)
      return (
        <>
          {(['eligible', 'member', 'gate', 'burned', 'none'] as const).map((kind) => (
            <State key={kind} label={`membership: ${kind}`}>
              <Body state={{ ...state, membership: { ...state.membership, state: kind } }} />
            </State>
          ))}
        </>
      )
    },
  },
  {
    key: 'profileBody',
    render: (slug) => {
      const Body = resolveVariant(surfaceMap('profileBody'), slug)
      const full = profileProps(slug)
      return (
        <>
          <State label="full">
            <Body {...full} onSignup={noop} />
          </State>
          <State label="empty">
            <Body {...full} submissions={[]} proposedTasks={[]} />
          </State>
        </>
      )
    },
  },
  {
    key: 'duelSeal',
    render: (slug) => {
      const Seal = resolveVariant(surfaceMap('duelSeal'), slug)
      return (
        <div className="flex flex-col gap-6">
          {(['submit', 'forfeit'] as const).map((mode) => (
            <State key={mode} label={mode}>
              <Frame height={620}>
                <Seal
                  duel={duelFor(slug)}
                  viewerCharacterId={7}
                  taskPointValue={30}
                  mode={mode}
                  onConfirm={noop}
                  onCancel={noop}
                />
              </Frame>
            </State>
          ))}
        </div>
      )
    },
  },
  {
    key: 'avatar',
    render: (slug) => {
      const Avatar = resolveVariant(surfaceMap('avatar'), slug)
      return (
        <div className="flex flex-wrap items-center gap-4">
          <Avatar character={characterFor(slug)} size="sm" />
          <Avatar character={characterFor(slug)} size="md" />
          <Avatar character={characterFor(slug)} size={96} glow />
        </div>
      )
    },
  },
  {
    key: 'sigil',
    render: (slug) => {
      const Sigil = resolveVariant(surfaceMap('sigil'), slug)
      return (
        <div className="flex flex-wrap items-center gap-4">
          <Sigil size={22} />
          <Sigil size={64} />
        </div>
      )
    },
  },
  {
    key: 'backdrop',
    render: (slug) => {
      const Backdrop = resolveVariant(surfaceMap('backdrop'), slug)
      return (
        <Frame height={320}>
          <Backdrop />
        </Frame>
      )
    },
  },
]

/** The popups an Everymen player can meet, none of which is a manifest surface. */
function Popups({ slug }: { slug: string }) {
  const editState = editPraxisState(slug)
  const confirms: ConfirmRequest[] = [
    dropTaskConfirm(),
    dropDuelSideConfirm(),
    deleteCollabConfirm(slug),
    leaveCollabConfirm(slug, 3),
    leaveCollabConfirm(slug, 2),
    kickMemberConfirm(slug, 'Pip Marigold'),
    proposePublishConfirm(slug),
    editCancelsProposalConfirm(slug),
    reopenForEditConfirm(slug),
    dissolveDuelConfirm(),
    duelDropsCoauthorsConfirm(),
  ]
  return (
    <>
      <Section id="InvitationLetterPopup">
        <Frame height={820}>
          <InvitationLetterPopup factionSlug={slug} onClose={noop} />
        </Frame>
      </Section>
      <Section id="LevelUpPopup">
        <Frame height={760}>
          <LevelUpPopup
            level={4}
            rankKey="ranger"
            abilities={[
              { kind: 'ability', key: 'vote' },
              { kind: 'sense', key: 'worn_paths' },
            ]}
            onContinue={noop}
          />
        </Frame>
      </Section>
      <Section id="CollabSuccess">
        <Frame height={560}>
          <CollabSuccess
            members={mockCollaboration.members ?? []}
            currentCharacterId={7}
            factionSlug={slug}
            taskPointValue={30}
            onContinue={noop}
          />
        </Frame>
      </Section>
      <Section id="ConfirmDialog">
        <div className="flex flex-col gap-6">
          {confirms.map((request) => (
            <State key={request.kind} label={request.kind}>
              <Frame height={460}>
                <ConfirmDialog request={request} factionSlug={slug} onConfirm={noop} onDismiss={noop} />
              </Frame>
            </State>
          ))}
        </div>
      </Section>
      <Section id="MetataskPicker">
        <Frame height={680}>
          <MetataskPicker
            {...editState}
            metatasks={[metataskFor(slug), metataskFor('wow', { id: 901, title: 'Do it twice' })]}
            addMetatask={anoop}
            closeMetataskPicker={noop}
          />
        </Frame>
      </Section>
      <Section id="MetataskRemoveConfirm">
        <Frame height={460}>
          <MetataskRemoveConfirm
            {...editState}
            metataskRemovalTarget={metataskFor(slug)}
            confirmRemoveMetatask={anoop}
            cancelRemoveMetatask={noop}
          />
        </Frame>
      </Section>
      <Section id="FeedBankFullModal">
        <Frame height={460}>
          <FeedBankFullModal
            title={i18n.t('feed:collabInvite.bankFull.title')}
            body={i18n.t('feed:collabInvite.bankFull.body', { max: 5 })}
            cancelLabel={i18n.t('feed:collabInvite.bankFull.cancel')}
            options={praxisCardsFor(slug).map((praxis) => ({
              id: praxis.id,
              label: i18n.t('feed:collabInvite.bankFull.dropOption', { title: praxis.title }),
              onSelect: noop,
            }))}
            busy={false}
            error=""
            onDismiss={noop}
          />
        </Frame>
      </Section>
      <Section id="ImageEditModal">
        <Frame height={760}>
          <ImageEditModal file={aPixelFile()} aspect={1} onConfirm={noop} onCancel={noop} />
        </Frame>
      </Section>
      <Section id="CharacterSwitcherSheet">
        <Frame height={560}>
          <CharacterSwitcherSheet open activeCharacterId={7} onClose={noop} />
        </Frame>
      </Section>
    </>
  )
}

export default function FactionCopySheet() {
  // Subscribing re-renders the sheet when the editor arms (`languageChanged`),
  // which rebuilds every `i18n.t` call in the fixtures so the copy registry
  // indexes them too.
  const { t } = useTranslation('admin')
  const { slug = '' } = useParams<{ slug: string }>()
  return (
    <div
      className="py-8"
      // Inert unless the editor is armed (which stops the event earlier, at the
      // document). See "TWO SAFETY RULES" above.
      onClickCapture={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      <PageTitle title={t('copySheet.title', { name: factionName(slug) })} />
      <p className="card-meta mb-8">{t('copySheet.intro')}</p>
      {COPY_SHEET_SURFACES.map(({ key, render }) => (
        <Section key={key} id={key}>
          {render(slug)}
        </Section>
      ))}
      <h2 className="label-heading mb-6">{t('copySheet.popups')}</h2>
      <Popups slug={slug} />
    </div>
  )
}
