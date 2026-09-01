/**
 * The settled-duel side-by-side reader's chassis (#1084; design
 * `.design-sync/duel-1084/Duel Side-by-Side Reader.dc.html`, turn 2).
 *
 * SPIKE — see the `keep/duel-reader-1084` tag's message. This compiled and the
 * suites around it were green, but it is NOT a finished surface: there is no
 * route, no registry row, no per-faction archetype and no ADR. Read #1084's
 * build brief before continuing it.
 *
 * Reading a duel used to mean two page loads — each side its own praxis page,
 * joined by `DuelCrossLink`. This is the one frame that holds both entries.
 *
 * ## Why a chassis and not nine pages
 *
 * The design's own reason for splitting turn 1 into turn 2 is that it *"gives
 * the other eight factions a shape to inherit"*. Both columns are **identical in
 * kind** — disc, name, sealed mark, sigil, title, date, proof, body, vote, link
 * out — and *"nothing belongs to one duellist more than the other"*. That
 * invariance is the whole surface, so it lives here once and a skin supplies
 * paint through {@link DuelReaderDress}. This is the shape #2993's ruling asks
 * for in general: every faction on one chassis, each keeping a distinct look.
 *
 * ## One responsive component (ADR-0069, #1313) — NEEDS ITS OWN RECORD
 *
 * This file owns the ONLY form-factor branch, exactly as `DuelSealSheet` does
 * for the seal. There is no phone archetype and no parallel mobile registry: a
 * skin passes dress and never a breakpoint.
 *
 * `factions/manifest.ts` requires a record for this: *"the next surface needs
 * its own record, the same way."* It is not written — take the next free ADR
 * number at authoring time, never one quoted in an issue.
 *
 * ## One ground, two sigils (owner ruling 2026-08-27)
 *
 * The frame takes the ground of **the side you arrived from** — one faction
 * dress for the whole page — and each duellist's own faction is carried by their
 * `FactionSigil`. So the two players still read as two factions without the page
 * becoming a seam between two kits. `groundSlug` is that arrived-from side's.
 *
 * ## Copy is faction-neutral, without exception (§0)
 *
 * Every string here comes from the shared `duelCrossLink.*` / `detail.*`
 * catalogs and is identical across all nine skins. A skin dresses this surface
 * and never rewords it — see `.design-sync/BRIEF-duel-surfaces.md` §0, which
 * holds without exception since #1909.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionSigil from '../../components/sigil/FactionSigil'
import VoteUI from '../../components/vote/VoteUI'
import { useFormFactor } from '../../hooks/useFormFactor'
import { mediaUrl } from '../../utils/media'
import { factionRoleVars, factionRoleVar } from '../../utils/factionRoles'
import { duelScoreFor, hasForfeited } from '../../components/duel/standing'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import { openSideFor, type DuelSideKey } from './openSide'

/** The surface's own role prefix. No two surfaces may share one (#2672). */
export const DUEL_READER_PREFIX = 'duel-reader'

const role = (name: string): string => `var(--${DUEL_READER_PREFIX}-${name})`

/** Minimum tap target for a collapsed header, per the design. */
const HEADER_MIN = 44

/**
 * One entry, as the route assembles it.
 *
 * The praxis half is separate from the duel half because `get_duel_detail`
 * carries no body by construction — the route fetches each side's praxis under
 * `can_view_praxis` and pairs them up here.
 */
export interface DuelReaderEntry {
  side: DuelSideOut
  /** Which of the payload's two named sides this is. */
  key: DuelSideKey
  title: string
  body: ReactNode
  /** The proof gallery, already built by the caller. Omitted when there is none. */
  proof?: ReactNode
  /** The filed-on line, already formatted. */
  filed: string
  praxisId: number
  points: number | null
  totalVotes: number
  viewerCanVote: boolean
}

/**
 * A skin's paint. Every field is optional and the chassis falls back to the
 * faction role map, so an archetype that passes nothing still wears its own
 * faction — the roles are already spread on the frame's root.
 */
export interface DuelReaderDress {
  /** The page wrapper — the skin's body face and ink. */
  pageStyle?: CSSProperties
  /** The frame around both columns. */
  frameStyle?: CSSProperties
  /** One entry's column. */
  columnStyle?: CSSProperties
  /** The standing line above both columns. */
  standingStyle?: CSSProperties
  /** An entry's title. */
  titleStyle?: CSSProperties
  /** The byline row — name, figure, sigil. */
  bylineStyle?: CSSProperties
  /** Captions: the filed line, the sealed mark, the quieter half of a row. */
  quietStyle?: CSSProperties
  /** The divider a skin draws between an entry's parts. */
  rule?: (key: string) => ReactNode
  /** The mark beside a duellist who has cast. Defaults to the shared tick. */
  sealedMark?: ReactNode
  /** The link out to a single entry's own page. */
  linkStyle?: CSSProperties
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * A duellist's disc.
 *
 * Deliberately below `AlbescentAvatar`'s `RING_TURNS_AT` of 64. That ring ships
 * DORMANT by owner ruling (2026-08-23) — above every mount in the app — and its
 * own header names "a duel banner" as the surface that would light it. Lighting
 * it here would announce an Albescent membership to a viewer who was only
 * reading a duel, which is the case the gate exists to prevent (ADR-0088). The
 * design draws 44; anything at or above 64 is a reveal decision, not a size one.
 */
const DISC = 38

function Disc({ side, dimmed }: { side: DuelSideOut; dimmed: boolean }) {
  const common: CSSProperties = {
    width: DISC,
    height: DISC,
    borderRadius: '50%',
    flex: 'none',
    opacity: dimmed ? 0.55 : 1,
  }
  if (side.avatar_url) {
    return (
      <img
        src={mediaUrl(side.avatar_url)}
        alt=""
        style={{ ...common, objectFit: 'cover' }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...common,
        background: role('paper'),
        border: `1px solid ${role('line')}`,
        color: role('quiet'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
      }}
    >
      {initials(side.display_name)}
    </span>
  )
}

interface BylineProps {
  entry: DuelReaderEntry
  score: string
  dimmed: boolean
  dress: DuelReaderDress
  /** The chevron a collapsed header carries. Absent on desktop. */
  chevron?: ReactNode
}

/**
 * The row that survives a collapse — disc, name, figure, sigil.
 *
 * The design is explicit that a collapsed header *"stays a full row of
 * information … so the comparison survives the collapse"*. It is therefore the
 * same component open or shut, and the phone view mounts it as the button.
 */
function Byline({ entry, score, dimmed, dress, chevron }: BylineProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: HEADER_MIN,
        ...dress.bylineStyle,
      }}
    >
      <Disc side={entry.side} dimmed={dimmed} />
      <span style={{ color: role('ink'), fontWeight: 500 }}>{entry.side.display_name}</span>
      <FactionSigil slug={entry.side.faction_slug} size={22} />
      <span style={{ marginLeft: 'auto', color: role('ink') }}>{score}</span>
      {chevron}
    </div>
  )
}

/**
 * One entry, in full.
 *
 * The vote panel is pinned to the foot with `margin-top: auto` so two unequal
 * bodies still leave the two casters level — the design calls that out, and it
 * is the reason this column is a flex column rather than a block.
 */
function Column({
  entry,
  duel,
  dress,
  votable,
}: {
  entry: DuelReaderEntry
  duel: DuelDetailOut
  dress: DuelReaderDress
  votable: boolean
}) {
  const { t } = useTranslation('praxis')
  const dimmed = hasForfeited(duel, entry.side)
  const score = duelScoreFor(duel, entry.side)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 0,
        opacity: dimmed ? 0.6 : 1,
        ...dress.columnStyle,
      }}
    >
      <Byline entry={entry} score={score} dimmed={dimmed} dress={dress} />
      {dress.rule?.('byline')}

      <h2 style={{ margin: 0, color: role('ink'), ...dress.titleStyle }}>{entry.title}</h2>
      <p className="label-caption" style={{ margin: 0, color: role('quiet'), ...dress.quietStyle }}>
        {entry.filed}
      </p>

      {entry.proof}
      <div className="content-text" style={{ color: role('ink') }}>
        {entry.body}
      </div>

      {/*
        Pinned to the foot, and only while the era is open. `resolved` removes
        the caster rather than disabling it — there is nothing left to vote on,
        and a dead control is not the same statement as no control.
      */}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        {votable && (
          <VoteUI
            praxisId={entry.praxisId}
            points={entry.points}
            totalVotes={entry.totalVotes}
            viewerCanVote={entry.viewerCanVote}
          />
        )}
        <Link
          to={`/praxis/${entry.praxisId}`}
          style={{ color: role('accent'), ...dress.linkStyle }}
        >
          {t('duelCrossLink.readTheirPraxis')}
        </Link>
      </div>
    </div>
  )
}

export interface DuelReaderFrameProps {
  duel: DuelDetailOut
  /** The two entries, in payload order: challenger first. */
  entries: readonly [DuelReaderEntry, DuelReaderEntry]
  /**
   * The faction whose ground dresses the whole frame — the side the reader
   * arrived from (owner ruling 2026-08-27), or `null` on a deep link.
   */
  groundSlug: string | null
  /** Which side the reader arrived from, for the phone open-panel ruling. */
  arrivedFrom: DuelSideKey | null
  /** The one verdict sentence, already selected by `duelVerdict`. */
  standing: string
  breadcrumb?: ReactNode
  dress?: DuelReaderDress
}

/**
 * The frame: a standing line, then both entries.
 *
 * Desktop draws them two-up. Phone stacks them and opens exactly one — see
 * {@link openSideFor} for which, and why.
 */
export function DuelReaderFrame({
  duel,
  entries,
  groundSlug,
  arrivedFrom,
  standing,
  breadcrumb,
  dress = {},
}: DuelReaderFrameProps) {
  const { t } = useTranslation('praxis')
  const mobile = useFormFactor() === 'mobile'
  const [open, setOpen] = useState<DuelSideKey>(() => openSideFor(duel, arrivedFrom))

  // Casters exist only while the era is open. Both panels go at `resolved`.
  const votable = duel.status === 'settled'

  const standingRow = (
    <p
      className="content-text"
      style={{ margin: 0, color: role('quiet'), ...dress.standingStyle }}
    >
      {standing}
    </p>
  )

  return (
    <div
      style={{
        ...factionRoleVars(groundSlug, DUEL_READER_PREFIX),
        background: role('paper'),
        color: role('ink'),
        fontFamily: role('face'),
        ...dress.pageStyle,
      }}
    >
      {breadcrumb}
      <h1 style={{ margin: 0, color: role('ink') }}>{t('duelCrossLink.label')}</h1>
      {standingRow}

      <div
        style={{
          display: mobile ? 'block' : 'grid',
          // Two even tracks, `minmax(0, …)` so a long word cannot push a column
          // past the frame. Mobile stacks single-column and never grids.
          gridTemplateColumns: mobile ? undefined : 'repeat(2, minmax(0, 1fr))',
          gap: 24,
          alignItems: 'stretch',
          ...dress.frameStyle,
        }}
      >
        {entries.map((entry) =>
          mobile ? (
            <section key={entry.key}>
              <button
                type="button"
                onClick={() => setOpen(entry.key)}
                aria-expanded={open === entry.key}
                style={{
                  width: '100%',
                  minHeight: HEADER_MIN,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <Byline
                  entry={entry}
                  score={duelScoreFor(duel, entry.side)}
                  dimmed={hasForfeited(duel, entry.side)}
                  dress={dress}
                  chevron={
                    // The only affordance. The catalog has no word for
                    // "collapse" and the design is explicit it needs none.
                    <span aria-hidden="true" style={{ color: role('quiet') }}>
                      {open === entry.key ? '⌄' : '›'}
                    </span>
                  }
                />
              </button>
              {open === entry.key && (
                <Column entry={entry} duel={duel} dress={dress} votable={votable} />
              )}
            </section>
          ) : (
            <Column key={entry.key} entry={entry} duel={duel} dress={dress} votable={votable} />
          ),
        )}
      </div>
    </div>
  )
}

/** The neutral ground a skin inherits when it overrides nothing. */
export const duelReaderNeutral = (slug: string | null): string =>
  factionRoleVar(slug ?? 'na', 'paper')
