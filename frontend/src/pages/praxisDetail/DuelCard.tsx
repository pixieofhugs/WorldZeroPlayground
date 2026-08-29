/**
 * The praxis-detail duel card (#1090, epic #1085; design project bebdf7c7,
 * `Unaffiliated Praxis Detail.dc.html`). Successor to `DuelCrossLink` and the
 * duel rail.
 *
 * ## Detail narrates OUTCOMES, not the run-up
 *
 * The rail carried the whole duel lifecycle — cast roster, next-step line,
 * stakes tiles and a branch per `DuelStatus`. #1071 (ADR-0059) moved the run-up
 * onto the composer's waiting surface, so this card renders in exactly two
 * statuses, `settled` and `resolved`, and reads out three things:
 *
 *  - **live** (`settled`) — "<name> leads by 2.6 · live". The winner FLOATS with
 *    the votes until era close (ADR-0011/0052); nothing here may phrase it as
 *    decided, which is why the shipped `duelCrossLink.live` sentence is reused
 *    whole rather than trimmed to the leader's name.
 *  - **won by default** (`forfeited_by_character_id` set) — the forfeiter's row
 *    dims to an em-dash. Their total is ABSENT, not losing: once a side
 *    forfeits, the tally stops deciding the duel (`services/duel_outcome.py`
 *    checks the forfeit before it ever looks at points), so printing their
 *    points would be printing a number that no longer means anything.
 *  - **final** (`resolved`) — the frozen pair, or the no-contest line where the
 *    duel never became votable before era close.
 *
 * ## Two states draw nothing at all
 *
 *  - **`declined`** — the challenge was refused, the praxis is an ordinary
 *    `type=solo` and takes no duel multiplier (ADR-0011; `praxis_scoring.py`
 *    only picks up active/settled duels). The rail drew a "they declined" line;
 *    dropping it is the point of this issue, not an oversight. There is no duel,
 *    so the page says nothing about one.
 *  - **`pending` / `active`** — the run-up, which belongs to the composer. Note
 *    it is still REACHABLE here: a duel side that has cast is `submitted` with
 *    the duel `active`, so ADR-0062's published-only redirect does not catch it,
 *    and `duel_side_hidden_condition` (`services/praxis_visibility.py`) leaves
 *    the AUTHOR
 *    able to load their own live side. They get the composer's waiting surface
 *    at `/praxis/{id}/edit`, which narrates the wait properly; a second, thinner
 *    account of the same beat here is the one-state-two-owners problem ADR-0062
 *    exists to prevent.
 *
 * ## One card, moved — never two copies
 *
 * The design doc repeats the card markup byte-for-byte in its mobile and desktop
 * blocks to show both positions. That is doc convenience: this is ONE component,
 * mounted by `DefaultPraxisDetail` in the aside on desktop and above the proof on
 * mobile, exactly as #1088 did for the score block.
 *
 * ## Both rows are named; no row is "You"
 *
 * The rail spent #999 fixing a "You" that was resolved from which PAGE you were
 * on. This card sidesteps that class of bug outright — both rows carry a
 * `display_name`, so no viewer can be mislabelled and party/spectator copy
 * collapses to one vocabulary. Which side is which comes from the PRAXIS, not
 * the viewer: the card sits on one side's page, so the cross-link must point
 * away from it.
 *
 * ## Dress
 *
 * Chrome (`style`) and section head (`heading`) are handed in by the archetype,
 * the way `PraxisDetailComments` takes its heading — so the eight faction
 * designs of epic #1085 mount the same card inside their own panel.
 *
 * Those two seams were not enough (#1153). A skin could set the frame and the
 * label and could not reach the duellist names, their totals or the verdict
 * line, so a fully dressed faction page carried a patch of Default furniture in
 * the slot the v2 designs place most prominently in the aside — reported
 * independently by the Coven, S.N.I.D.E., Singularity and UA builds. `ink` is
 * the third seam: see {@link DuelCardInk}. Every field defaults to the
 * `--faction-default-*` token this file used to hardcode, so a faction that
 * passes nothing renders exactly as before, and every value on both sides of
 * that default flips light/dark through the `[data-theme="dark"]` cascade with
 * no `dark ?` branch.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../utils/media'
import { formatPoints } from '../../utils/points'
import { factionRoleVar } from '../../utils/factionRoles'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import type { PraxisDetailState } from './usePraxisDetail'

/** Ornament geometry — the drawn diameter of one duellist's disc. */
const AVATAR_SIZE = 30

/**
 * The card's paint slots, so a faction skin dresses the rows it mounts (#1153).
 *
 * Every field is optional and every one falls back to the `--faction-default-*`
 * token this file used to hardcode, so an unregistered faction — and any skin
 * that passes no `ink` — is byte-identical to the shipped card. Pass tokens the
 * skin already owns; this seam is a place to REPOINT existing inks, never a
 * reason to mint one.
 *
 * ## Nothing here may carry an opponent's faction hue
 *
 * The rival's faction colour can be ANY hue in the palette, so WOW's standing
 * rule (WORLD_ZERO_STYLE §3/§6, #895) holds it as a **rosette ring, a plate edge
 * or a bar — never as an ink and never behind text**, which is what lets a
 * hostile hue sit inside cream-and-gold chrome with no contrast fix. `name`,
 * `total` and `muted` are all `color:`, and `plate` sits directly behind a
 * duellist's disc; none of them is a legal home for `accent`/`soft` off a duel
 * payload, or for `factionCssVar(rival.faction_slug, …)`.
 *
 * The structural guard that used to assert this died with the duel rail (#1090);
 * #1115 restored it on the seal skins and #1308 restored it HERE, where it
 * belongs — `__tests__/duelCardOpponentInk.test.tsx` walks the whole
 * `surfaceMap('praxisDetail')` registry with a foreign rival and fails any
 * archetype that lands one of the opponent's tokens in a `color:` or a
 * `background:`. `line` is the exception the rule already grants: a hairline or a
 * disc outline IS the "plate edge", so an edge in the rival's hue is legal and
 * the guard only reads inks and grounds. Nothing else about this comment is
 * advisory any more.
 */
interface DuelCardInk {
  /** The duellist's name. Default `--faction-default-card-text`. */
  name?: string
  /** A side's total, and the em-dash standing in for an absent one. Default `--faction-default-card-text`. */
  total?: string
  /** The cross-link subtitle, its chevron and the verdict line. Default `--faction-default-card-muted`. */
  muted?: string
  /** The two hairline rules and the rival disc's outline. Default `--faction-default-card-line`. */
  line?: string
  /** The fill behind a duellist with no avatar. Default `--faction-default-stamp-bg`. */
  plate?: string
}

/**
 * What the card paints when a skin hands in nothing — the `na` kit, unchanged.
 *
 * A ROOTLESS PIECE TAKES `factionRoleVar`, NOT A PREFIX (#2672, the rule lane
 * 04 settled). This card renders under nine different hosts and owns no root of
 * its own, so it has nowhere to spread `factionRoleVars` — and a prefix of its
 * own would be a namespace standing between the vocabulary and every host,
 * which IS the `--kit-*` namespace `WORLD_ZERO_STYLE.md:1179` declines. Taking
 * the host's prefix as a prop would be tree work, not a paint lane's.
 *
 * So the three core roles resolve through the map directly. There is no
 * fallback arm here and nothing to keep in step: `factionRoleVar('na', 'ink')`
 * IS `var(--faction-default-card-text)`, computed rather than transcribed.
 *
 * `line` and `plate` stay named. Neither is a core role — the card's hairline
 * is `-card-line`, not the `line` role's `-card-border`, and a stamp ground is
 * not `paper` — so repointing either would be a repaint (decision 07).
 */
const DEFAULT_INK: Required<DuelCardInk> = {
  name: factionRoleVar('na', 'ink'),
  total: factionRoleVar('na', 'ink'),
  muted: factionRoleVar('na', 'quiet'),
  line: 'var(--faction-default-card-line)',
  plate: 'var(--faction-default-stamp-bg)',
}

/**
 * Field-by-field rather than a spread: `{...DEFAULT_INK, ...ink}` would let an
 * explicit `undefined` in a partially-filled object erase a default.
 */
function resolveInk(ink?: DuelCardInk): Required<DuelCardInk> {
  return {
    name: ink?.name ?? DEFAULT_INK.name,
    total: ink?.total ?? DEFAULT_INK.total,
    muted: ink?.muted ?? DEFAULT_INK.muted,
    line: ink?.line ?? DEFAULT_INK.line,
    plate: ink?.plate ?? DEFAULT_INK.plate,
  }
}

/** The dash a side with no total wears. Ornament, not copy. */
const NO_SCORE = '—'

/**
 * One duellist's disc. `ringed` is the page's own side — a spectrum ring, the na
 * tell; the rival is outlined instead, so the foreign side reads as foreign the
 * way the rail's opponent tokens used to.
 */
function SideAvatar({
  side,
  ringed,
  ink,
}: {
  side: DuelSideOut
  ringed: boolean
  ink: Required<DuelCardInk>
}) {
  const shell: CSSProperties = {
    display: 'block',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    // The ring is NOT an ink slot. It is the spectrum — the na "you are here"
    // tell (ADR-0039), which reads on every one of the nine grounds and is not
    // the page faction's colour, let alone the rival's.
    background: ringed ? 'var(--faction-default-rainbow)' : ink.plate,
    border: ringed ? 'none' : `1px solid ${ink.line}`,
    boxSizing: 'border-box',
  }
  if (!side.avatar_url) return <span aria-hidden style={shell} />
  return (
    <span aria-hidden style={shell}>
      <img
        src={mediaUrl(side.avatar_url)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      />
    </span>
  )
}

/**
 * One row of the card: disc, italic name (over the cross-link subtitle where
 * there is one), and the side's total right-aligned.
 *
 * `dimmed` is the forfeiter's row. It is the ONE thing that changes above the
 * footer, and it changes together with the score falling to an em-dash.
 */
function DuelRow({
  side,
  score,
  ringed,
  dimmed,
  subtitle,
  ink,
}: {
  side: DuelSideOut
  score: string
  ringed: boolean
  dimmed: boolean
  subtitle?: ReactNode
  ink: Required<DuelCardInk>
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <SideAvatar side={side} ringed={ringed} ink={ink} />
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div
          className="font-display italic content-text"
          style={{
            color: ink.name,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {side.display_name}
        </div>
        {subtitle}
      </div>
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, color: ink.total, flexShrink: 0 }}
      >
        {score}
      </span>
    </div>
  )
}

/**
 * Which side of the duel this praxis IS, and who the rival is.
 *
 * Resolved from the praxis rather than the viewer on purpose: the card's whole
 * job below the fold is a cross-link, and a link that pointed at the page it is
 * already on would be useless. `challenger` is the fallback for the one shape
 * where neither side names this praxis — a thrown side whose `praxis_id` has
 * been dropped — which ADR-0062 redirects away from anyway.
 */
function sidesForPraxis(
  duel: DuelDetailOut,
  praxisId: number,
): { mine: DuelSideOut; rival: DuelSideOut } {
  return duel.opponent.praxis_id === praxisId
    ? { mine: duel.opponent, rival: duel.challenger }
    : { mine: duel.challenger, rival: duel.opponent }
}

interface DuelCardProps {
  state: PraxisDetailState
  /** The archetype's panel chrome, so a faction skin dresses the card as its own. */
  style?: CSSProperties
  /** The archetype's section head, mounted inside the card as its label. */
  heading?: ReactNode
  /**
   * The archetype's inks for the rows the card draws itself — names, totals,
   * verdict, hairlines. Omit it and the card paints the `na` kit exactly as it
   * always has. **Never an opponent's faction hue**: see {@link DuelCardInk}.
   */
  ink?: DuelCardInk
}

export function DuelCard({ state, style, heading, ink }: DuelCardProps) {
  const { t } = useTranslation('praxis')
  const paint = resolveInk(ink)
  const { praxis, duel } = state
  if (!praxis || !duel) return null

  // Outcomes only. `declined` draws nothing because there is no duel to read
  // out; `pending` / `active` draw nothing because the composer's waiting
  // surface owns the run-up (see the header).
  if (duel.status !== 'settled' && duel.status !== 'resolved') return null

  const { mine, rival } = sidesForPraxis(duel, praxis.id)
  const forfeitedBy = duel.forfeited_by_character_id

  // The FROZEN pair, once the era closed (ADR-0052). Either figure may be null
  // on a no-contest — a duel that never became votable — in which case there is
  // no pair to print and the footer says so.
  const resolved = duel.status === 'resolved'
  const mineIsChallenger = mine.character_id === duel.challenger.character_id
  const mineFinal = mineIsChallenger ? duel.challenger_final_points : duel.opponent_final_points
  const rivalFinal = mineIsChallenger ? duel.opponent_final_points : duel.challenger_final_points
  const frozenPair = resolved && mineFinal != null && rivalFinal != null

  /**
   * A side's total, or the em-dash where it has none. A forfeiter's total is
   * absent by rule (see the header), which is checked before the frozen pair
   * because a forfeit survives era close.
   *
   * `formatPoints` rather than a local `toFixed`: this figure sits on the same
   * page as `ScoreStamp`'s total and has to read the same way (#1866). A duel
   * margin is the difference of two such figures, so it takes the same shape.
   */
  const scoreFor = (side: DuelSideOut, frozen: number | null): string => {
    if (forfeitedBy != null && side.character_id === forfeitedBy) return NO_SCORE
    if (resolved) return frozen != null ? formatPoints(frozen) : NO_SCORE
    return formatPoints(side.points_from_votes)
  }

  // ── The one footer verdict line ───────────────────────────────────────────
  // Every reading is one sentence from the shipped `duelCrossLink.*` catalog.
  // It sits at the CONTENT tier, not the design's 10px: it is a status
  // explanation, which WORLD_ZERO_STYLE §4's role vocabulary puts on the 18px
  // floor, and duel narration sinking below that floor is exactly what #769 was.
  let verdict: string
  if (forfeitedBy != null) {
    verdict = t('duelCrossLink.wonByDefault')
  } else if (resolved) {
    verdict = frozenPair
      ? t('duelCrossLink.final', {
          standing:
            duel.winner_character_id == null
              ? t('duelCrossLink.finalStanding.tied')
              : t('duelCrossLink.finalStanding.won', {
                  name:
                    duel.winner_character_id === mine.character_id
                      ? mine.display_name
                      : rival.display_name,
                }),
        })
      : t('duelCrossLink.finalNoContest')
  } else {
    const margin = mine.points_from_votes - rival.points_from_votes
    verdict = t('duelCrossLink.live', {
      standing:
        margin === 0
          ? t('duelCrossLink.standing.tied')
          : t('duelCrossLink.standing.leads', {
              name: margin > 0 ? mine.display_name : rival.display_name,
              margin: formatPoints(Math.abs(margin)),
            }),
    })
  }

  const hairline = `1px solid ${paint.line}`

  // The rival's row is the cross-link. A forfeiter's thrown side is back to
  // `in_progress`, so this 404s — deliberately left as a plain <Link>, which
  // degrades gracefully and never breaks the page around it.
  const rivalRow = (
    <DuelRow
      side={rival}
      score={scoreFor(rival, rivalFinal)}
      ringed={false}
      dimmed={forfeitedBy != null && rival.character_id === forfeitedBy}
      ink={paint}
      subtitle={
        rival.praxis_id != null ? (
          <span className="label-caption" style={{ color: paint.muted }}>
            {t('duelCrossLink.readTheirPraxis')}
          </span>
        ) : undefined
      }
    />
  )

  return (
    <section style={style}>
      {heading}

      <DuelRow
        side={mine}
        score={scoreFor(mine, mineFinal)}
        ringed
        dimmed={forfeitedBy != null && mine.character_id === forfeitedBy}
        ink={paint}
      />

      <div style={{ borderTop: hairline, marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
        {rival.praxis_id != null ? (
          <Link
            to={`/praxis/${rival.praxis_id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              textDecoration: 'none',
            }}
          >
            {/* A div, not a span: `DuelRow` is flow content and a span may not
                wrap it. `<a>` takes transparent content, so the row nests fine. */}
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>{rivalRow}</div>
            <span
              aria-hidden
              className="content-text"
              style={{ color: paint.muted, flexShrink: 0 }}
            >
              ›
            </span>
          </Link>
        ) : (
          rivalRow
        )}
      </div>

      <div style={{ borderTop: hairline, marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
        <p
          className="font-body content-text"
          style={{ margin: 0, color: paint.muted }}
        >
          {verdict}
        </p>
      </div>
    </section>
  )
}

export default DuelCard
