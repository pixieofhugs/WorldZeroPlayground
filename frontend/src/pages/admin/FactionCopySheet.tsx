/**
 * The faction copy sheet (`/admin/copy/:slug`) — every surface that carries
 * wording written for ONE faction (beyond its name and description), stacked on
 * one scrolling page, so the live copy editor can reach all of it in one place.
 * Surfaces that speak only shared copy are left off: an edit there rewords every
 * faction, which is a different job.
 *
 * It adds NO editing mechanism. Turn on admin mode, press the editor's "edit
 * copy" control, and click any string: `CopyEditor` resolves it through the same
 * `copyRegistry` it uses on every other page. This page's whole job is to put the
 * surfaces on screen — including the invitation letter, which only ever exists
 * for a moment in the live app.
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
 * 2. The invitation letter sits INLINE, in a bounded frame: it is
 *    `position: fixed`, and `Frame`'s `transform` makes that resolve against the
 *    frame instead of the viewport.
 *
 * Strings that appear here but are not editable are hardcoded in a component
 * (not in a catalog) — the editor answers "not editable wording" for them.
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

/** One labelled state of a surface (empty vs full, locked vs eligible…). */
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
      // The whole page once; the other join states with its lists emptied, so
      // only the join block (and the charter it sits beside) repeats.
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

/**
 * One faction's own pieces that are no manifest surface. Most factions meet the
 * shared invitation letter; Albescent writes its own, and a few draw a mark
 * whose wording lives under their slug. `factionCopySheet.test` is what says a
 * faction needs a row here.
 */
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
      // One life under the level ceiling and one over it, so the letter draws
      // both its choice and its "New Game+" refusal.
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
 * Every `focus()` on the page keeps the scroll where it is, so a popup that
 * focuses itself on mount does not drag the sheet down to it.
 * ponytail: patches the prototype for the page's lifetime; scope it to the
 * frame if a surface here ever needs scroll-on-focus.
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
  // Subscribing re-renders the sheet when the editor arms (`languageChanged`),
  // which rebuilds every `i18n.t` call in the fixtures so the copy registry
  // indexes them too.
  const { t } = useTranslation('admin')
  const { slug = '' } = useParams<{ slug: string }>()
  // The letter focuses itself on mount, which would scroll the page down to it.
  useFocusWithoutScroll()
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
