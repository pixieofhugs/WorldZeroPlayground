/**
 * The faction copy sheet (`/admin/copy/:slug`): every surface carrying wording
 * written for ONE faction, on one page, for the live copy editor. Adds no
 * editing mechanism; surfaces resolve via `surfaceMap` by slug.
 *
 * Safety: nothing may write. Fixture handlers are no-ops and the root swallows
 * clicks/submits in capture unless the editor is armed (else ENLIST would
 * really join). The `position: fixed` letter sits in a `Frame` whose
 * `transform` contains it.
 */
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { surfaceMap, type FactionSurface } from '../../factions'
import { resolveVariant } from '../../utils/factionDispatch'
import { ALBESCENT_FACTION_SLUG, factionName } from '../../utils/factions'
import PageTitle from '../../components/ui/PageTitle'
import InvitationLetterPopup from '../../components/InvitationLetterPopup'
import AlbescentInvitation from '../../components/AlbescentInvitation'
import { EphemeristsColophon } from '../../components/factionMarks/EphemeristsMasthead'
import AlbescentSecretPlaceholder from '../AlbescentSecretPlaceholder'
import { characterFor, noop } from './copySheet/sheetFixtures'
import { factionDetailState } from './copySheet/sheetState'

/** A box whose `fixed` children are positioned against IT, not the viewport. */
function Frame({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        overflow: 'hidden',
        height,
        border: '1.5px dashed var(--color-border)',
      }}
    >
      {children}
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

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="card-meta">{label}</p>
      {children}
    </div>
  )
}

/**
 * The surface sections, in reading order. `factionCopySheet.test` fails when a
 * faction-scoped catalog key renders nowhere on the sheet, so new faction copy
 * needs a section (or a state) here.
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
    key: 'vote',
    render: (slug) => {
      const Vote = resolveVariant(surfaceMap('vote'), slug)
      return <Vote praxisId={501} currentValue={4} points={42} totalVotes={8} viewerCanVote />
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
      // Other join states with lists emptied, so only the join block repeats.
      const bare = { ...state, members: [], tasks: [], recentPraxis: [] }
      return (
        <>
          <State label="membership: eligible">
            <Body state={state} />
          </State>
          {(['member', 'gate'] as const).map((kind) => (
            <State key={kind} label={`membership: ${kind}`}>
              <Body state={{ ...bare, membership: { ...state.membership, state: kind } }} />
            </State>
          ))}
        </>
      )
    },
  },
]

/** Per-faction pieces that are no manifest surface (`factionCopySheet.test`). */
const EXTRAS: Partial<Record<string, { id: string; render: () => ReactNode }[]>> = {
  ephemerists: [
    {
      id: 'EphemeristsColophon',
      render: () => (
        <>
          <State label="dated">
            <EphemeristsColophon scale="page" date="2026-07-01T15:04:00Z" />
          </State>
          <State label="undated">
            <EphemeristsColophon scale="page" />
          </State>
        </>
      ),
    },
  ],
  albescent: [
    {
      id: 'AlbescentInvitation',
      // Under and over the level ceiling: choice and "New Game+" refusal.
      render: () => (
        <AlbescentInvitation
          lives={[characterFor('ua', { level: 1 }), characterFor('coven', { id: 8, level: 99 })]}
          onJoined={noop}
        />
      ),
    },
    { id: 'AlbescentSecretPlaceholder', render: () => <AlbescentSecretPlaceholder /> },
  ],
}

/**
 * `focus()` never scrolls, so a self-focusing popup can't drag the sheet.
 * ponytail: patches the prototype for the page's lifetime; scope to the frame
 * if a surface needs scroll-on-focus.
 */
export function useFocusWithoutScroll() {
  useEffect(() => {
    const focus = HTMLElement.prototype.focus
    HTMLElement.prototype.focus = function (options) {
      focus.call(this, { preventScroll: true, ...options })
    }
    return () => {
      HTMLElement.prototype.focus = focus
    }
  }, [])
}

export default function FactionCopySheet() {
  // Subscribing re-renders on arm (`languageChanged`) so the registry indexes
  // the fixtures' `i18n.t` calls.
  const { t } = useTranslation('admin')
  const { slug = '' } = useParams<{ slug: string }>()
  useFocusWithoutScroll()
  return (
    <div
      className="py-8"
      // Inert unless armed (the editor stops the event earlier).
      onClickCapture
={(event) => {
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
      {slug !== ALBESCENT_FACTION_SLUG && (
        <Section id="InvitationLetterPopup">
          <Frame height={820}>
            <InvitationLetterPopup factionSlug={slug} onClose={noop} />
          </Frame>
        </Section>
      )}
      {(EXTRAS[slug] ?? []).map(({ id, render }) => (
        <Section key={id} id={id}>
          {render()}
        </Section>
      ))}
    </div>
  )
}
