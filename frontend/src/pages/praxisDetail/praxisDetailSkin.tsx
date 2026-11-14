/**
 * The praxis-detail spine, held once and dressed nine ways (#2718) — the
 * `profileSkin.tsx` pattern: one renderer for the invariant arrangement, driven
 * by a per-faction {@link PraxisDetailKit}. No slug and no slug-keyed table here
 * (the #2992 chassis-vs-skin-table boundary).
 *
 * ```
 * .py-8 ─── Breadcrumb (site chrome, above the surface — #2102)
 *        └─ the SHEET (the faction's own ground)
 *           ├─ sheetPrelude   ← bands, mastheads, rasters, wordmarks
 *           └─ sheetBody(     ← an optional padded / stacked inner wrapper
 *                banners      ← PraxisStatusBanners + PraxisAdminBar
 *                split ─┬─ main:  header · [rail] · proof · writeUp · crew
 *                       │         · metatasks · [asideRest]
 *                       └─ aside: rail · asideRest        (desktop only, 330px)
 *                comments      ← PraxisDetailComments, beneath BOTH columns
 *                footer        ← a colophon under the whole plate
 *              )
 * ```
 *
 * `rail` = score + duel; `asideRest` = vote + voters + report card. Built ONCE
 * and MOVED between breakpoints, never drawn twice and hidden (ADR-0056/0058).
 * Invariant mounts live here, not in kit fields, so no kit can drop one
 * (ADR-0061; `archetypeSlots.test.tsx`). A faction with a genuinely different
 * shape keeps its own tree instead of delegating.
 *
 * Markup is pinned by `markupStability.test.tsx`. Hazards: React serialises
 * `style` in key order, so spreads stay where they are; an absent knob must
 * emit no attribute (`className={undefined}`).
 */
import type { ComponentProps, CSSProperties, ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

import Breadcrumb from '../../components/nav/Breadcrumb'
import { useFormFactor } from '../../hooks/useFormFactor'
import { DuelCard } from './DuelCard'
import MetataskSeal from '../../components/metataskSeal/MetataskSeal'
import ScoreStamp from '../../components/praxisCard/scoreStamp/ScoreStamp'
import { voteRegionVisible } from '../../components/vote/VoteUI'
import {
  PraxisAdminBar,
  PraxisDetailComments,
  PraxisFlagBlock,
  PraxisOwnerActions,
  PraxisStatusBanners,
  scoreWasBanked,
  taskRefMeta,
} from './shared'
import type { PraxisDetailState } from './usePraxisDetail'

/**
 * The duel card's ink seam (`DuelCardInk` is private to `DuelCard.tsx`). Kits
 * must ANNOTATE with it: excess-property checks only fire on literals, so a
 * hoisted un-annotated `mutd:` would compile and silently paint na grey.
 */
export type DuelInk = ComponentProps<typeof DuelCard>['ink']

/** The desktop aside track in px — ADR-0061's 330 (#1129). Not a kit knob. */
const ASIDE_TRACK = 330

/** A faction's dress and arranged slots: paint and nodes, no copy/rules/slug. */
export interface PraxisDetailKit {
  /* ── ground ────────────────────────────────────────────────────────────── */

  /** The outer `.py-8` box, which also parents the `Breadcrumb`. Only a kit
   *  whose ink spans the crumb (S.N.I.D.E.) puts its role map here. */
  pageStyle?: CSSProperties
  /** The sheet's own class — `.eph-plate-sheet`, `.wow-detail-field`. */
  sheetClassName?: string
  /** Ground, frame, radius, padding and usually `factionRoleVars`. On the sheet,
   *  not the page box, so a faction namespace never spans site chrome (#2102). */
  sheetStyle?: CSSProperties
  /** The sheet's first children, before the banners. Clipped by the sheet's
   *  `overflow`, so `inset: 0` never paints the viewport (§5, #1028). */
  sheetPrelude?: ReactNode
  /** Inner wrapper around banners + split + comments + footer (inset padding or
   *  a stacking layer). Defaults to identity: no extra element. */
  sheetBody?: (body: ReactNode) => ReactNode
  /** Merged in FRONT of the split row's flex properties (key order, see header). */
  splitStyle?: CSSProperties
  /** The split row's first child: a watermark anchored to the row. */
  splitPrelude?: ReactNode
  /** Mounted under the comments, inside the sheet body — a colophon. */
  footer?: ReactNode

  /* ── ink the shared chrome takes (#3016) ───────────────────────────────── */

  /** Flagged notice edge/label ink, when the shared warning hue fails the plate. */
  flaggedInk?: string
  /** The flagged notice's sentence, likewise. */
  flaggedBodyInk?: string

  /* ── the dressed content ───────────────────────────────────────────────── */

  /** The header's byline row, title and task-reference band. The skin mounts
   *  `PraxisOwnerActions` between title and band, and hands the band its
   *  `taskRefMeta` text. */
  byline: ReactNode
  title: ReactNode
  taskRef: (meta: string) => ReactNode
  /** Wraps the owner actions in a `div` (Singularity re-points their ink). */
  ownerActionsStyle?: CSSProperties
  /** The score panel's label; the panel, its gate and `ScoreStamp` are the skin's. */
  scoreHeading: ReactNode
  /** Over `panel` where the score plate differs (Coven's candle halo). */
  scoreStyle?: CSSProperties
  /** Before the stamp, inside the panel. */
  scorePrelude?: ReactNode
  /** Merged in FRONT of the stamp wrapper's flex properties (key order). */
  scoreStageStyle?: CSSProperties
  /** The panel chrome every rail/aside section wears, so it reads as this page's. */
  panel: CSSProperties
  /** The duel card's label, in the kit's own section-head dress. */
  duelHeading: ReactNode
  /** The duel card's inks. Omit for the `na` kit's own paint. */
  duelInk?: DuelInk
  /** Section interiors (heading and body); the skin owns each gate and shell:
   *  vote on `voteRegionVisible` (#1429), voters on a non-empty roll, proof on
   *  media, writeUp on a body, crew on a collab. */
  vote: ReactNode
  voters: ReactNode
  proof: ReactNode
  writeUp: ReactNode
  crew: ReactNode
  /** The metatask section's label; the section and read-only seal are the skin's. */
  metatasksHeading: ReactNode
  /** The comments region's label, so the thread does not draw a second one. */
  commentsHeading: ReactNode
}

/** Renders one praxis-detail page from one kit; the caller guards `state.praxis`. */
export function PraxisDetailSkin({
  state,
  kit,
}: {
  state: PraxisDetailState
  kit: PraxisDetailKit
}) {
  const desktop = useFormFactor() !== 'mobile'
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sheetBody = kit.sheetBody ?? ((body: ReactNode) => body)
  const sectionGap = desktop ? 'var(--space-2xl)' : 'var(--space-xl)'

  // Moderation chrome: mounted bare, platform not faction (ADR-0061); the two
  // ink knobs are a kit's whole say (#3016).
  const banners = (
    <>
      <PraxisStatusBanners
        state={state}
        flaggedInk={kit.flaggedInk}
        flaggedBodyInk={kit.flaggedBodyInk}
      />
      <PraxisAdminBar state={state} />
    </>
  )

  // Rail: gated on `scoreWasBanked` (#1444), a rule not dress.
  const rail = (
    <>
      {scoreWasBanked(praxis) ? (
        <section style={kit.scoreStyle ?? kit.panel}>
          {kit.scoreHeading}
          {kit.scorePrelude}
          <div style={{ ...kit.scoreStageStyle, display: 'flex', justifyContent: 'center' }}>
            {/* The page's one crown is the stamp's corner fleur (#1710, ADR-0054). */}
            <ScoreStamp praxis={praxis} />
          </div>
        </section>
      ) : null}
      <DuelCard
        state={state}
        style={kit.panel}
        heading={kit.duelHeading}
        ink={kit.duelInk}
      />
    </>
  )

  // `PraxisFlagBlock` takes no style prop: bare by construction (ADR-0061).
  const asideRest = (
    <>
      {voteRegionVisible(state.user, praxis.viewer_can_vote) && (
        <section style={kit.panel}>{kit.vote}</section>
      )}
      {state.voters.length > 0 && <section style={kit.panel}>{kit.voters}</section>}
      <PraxisFlagBlock state={state} />
    </>
  )

  // READ-ONLY (#1093): no `removable`/`onAdd`; each seal wears its issuer's dress.
  const shell: CSSProperties = { marginBottom: sectionGap }
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={shell}>
      {kit.metatasksHeading}
      <MetataskSeal metatasks={praxis.applied_metatasks} />
    </section>
  )

  const split = (
    <div
      style={{
        ...kit.splitStyle,
        display: 'flex',
        flexDirection: desktop ? 'row' : 'column',
        alignItems: 'stretch',
        gap: desktop ? 'var(--space-2xl)' : 'var(--space-xl)',
      }}
    >
      {kit.splitPrelude}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        {kit.byline}
        {kit.title}
        {kit.ownerActionsStyle ? (
          <div style={kit.ownerActionsStyle}>
            <PraxisOwnerActions state={state} />
          </div>
        ) : (
          <PraxisOwnerActions state={state} />
        )}
        {kit.taskRef(taskRefMeta(praxis, t))}
        {/* Mobile: the rail moves above the proof. */}
        {!desktop && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {rail}
          </div>
        )}
        {praxis.media_items.length > 0 && <section style={shell}>{kit.proof}</section>}
        {praxis.body_text && <section style={shell}>{kit.writeUp}</section>}
        {/* A collab is a collab at one member (#1274). Tested positively: a duel side is type='solo' + duel_id (ADR-0011), so !== 'solo' breaks duels (#992). */}
        {praxis.type === 'collab' && <section style={shell}>{kit.crew}</section>}
        {metatasks}
        {!desktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {asideRest}
          </div>
        )}
      </div>

      {/* The 330px track is desktop-only; its contents moved up on mobile. */}
      {desktop && (
        <aside
          style={{
            flex: `0 0 ${ASIDE_TRACK}px`,
            width: ASIDE_TRACK,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-lg)',
          }}
        >
          {rail}
          {asideRest}
        </aside>
      )}
    </div>
  )

  return (
    <div className="py-8" style={kit.pageStyle}>
      {/* Site chrome above the surface (#2102). */}
      <Breadcrumb
        taskId={praxis.task_id}
        taskTitle={praxis.task_title}
        praxisId={praxis.id}
      />

      <div className={kit.sheetClassName} style={kit.sheetStyle}>
        {kit.sheetPrelude}
        {sheetBody(
          <>
            {banners}
            {split}
            {/* Third region (ADR-0061): beneath both columns, heading drawn by
                the layout (#1029). Rows stay dispatched on each author's faction. */}
            <PraxisDetailComments
              state={state}
              heading={kit.commentsHeading}
              style={{ marginTop: sectionGap }}
            />
            {kit.footer}
          </>,
        )}
      </div>
    </div>
  )
}
