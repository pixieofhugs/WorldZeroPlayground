/**
 * The praxis-detail spine, held once and dressed nine ways (#2718).
 *
 * ## What this is, and what it is not
 *
 * It is `characterProfile/archetypes/profileSkin.tsx` on this surface: ONE
 * shared skinnable renderer holding the invariant arrangement, driven by a
 * per-faction {@link PraxisDetailKit} of paint and slots. Nine files stay nine
 * files (`frontend/CLAUDE.md`) — every archetype keeps its own file, its own
 * ground, its own ornament, its own face and its own role map, and delegates
 * the arrangement here. It is **not** one component branching on a slug: there
 * is no slug in this file and no table keyed by one, which is the boundary the
 * #2992 ruling draws between a shared CHASSIS (fine) and a runtime SKIN TABLE
 * (not fine).
 *
 * ## The arrangement, stated on its own terms (ADR-0061)
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
 * `rail` is score + duel; `asideRest` is vote + voters + the report card. They
 * are built ONCE and MOVED — on a phone the rail stacks above the proof and the
 * rest below the metatasks; on a laptop both sit in the 330px aside. Never
 * drawn twice and hidden, which would double the DOM (ADR-0056/0058).
 *
 * ## What the kit may and may not do
 *
 * ADR-0061's rule is that an archetype may **arrange** the slots freely but may
 * not **drop** one, and this file does not narrow it: a faction whose page is
 * genuinely its own shape keeps its own tree and does not delegate, exactly as
 * three of nine profile kits still do. What a kit may not do is silently omit a
 * mount — which is why the eleven invariant mounts are mounted HERE and are not
 * kit fields. `__tests__/archetypeSlots.test.tsx` holds the derived half: no
 * delegating archetype re-mounts one of them itself.
 *
 * ## The seam this was proved at
 *
 * `__tests__/markupStability.test.tsx` — every registered archetype × ten
 * states × both form factors, SHA-256 of the static markup, TZ-pinned. Each kit
 * migrated to this skin one at a time, and the gate stayed byte-identical
 * through every one. That is the whole claim: this moved code, not pixels.
 *
 * Two consequences for anyone editing this file. **Style objects are ordered**:
 * React serialises `style` in key order, so `{...kit.splitStyle, display: …}`
 * puts the kit's keys first because that is where the kits already had them.
 * And **an absent knob must render an absent attribute** — `className={undefined}`
 * and `style={undefined}` emit nothing, which is how a kit with no sheet class
 * keeps the markup it had.
 */
import type { ComponentProps, CSSProperties, ReactNode } from 'react'

import Breadcrumb from '../../components/nav/Breadcrumb'
import { useFormFactor } from '../../hooks/useFormFactor'
import { DuelCard } from './DuelCard'
import MetataskSeal from '../../components/metataskSeal/MetataskSeal'
import {
  PraxisAdminBar,
  PraxisDetailComments,
  PraxisFlagBlock,
  PraxisStatusBanners,
  scoreWasBanked,
} from './shared'
import type { PraxisDetailState } from './usePraxisDetail'

/** The duel card's ink seam, borrowed rather than re-declared — `DuelCardInk`
 *  is private to `DuelCard.tsx` and that file is not this lane's to change. */
type DuelInk = ComponentProps<typeof DuelCard>['ink']

/** The desktop aside's track, in px. The one measurement the whole surface
 *  agrees on (ADR-0061); a kit overrides it only if its own design does. */
const ASIDE_TRACK = 330

/**
 * A faction's dress and its arranged slots. Everything here is either paint the
 * kit owns or a node the kit built — no copy, no rules, no slug.
 */
export interface PraxisDetailKit {
  /* ── ground ────────────────────────────────────────────────────────────── */

  /** Style for the outer `.py-8` box, which also parents the shared
   *  `Breadcrumb`. Faction ROLE MAPS do not belong here for most kits — see
   *  the note on {@link sheetStyle} — but a kit whose ink spans the crumb
   *  (S.N.I.D.E.) declares it, which is why this is a knob and not a constant.
   *  Omit it and no `style` attribute is emitted at all. */
  pageStyle?: CSSProperties
  /** The sheet's own class — `.eph-plate-sheet`, `.wow-detail-field`. */
  sheetClassName?: string
  /** The sheet's inline paint: the ground, the frame, the radius, the padding,
   *  and (for most kits) `factionRoleVars(slug, prefix)`. Declared on THE SHEET
   *  rather than on the page box above it, because that box also holds the
   *  neutral shared breadcrumb and a faction namespace has no business spanning
   *  site chrome (#2672/#2675/#2102). */
  sheetStyle?: CSSProperties
  /** Mounted as the sheet's first children, before the banners: spectrum bands,
   *  mastheads, scan rasters, bleeding ornaments. Clipped by the sheet's own
   *  `overflow`, so a layer at `inset: 0` can never paint the viewport
   *  (WORLD_ZERO_STYLE §5, the #1028 ruling). */
  sheetPrelude?: ReactNode
  /** An inner wrapper around banners + split + comments + footer, for a kit
   *  whose sheet paints flush to its own edges and pads its contents
   *  separately, or that needs a positioned stacking layer over its ground.
   *  Defaults to identity, so a kit that needs neither says nothing and emits
   *  no extra element. */
  sheetBody?: (body: ReactNode) => ReactNode
  /** Style merged in FRONT of the split row's own flex properties — a kit that
   *  anchors a watermark to the columns row makes it `position: relative` here.
   *  Merged in front because that is the order the kits already wrote it in and
   *  React serialises `style` by key order. */
  splitStyle?: CSSProperties
  /** Mounted as the split row's first child, before the main column: a
   *  watermark whose anchor is the row rather than the sheet. */
  splitPrelude?: ReactNode
  /** The desktop aside's track in px. Defaults to {@link ASIDE_TRACK}. */
  asideTrack?: number
  /** Mounted under the comments, inside the sheet body — a colophon. */
  footer?: ReactNode

  /* ── ink the shared chrome takes (#3016) ───────────────────────────────── */

  /** Edge and label of the flagged notice, when the shared warning hue does not
   *  clear the kit's own plate. Two kits set it; the rest inherit. */
  flaggedInk?: string
  /** The flagged notice's sentence, likewise. */
  flaggedBodyInk?: string

  /* ── the dressed content ───────────────────────────────────────────────── */

  /** Byline · title · owner actions · task reference. The kit's own, because
   *  every faction re-letters all four. */
  header: ReactNode
  /** The score panel, INCLUDING `ScoreStamp`. Handed in unconditionally: the
   *  `scoreWasBanked` gate is invariant and lives in the skin, so a kit cannot
   *  accidentally draw a score panel on an unscored praxis (#1444). */
  score: ReactNode
  /** The panel chrome the duel card wears, so it reads as this page's. */
  duelPanel: CSSProperties
  /** The duel card's label, in the kit's own section-head dress. */
  duelHeading: ReactNode
  /** The duel card's inks. Omit for the `na` kit's own paint. */
  duelInk?: DuelInk
  /** The vote panel, gated by the kit on `voteRegionVisible` (#1429). */
  vote: ReactNode
  /** The who-voted panel, gated by the kit on a non-empty roll. */
  voters: ReactNode
  /** Main column, in order, each gated by the kit on its own payload field. */
  proof: ReactNode
  writeUp: ReactNode
  crew: ReactNode
  /** The applied-metatask section's label. The SECTION and the read-only
   *  `MetataskSeal` inside it are the skin's — every kit drew the same two. */
  metatasksHeading: ReactNode
  /** The comments region's label, so the thread does not draw a second one. */
  commentsHeading: ReactNode
  /** The gap between the main column's sections, and above the comments.
   *  One value: every kit used the same string in both places. */
  sectionGap: string
}

/**
 * Renders one praxis-detail page from one kit.
 *
 * `state.praxis` is guarded non-null by the caller — every archetype returns
 * null on a missing praxis before it builds a single node, because its own
 * dress reads the payload.
 */
export function PraxisDetailSkin({
  state,
  kit,
}: {
  state: PraxisDetailState
  kit: PraxisDetailKit
}) {
  const desktop = useFormFactor() !== 'mobile'
  const { praxis } = state
  if (!praxis) return null

  const track = kit.asideTrack ?? ASIDE_TRACK
  const sheetBody = kit.sheetBody ?? ((body: ReactNode) => body)

  // ── Moderation banners ────────────────────────────────────────────────────
  // Invariant, and mounted bare: the failed mark, the flagged notice and the
  // steward bar are the PLATFORM speaking, not the faction (ADR-0061). The two
  // ink knobs are the whole of a kit's say over them (#3016).
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

  // ── The rail: score + duel, built once and MOVED ──────────────────────────
  //
  // The gate is `scoreWasBanked`, not `score > 0` — an unscored praxis (failed,
  // hidden) draws no panel at all (#1444), and that is a rule rather than a
  // dress decision, so it is here and not in nine kits.
  const rail = (
    <>
      {scoreWasBanked(praxis) ? kit.score : null}
      <DuelCard
        state={state}
        style={kit.duelPanel}
        heading={kit.duelHeading}
        ink={kit.duelInk}
      />
    </>
  )

  // ── The rest of the aside: vote · voters · the report card ────────────────
  // `PraxisFlagBlock` is mounted BARE, by contract and by construction: it
  // accepts no style prop, so skinning it is not the easy path (ADR-0061).
  const asideRest = (
    <>
      {kit.vote}
      {kit.voters}
      <PraxisFlagBlock state={state} />
    </>
  )

  // READ-ONLY, by construction (#1093): `MetataskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933).
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: kit.sectionGap }}>
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
        {kit.header}
        {/* Mobile stacks the rail above the proof — one block each, MOVED,
            never a second copy hidden at the other breakpoint. */}
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
        {kit.proof}
        {kit.writeUp}
        {kit.crew}
        {metatasks}
        {!desktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {asideRest}
          </div>
        )}
      </div>

      {/* The 330px TRACK is desktop-only; its CONTENTS are not — they moved up
          into the main column above. A different claim from the crown, which
          renders at both form factors because the score panel does. */}
      {desktop && (
        <aside
          style={{
            flex: `0 0 ${track}px`,
            width: track,
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
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail at every width - see components/nav/Breadcrumb. */}
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
            {/* The third layout region (ADR-0061, amending ADR-0006): comments
                sit beneath BOTH columns, inside the page's own sheet, and the
                layout draws the heading so the thread does not draw a second
                one (the #1029 trap). The ROWS stay dispatched on each author's
                own faction — deliberately not token-repointed, because a
                comment must reach the reader in the voice that wrote it. */}
            <PraxisDetailComments
              state={state}
              heading={kit.commentsHeading}
              style={{ marginTop: kit.sectionGap }}
            />
            {kit.footer}
          </>,
        )}
      </div>
    </div>
  )
}
