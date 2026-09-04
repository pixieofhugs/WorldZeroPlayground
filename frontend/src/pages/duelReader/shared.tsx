/**
 * The settled-duel side-by-side reader's chassis (#1084; design
 * `.design-sync/duel-1084/Duel Side-by-Side Reader.dc.html`, turn 2 — vendored
 * for the life of the epic and deleted by this PR's last commit).
 *
 * Reading a duel used to mean two page loads — each side its own praxis page,
 * joined by a cross-link. This is the one frame that holds both entries.
 *
 * ## Why a chassis and not nine pages
 *
 * The design's own reason for splitting turn 1 into turn 2 is that it *"gives
 * the other eight factions a shape to inherit"*. Both columns are **identical
 * in kind** — disc, name, sigil, title, filed line, proof, body, caster, link
 * out — and nothing belongs to one duellist more than the other. That
 * invariance IS the surface, so it lives here once and a skin supplies paint
 * through {@link DuelReaderDress}. ADR-0092 is the record.
 *
 * ## One responsive component (ADR-0092, following ADR-0069 / #1313)
 *
 * This file owns the ONLY form-factor branch, exactly as `DuelSealSheet` does
 * for the seal. There is no phone archetype and no parallel mobile registry: a
 * skin passes dress and never a breakpoint. Both widths render the same
 * information in the same order; the phone difference is one BEHAVIOUR — one
 * panel open at a time — and not one layout.
 *
 * ## One ground, two sigils (owner ruling 2026-08-27)
 *
 * `groundSlug` is the **task's** faction, which is what dresses the praxis page
 * this reader is opened from and therefore what the ruling means by *"the
 * ground of the praxis whose page hosts it … which is what `DuelCard` already
 * does today"*. Both duellists share one task, so the ground is the same
 * whichever side you arrive from — which is also what the canvas draws: 2c is
 * in **na** while its two duellists are Coven and Singularity. Each duellist's
 * own faction rides on their `FactionSigil` and nowhere else, so the two
 * players still read as two factions without the page becoming a seam between
 * two kits.
 *
 * The nine roles are spread HERE rather than in each archetype, and that is not
 * a convenience: a role prefix may not be shared between surfaces
 * (`utils/__tests__/factionRoleFallbacks.test.ts`), and nine archetypes each
 * declaring `duel-reader` would be nine surfaces wearing one prefix. One
 * declaration, in the file that reads it. An archetype that passes nothing
 * still wears its faction, because the root it mounts is this one.
 *
 * ## Copy is faction-neutral, without exception (brief §0)
 *
 * Every string here comes from the shared `duelCrossLink.*` / `detail.*`
 * catalogs and is identical across all nine skins. A skin dresses this surface
 * and never rewords it. Exactly one key is new — `duelCrossLink.readBothSides`,
 * on `DuelCard`, not here.
 *
 * ## Every colour is a token
 *
 * Nine role reads and the shared `.spectrum-rule` ornament; no hex, no
 * `dark ? a : b`. Both themes come through the `[data-theme="dark"]` cascade.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../components/nav/Breadcrumb'
import FactionSigil from '../../components/sigil/FactionSigil'
import MarkdownPreview from '../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../components/MediaGallery'
import VoteUI from '../../components/vote/VoteUI'
import { useFormFactor } from '../../hooks/useFormFactor'
import { formatTimestamp } from '../../utils/dates'
import { mediaUrl } from '../../utils/media'
import { factionRoleVars } from '../../utils/factionRoles'
import {
  duelScoreFor,
  duelVerdict,
  hasForfeited,
} from '../../components/duel/standing'
import type { PraxisOut } from '../../api/praxis'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import { openSideFor, type DuelSideKey } from './openSide'
import { casterVisible } from './reader'
import type { DuelReaderState } from './useDuelReader'

/* -------------------------------------------------------------------------- */
/* The nine roles, under this surface's own prefix                            */
/* -------------------------------------------------------------------------- */

/**
 * Written as literals, not built by interpolation, and that is deliberate:
 * `factionTokensDeclared.test.ts` reconstructs the exact property set a prefix
 * can emit and checks every `var()` against it, and an interpolated name is
 * invisible to it from both ends. A surface nothing can see is a surface
 * nothing guards.
 */
const PAPER = 'var(--duel-reader-paper)'
const INK = 'var(--duel-reader-ink)'
const QUIET = 'var(--duel-reader-quiet)'
const LINE = 'var(--duel-reader-line)'
const ACCENT = 'var(--duel-reader-accent)'
const RADIUS = 'var(--duel-reader-radius)'
const FACE = 'var(--duel-reader-face)'

/** Minimum tap target for a collapsed header, per the design. */
const HEADER_MIN = 44

/**
 * A duellist's disc.
 *
 * Deliberately below `AlbescentAvatar`'s `RING_TURNS_AT` of 64. That ring ships
 * DORMANT by owner ruling (2026-08-23) — above every mount in the app — and its
 * own header names "a duel banner" as the surface that would light it. Lighting
 * it here would announce an Albescent membership to a viewer who was only
 * reading a duel, which is the case the gate exists to prevent (ADR-0088). The
 * canvas draws 38–44; anything at or above 64 is a reveal decision, not a
 * sizing one.
 */
const DISC = 38
/** The sigil. `FactionSigil` has no size gate at all and scales to any size. */
const SIGIL = 22

function Disc({ side, dimmed }: { side: DuelSideOut; dimmed: boolean }) {
  const shell: CSSProperties = {
    display: 'block',
    width: DISC,
    height: DISC,
    borderRadius: '50%',
    flex: 'none',
    overflow: 'hidden',
    background: PAPER,
    border: `1px solid ${LINE}`,
    boxSizing: 'border-box',
    opacity: dimmed ? 0.55 : 1,
  }
  if (!side.avatar_url) return <span aria-hidden="true" style={shell} />
  return (
    <span aria-hidden="true" style={shell}>
      <img
        src={mediaUrl(side.avatar_url)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* One entry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One entry, as {@link DuelReaderFrame} assembles it — a duel side paired with
 * the praxis body the duel payload does not carry.
 */
export interface DuelReaderEntry {
  key: DuelSideKey
  side: DuelSideOut
  praxis: PraxisOut
}

/**
 * A skin's paint. Every field is optional and every one falls back to a role
 * this chassis already reads, so an archetype that passes nothing renders the
 * ground of whichever faction owns the task — see the header. Pass tokens the
 * skin already owns; this seam repoints existing inks and is never a reason to
 * mint one.
 *
 * NOTHING HERE MAY CARRY A DUELLIST'S FACTION HUE. It is the `DuelCardInk` rule
 * on a second surface and for the same reason: a rival's hue can be any colour
 * in the palette, so it lives as an edge or a mark and never as an ink or a
 * ground (WORLD_ZERO_STYLE §3/§6, #895). The one place a duellist's faction is
 * allowed to speak on this page is their sigil.
 */
export interface DuelReaderDress {
  /** The page wrapper — outside the frame, behind the breadcrumb. */
  pageStyle?: CSSProperties
  /** The sheet both columns sit on. */
  frameStyle?: CSSProperties
  /** The page title. */
  headingStyle?: CSSProperties
  /** One entry's column. */
  columnStyle?: CSSProperties
  /** An entry's title. */
  titleStyle?: CSSProperties
  /** The byline row — disc, name, figure, sigil. */
  bylineStyle?: CSSProperties
  /** The caster plate at the foot of a column. */
  panelStyle?: CSSProperties
  /**
   * The label above a section — the caster's heading, and the standing's
   * `votes` / `final` captions. Defaults to the shared `.label-heading` rung.
   */
  sectionHead?: (label: string) => ReactNode
}

/* -------------------------------------------------------------------------- */
/* The standing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Both figures, the `vs.`, and the one verdict sentence — above both columns.
 *
 * The sentence comes from `components/duel/standing.ts`, shared with
 * `DuelCard`: both surfaces read the same settled duel over the same
 * `duelCrossLink.*` keys and #2814's thesis is that a rule written twice
 * drifts. The reading order is the only difference and it is an ARGUMENT — this
 * page is deliberately not viewer-relative, so it passes challenger / opponent
 * where the card passes mine / rival.
 */
function Standing({
  duel,
  entries,
}: {
  duel: DuelDetailOut
  entries: readonly [DuelReaderEntry, DuelReaderEntry]
}) {
  const { t } = useTranslation('praxis')
  const [a, b] = entries

  /**
   * Each figure is captioned with the duellist's NAME, not with a word.
   *
   * The canvas captions them `votes` and `final`, and neither string is in the
   * catalog — §0's rule is that a duel surface invents no copy, and #1084's
   * ruling is that this whole surface adds exactly ONE key, which is spent on
   * `readBothSides`. The name is data rather than copy, it says which figure
   * belongs to whom without relying on column position, and the live-vs-frozen
   * distinction the captions were carrying is already stated in full by the
   * verdict sentence directly below. DEVIATION, per design-fidelity.md.
   */
  const figure = (entry: DuelReaderEntry, align: 'flex-start' | 'flex-end') => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        alignItems: align,
      }}
    >
      <span className="label-caption" style={{ color: QUIET }}>
        {entry.side.display_name}
      </span>
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, lineHeight: 1, color: INK }}
      >
        {duelScoreFor(duel, entry.side)}
      </span>
    </div>
  )

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'end',
          gap: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        {figure(a, 'flex-start')}
        <span
          className="font-display italic content-text"
          style={{ color: QUIET, paddingBottom: 'var(--space-xs)' }}
        >
          {t('duelBanner.versus')}
        </span>
        {figure(b, 'flex-end')}
      </div>
      <p
        className="font-body content-text"
        // The verdict is a status explanation, so it sits at the CONTENT tier
        // rather than a caption size — WORLD_ZERO_STYLE §4's floor, and duel
        // narration sinking below it is what #769 was.
        style={{ margin: 'var(--space-md) 0 var(--space-xl)', color: QUIET }}
      >
        {duelVerdict(duel, a.side, b.side, t)}
      </p>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* One column                                                                  */
/* -------------------------------------------------------------------------- */

function defaultSectionHead(label: string): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <span className="label-heading" style={{ letterSpacing: '.22em', color: INK }}>
        {label}
      </span>
      <span
        aria-hidden="true"
        className="spectrum-rule"
        style={{ flex: '1 1 20%', minWidth: 20, height: 2, borderRadius: 2 }}
      />
    </div>
  )
}

/**
 * The row that survives a collapse — disc, name, sigil, figure.
 *
 * The design is explicit that a collapsed header *"stays a full row of
 * information … so the comparison survives the collapse"*, so it is the same
 * component open or shut and the phone mounts it inside the button.
 *
 * The SIGIL is the only place a duellist's own faction speaks on this page
 * (owner ruling 2026-08-27). It needs no redaction branch: brief §0 forbids
 * naming a faction verbally anywhere in a duel, so the string
 * `isFactionRedacted()` masks is not on the page to begin with, and Albescent's
 * labyrinth is painted from the unaffiliated conic rather than a livery of its
 * own (#2632).
 */
function Byline({
  entry,
  duel,
  dress,
  chevron,
}: {
  entry: DuelReaderEntry
  duel: DuelDetailOut
  dress: DuelReaderDress
  chevron?: ReactNode
}) {
  const dimmed = hasForfeited(duel, entry.side)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        minHeight: HEADER_MIN,
        ...dress.bylineStyle,
      }}
    >
      <Disc side={entry.side} dimmed={dimmed} />
      <span
        className="font-display italic content-text"
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          color: INK,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entry.side.display_name}
      </span>
      <FactionSigil slug={entry.side.faction_slug} size={SIGIL} />
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, flexShrink: 0, color: INK }}
      >
        {duelScoreFor(duel, entry.side)}
      </span>
      {chevron}
    </div>
  )
}

/**
 * One entry, in full.
 *
 * The caster is pinned to the foot with `margin-top: auto` so two unequal
 * bodies still leave the two panels level — the design calls that out, and it
 * is why this column is a flex column rather than a block.
 */
function Column({
  entry,
  duel,
  state,
  dress,
  withByline,
  gutter,
}: {
  entry: DuelReaderEntry
  duel: DuelDetailOut
  state: DuelReaderState
  dress: DuelReaderDress
  /** Desktop draws the byline in the column; the phone draws it in the header. */
  withByline: boolean
  /** The side of the desktop hairline this column sits on. Absent on a phone. */
  gutter?: 'left' | 'right'
}) {
  const { t } = useTranslation('praxis')
  const { praxis } = entry
  const dimmed = hasForfeited(duel, entry.side)
  const head = dress.sectionHead ?? defaultSectionHead
  // ONE predicate, read by the plate and by the widget below it (#1429).
  const caster = casterVisible(duel, state.user, praxis.viewer_can_vote)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        minWidth: 0,
        // A forfeiter's column dims, in step with their figure falling to an
        // em-dash. It is the one thing the frame changes for a forfeit.
        opacity: dimmed ? 0.55 : 1,
        paddingRight: gutter === 'left' ? 'var(--space-xl)' : undefined,
        paddingLeft: gutter === 'right' ? 'var(--space-xl)' : undefined,
        ...dress.columnStyle,
      }}
    >
      {withByline && <Byline entry={entry} duel={duel} dress={dress} />}

      <h2
        className="font-display italic"
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.15,
          color: INK,
          ...dress.titleStyle,
        }}
      >
        {praxis.title ?? praxis.task_title}
      </h2>
      {praxis.submitted_at && (
        <p className="label-caption" style={{ margin: 0, color: QUIET }}>
          {t('detail.filed', { date: formatTimestamp(praxis.submitted_at) })}
        </p>
      )}

      {praxis.media_items.length > 0 && (
        <div className="spectrum-rule" style={{ borderRadius: 10, padding: 'var(--space-xs)' }}>
          <div style={{ borderRadius: 6, background: PAPER, padding: 'var(--space-sm)' }}>
            {/* One column of a two-column reader is a narrow measure at any
                width, so the gallery stacks on both — the grid layout is for a
                full-sheet Proof section and would halve each thumbnail again. */}
            <MediaGallery media={praxis.media_items} layout="column" />
          </div>
        </div>
      )}

      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="font-body markdown-preview content-text"
          style={{ lineHeight: 1.85, color: INK }}
        />
      )}

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
        {caster && (
          <section
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: RADIUS,
              background: PAPER,
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-md)',
              ...dress.panelStyle,
            }}
          >
            {head(t('detail.vote.heading'))}
            <p
              className="font-display italic content-text"
              style={{ margin: '0 0 var(--space-md)', color: QUIET }}
            >
              {t('detail.vote.prompt')}
            </p>
            {/* Dispatched on the TASK's faction, the way every other caster in
                the app is (ADR-0039) — and against THIS column's praxis id, so
                the two casters can never be confused for one. */}
            <VoteUI
              factionSlug={praxis.task_faction_slug}
              praxisId={praxis.id}
              currentValue={praxis.viewer_vote ?? undefined}
              points={praxis.points_from_votes}
              totalVotes={praxis.voter_count}
              viewerCanVote={praxis.viewer_can_vote}
            />
          </section>
        )}
        <Link
          to={`/praxis/${praxis.id}`}
          className="content-text font-body"
          style={{ color: ACCENT, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
        >
          {t('duelCrossLink.readTheirPraxis')}
          <span aria-hidden="true">&rsaquo;</span>
        </Link>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* The frame                                                                   */
/* -------------------------------------------------------------------------- */

export interface DuelReaderFrameProps {
  state: DuelReaderState
  /**
   * The faction whose ground dresses the whole frame. The TASK's faction — see
   * the header for why that is what the one-ground ruling means here.
   */
  groundSlug: string | null
  dress?: DuelReaderDress
}

/**
 * The page: breadcrumb, title, standing, then both entries.
 *
 * Desktop draws them two-up. The phone stacks them and opens exactly one — see
 * {@link openSideFor} for which, and why.
 */
export function DuelReaderFrame({ state, groundSlug, dress = {} }: DuelReaderFrameProps) {
  const { t } = useTranslation('praxis')
  const mobile = useFormFactor() === 'mobile'
  const { duel, praxes, arrivedFrom } = state
  // The open panel is seeded once, from the standing as it stood on arrival.
  // Re-deriving it as votes land would reopen the panel under the reader's
  // hands; the ruling is about which case you are shown FIRST.
  const [open, setOpen] = useState<DuelSideKey | null>(null)

  if (!duel || !praxes) return null

  const entries: readonly [DuelReaderEntry, DuelReaderEntry] = [
    { key: 'challenger', side: duel.challenger, praxis: praxes.challenger },
    { key: 'opponent', side: duel.opponent, praxis: praxes.opponent },
  ]
  const openKey = open ?? openSideFor(duel, arrivedFrom)

  return (
    <div style={{ fontFamily: FACE, color: INK, ...dress.pageStyle }}>
      {/*
        `Tasks › <task>`. The canvas draws a third crumb, `The duel`, and
        `Breadcrumb`'s prop union has no shape for a page that hangs off a task
        without being a praxis or the composer. Widening it is another lane's
        file, so the trail stops one crumb short and the page title carries the
        word instead. DEVIATION, per docs/agents/design-fidelity.md.
      */}
      <Breadcrumb taskId={praxes.challenger.task_id} taskTitle={praxes.challenger.task_title} />

      <div
        style={{
          // The nine roles, declared once for the whole surface. Dynamic slug:
          // the ground is whichever faction owns the task, including `na`,
          // Albescent and a slug the server invents tomorrow (ADR-0089).
          ...factionRoleVars(groundSlug, 'duel-reader'),
          position: 'relative',
          maxWidth: 1200,
          marginInline: 'auto',
          background: PAPER,
          color: INK,
          border: `1px solid ${LINE}`,
          borderRadius: RADIUS,
          padding: mobile ? 'var(--space-lg)' : 'var(--space-2xl)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          ...dress.frameStyle,
        }}
      >
        <span
          aria-hidden="true"
          className="spectrum-rule"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}
        />

        <h1
          className="font-display italic"
          style={{
            margin: '0 0 var(--space-md)',
            fontWeight: 700,
            fontSize: mobile ? 'var(--text-heading)' : 'var(--text-display)',
            lineHeight: 1.08,
            color: INK,
            ...dress.headingStyle,
          }}
        >
          {t('duelCrossLink.label')}
        </h1>

        <Standing duel={duel} entries={entries} />

        {mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {entries.map((entry) => (
              <section
                key={entry.key}
                style={{ border: `1px solid ${LINE}`, borderRadius: RADIUS, overflow: 'hidden' }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(entry.key)}
                  aria-expanded={openKey === entry.key}
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: HEADER_MIN,
                    padding: 'var(--space-md)',
                    background: PAPER,
                    border: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <Byline
                    entry={entry}
                    duel={duel}
                    dress={dress}
                    chevron={
                      // The only affordance. The catalog has no word for
                      // "collapse" and the design is explicit it needs none.
                      <span aria-hidden="true" className="content-text" style={{ color: QUIET }}>
                        {openKey === entry.key ? '⌄' : '›'}
                      </span>
                    }
                  />
                </button>
                {openKey === entry.key && (
                  <div style={{ padding: 'var(--space-lg)', borderTop: `1px solid ${LINE}` }}>
                    <Column
                      entry={entry}
                      duel={duel}
                      state={state}
                      dress={dress}
                      withByline={false}
                    />
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              // Two even tracks, `minmax(0, …)` so a long word cannot push a
              // column past the frame. The hairline between them is a track.
              gridTemplateColumns: `minmax(0, 1fr) 1px minmax(0, 1fr)`,
              alignItems: 'stretch',
            }}
          >
            <Column
              entry={entries[0]}
              duel={duel}
              state={state}
              dress={dress}
              withByline
              gutter="left"
            />
            <div aria-hidden="true" style={{ background: LINE }} />
            <Column
              entry={entries[1]}
              duel={duel}
              state={state}
              dress={dress}
              withByline
              gutter="right"
            />
          </div>
        )}
      </div>
    </div>
  )
}
