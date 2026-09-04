/**
 * Shared behavior module for praxis-detail archetypes: ADR-0002's content-slot
 * invariant, re-cut for this surface by ADR-0061 (the layout is the contract)
 * and ADR-0064 (the page owns its chrome). ADR-0017 §2 set this module up and
 * is now marked **Superseded by ADR-0061** — do not cite it as live authority.
 *
 * These slots are faction-agnostic: every archetype must RENDER each one,
 * and none of them may drop one (ADR-0061 — arrange freely, drop nothing).
 * They are extracted here so no archetype re-implements the guards, handlers
 * or chrome.
 *
 * "Rendered IDENTICALLY" is what this used to say, and #2718 made it false.
 * Most slots here still take `state` and nothing else and do render
 * identically — but three take the archetype's dress through props
 * (`MemberByline`'s `linkStyle`, `PraxisDetailComments`' `heading` and
 * `style`), and `PraxisStatusBanners` joined them with two ink props for the
 * flagged notice. The invariant is the SLOT, not the pixels: what may not
 * vary is that the node exists, what it says, and when it is gated on. A skin
 * may still bring dress, which is the whole of ADR-0061's bargain.
 *
 * Invariant slots owned here:
 *   - Admin moderation bar
 *   - Failed note (ADR-0062 removed the open-state banners: detail is
 *     published-only, so there is no IN EDITING / PENDING PUBLISH to draw; the
 *     crown hero went with #1710 and the mark lives on the score stamp)
 *   - Flagged notice (#2718 — the third moderation state, which had no slot
 *     here and so was re-typed by all eight dressed archetypes)
 *   - Owner actions (reopen)
 *   - Comments region (ADR-0061)
 *   - Voter breakdown
 *   - Flag block
 *
 * EVERY SLOT HERE STARTS FROM A PUBLISHED PRAXIS. ADR-0062 redirects both open
 * statuses to the composer, so `in_progress` and `pending` are unreachable on
 * this page; #1089 pruned the branches that only those statuses could reach (the
 * collab cast roster, the byline's per-member cast markers, and the green CAST
 * control with its waiting twin). Do not reintroduce a status branch here —
 * anything about an open praxis belongs to the composer's waiting surface
 * (#1071).
 *
 * The score readout that used to live at the bottom of this module — the LEGACY
 * `PraxisScoreBreakdown` / `praxisBreakdownParts` pair — is gone too. Its
 * fourteen callers were exactly the fourteen archetypes #1089 deleted, and the
 * dispatched `ScoreStamp` over `scoreBreakdown()` (ADR-0053) replaced it on the
 * rebuilt page in #1091. Mount `ScoreStamp`; do not re-derive points here.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import CommentThread from '../../components/comments/CommentThread'
import DuelSealConfirm from '../../components/duel/DuelSealConfirm'
import type { PraxisDetailState } from './usePraxisDetail'
import { UNSCORED_MODERATION_STATUSES } from '../../api/praxis'
import type { PraxisMemberOut, PraxisOut } from '../../api/praxis'
import type { DuelDetailOut } from '../../api/duel'
import { flagReasonOptions } from '../../utils/flagReasons'
import { factionCssVar } from '../../utils/factions'
import { stampRestatesTaskPoints } from '../../utils/praxis'
import { formatPoints } from '../../utils/points'
import type { TFunction } from 'i18next'

/**
 * Whether this praxis's score was actually banked (#1444).
 *
 * `ScoreStamp` renders nothing on a `failed` or `hidden` praxis: #1373 ruled
 * those bank no points, and a mark naming a total nobody holds is simply false.
 * Every archetype wraps its stamp in a HEADED panel, so the dispatcher's null
 * would leave eight empty "Score" sections behind it — the panel goes with the
 * mark. One predicate for both, so the page and the stamp cannot come to
 * disagree about which praxes have a score to show.
 *
 * The honest signal survives here: {@link PraxisStatusBanners} draws the failed
 * banner on this page too, keyed on the STATUS alone (#1538) — so suppressing
 * the stamp never leaves the page silent about a moderation decision, whether or
 * not the admin wrote a note.
 */
export function scoreWasBanked(praxis: PraxisOut): boolean {
  return !UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)
}

/**
 * The trailing half of the task-reference band — "Level 3 · 30 pts" (#1833).
 *
 * All eight dressed pages copy this band rather than compose it from a slot,
 * each in its own faction ink, and all eight were printing the task's points
 * beside a score rail printing the same figure as its total. The band's ink and
 * placement stay the archetype's; only its TEXT is shared, which is the smallest
 * thing that stops the rule drifting apart eight ways.
 *
 * The points half drops when {@link stampRestatesTaskPoints} says the rail
 * already prints that figure — #1131's rule, reached through the value
 * `scoreBreakdown` publishes. It returns on its own the moment votes land or a
 * multiplier is non-neutral, because then the two figures answer different
 * questions, and it never leaves on a praxis whose rail is gone (`failed` /
 * `hidden`, #1444) — there the band is the only points readout the page has.
 *
 * Returns a plain string: the separator is the band's own punctuation, not a
 * slot, and every archetype already wrapped both halves in one styled `<span>`.
 */
export function taskRefMeta(praxis: PraxisOut, t: TFunction<'praxis'>): string {
  const level = t('detail.taskRef.level', { level: praxis.task_level_required })
  if (stampRestatesTaskPoints(praxis)) return level
  return `${level} · ${t('detail.taskRef.points', { points: praxis.task_point_value, count: praxis.task_point_value })}`
}

// ── The detail WALL's alarm inks (#1451) ─────────────────────────────────────
//
// Praxis detail is one shared page every faction dresses (ADR-0061), so the
// slots below paint onto NINE different grounds. `--color-danger` and
// `--color-warning` were chosen against the app's near-white page, and measured
// on the walls those skins actually paint they miss AA on every one of them in
// light — 3.11:1 on the Ephemerists papyrus up to 4.41:1 on the na sheet, with
// Everymen also short at 4.47:1 in dark. That is #1302's shape, third instance:
// a shared component inside a faction frame takes the faction's own card ink
// family rather than a global functional one, resolved off the SAME slug the
// archetype was dispatched on (`task_faction_slug`, see `pages/PraxisDetail`).
//
// THIS IS NOT A DRESS SEAM, which is why it does not reopen ADR-0061. No skin
// supplies these two and none can: the ink is a function of the ground, the
// ground is a function of the slug, and the slug is already in `state`. The
// wash and the rule stay the neutral `--color-danger-*` rungs (#1169) on every
// skin — danger is the platform speaking, and only the paper under it is the
// faction's.
//
// The line above used to read "no prop exists to supply it through", and #2718
// falsified the general form of that: `PraxisStatusBanners` now takes two ink
// props for the FLAGGED notice. The distinction is worth keeping straight,
// because it is the whole reason one of them is a seam and the other is not.
// The failed banner's pair is DERIVED — `wallInk()` computes it from the
// praxis, so a prop could only ever restate what the function already knows,
// and letting a skin override it would be letting a skin un-measure #1451.
// The flagged notice's pair is CHOSEN: six skins want the neutral warning hue,
// Ephemerists needs its own for a measured contrast reason (#1627) and
// Singularity wants the hue on both halves. A value nobody chooses needs no
// prop; a value three skins answer differently is a seam by definition.
//
// SEVEN SKINS MINT NOTHING: `--faction-{key}-card-alarm` (#1449) and
// `-card-notice` (#694) already exist for all eight keys in both cascades and
// clear every wall they are asked for here (worst 4.56:1, the notice ink under
// the danger veil on the Ephemerists page). S.N.I.D.E. is the exception for the
// third time (#1302, #1231) and for the same §6 reason: its CARD is
// photocopier-black in both themes so both card inks are pinned bright, while
// its wall FLIPS. See `--faction-snide-wall-alarm` in index.css.
//
// WHAT IS DELIBERATELY NOT ROUTED, and the measurement that decides it. Ten of
// the fifteen alarm sites on this page are inside `PraxisAdminBar` and
// `PraxisFlagBlock`, and those do NOT sit on a faction wall — they sit on
// `.sidebar-card`, which fills with the translucent `--color-bg-surface`
// (0.72 white in light, 0.04 in dark). Composited, that is a near-white lift in
// light on EVERY skin, so the global inks are the right ones there and the
// faction inks are the wrong ones: `--faction-singularity-card-alarm` on that
// composite reads 1.00:1. What was actually broken is the GROUND — the same
// 0.72 white over Singularity's near-black terminal left `--color-danger` at
// 2.54:1, and at 4.37 / 4.45 / 4.45 on the Ephemerists, UA and deep-S.N.I.D.E.
// pages. That was #1413, a stock question rather than an ink one, and repointing
// these ten would have had to be undone by it.
//
// #1413 FIXED THE STOCK, which is why the four `.sidebar-card` mounts below also
// carry `.card-on-page`. `--color-bg-surface` is alpha, so the card had no
// ground of its own and took whatever wall it landed on; it now paints that
// frost as a layer over a DECLARED `--card-ground`, and neutral chrome names the
// app's page ground — the stock these global inks were chosen on (#1118). Every
// reading above is now 4.71:1 or better on all nine skins in both themes,
// independent of the wall, which is exactly the promise ADR-0061 makes by
// mounting moderation chrome bare in the first place.
//
// So do NOT dress these two, and do not reach for `wallInk` in them: their inks
// are correct because their stock no longer moves.
const WALL_INK: Record<string, { alarm: string; notice: string }> = {
  snide: {
    alarm: 'var(--faction-snide-wall-alarm)',
    notice: 'var(--faction-snide-wall-notice)',
  },
}

/** The destructive / cautionary ink measured on this praxis's detail wall. */
function wallInk(praxis: PraxisOut, role: 'alarm' | 'notice'): string {
  const slug = praxis.task_faction_slug ?? ''
  return WALL_INK[slug]?.[role] ?? factionCssVar(slug, `card-${role}`)
}

// ── Egalitarian byline (#387) ────────────────────────────────────────────────
//
// A published collab praxis credits every co-author, not just the creator.
// `orderedMembers` returns the praxis members with the creator first, then the
// rest by join order; `MemberByline` renders each name as a link to that
// character, joined Oxford-style (Ada / Ada & Beth / Ada, Beth & Cy). Every
// archetype keeps its own byline styling by passing its own `linkStyle` — the
// list logic lives here once. Solo/duel praxes have a single member (the
// creator is always seeded), so they render exactly one name as before.

/**
 * Members ordered for display: the creator (member whose `character_id`
 * matches `created_by_id`) first, then remaining members by `joined_at`
 * ascending. Members without a matching creator still render in join order.
 */
export function orderedMembers(praxis: PraxisOut): PraxisMemberOut[] {
  const rest = praxis.members
    .filter((member) => member.character_id !== praxis.created_by_id)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  const creator = praxis.members.find(
    (member) => member.character_id === praxis.created_by_id,
  )
  return creator ? [creator, ...rest] : rest
}

/** One face in the byline's stack of discs/plates/octagons. */
interface BylineFace {
  id: number
  name: string
  /**
   * The raw wire path, NOT a resolved URL — the archetype calls `mediaUrl()`
   * at the `img` so this stays comparable to `created_by_avatar_url` itself.
   * `''` means "draw the monogram".
   */
  avatarUrl: string
}

/**
 * Who the byline draws, and which of them has a face (#2106).
 *
 * Every archetype used to build this list inline with the same ternary, and
 * every one of them then drew initials unconditionally — which is why the top
 * of a praxis showed `H` while the comment box below it showed the portrait.
 * The rule the praxis CARD byline already follows is the one that travels here:
 * portrait when the path is non-empty, monogram otherwise. The COMPONENT does
 * not travel — `FactionAvatar` would replace eight bespoke kit monograms with
 * one generic disc, so each archetype draws the `img` inside its own frame.
 *
 * Every member has their own face since #2318. This used to carry a `ponytail:`
 * saying only the CREATOR could have one, because `PraxisMemberOut` carried no
 * avatar column — the narrow read of #2106, which left a collab byline as one
 * portrait among monograms. The upgrade path it named is the one that shipped,
 * so the special case is gone rather than merely widened.
 */
export function bylineFaces(praxis: PraxisOut): BylineFace[] {
  const members = orderedMembers(praxis)
  // `|| ''` for the same reason the card byline does it: a cached payload from
  // before #2172 has no such key, and `undefined` would reach `img src`.
  const portrait = praxis.created_by_avatar_url || ''
  if (members.length === 0) {
    return [
      {
        id: praxis.created_by_id,
        name: praxis.created_by_display_name,
        avatarUrl: portrait,
      },
    ]
  }
  return members.map((member) => ({
    id: member.character_id,
    name: member.character_display_name || `#${member.character_id}`,
    // `|| ''` for the same reason the author's path above does it: a member row
    // cached before #2318 has no such key, and `undefined` would reach `img
    // src`. It degrades to the monogram and heals on the next fetch.
    avatarUrl: member.character_avatar_url || '',
  }))
}

export function MemberByline({
  praxis,
  linkStyle,
  linkClassName,
  separatorStyle,
  renderName,
}: {
  praxis: PraxisOut
  /** Per-archetype link styling so each faction voice stays distinct. */
  linkStyle?: CSSProperties
  linkClassName?: string
  /** Falls back to `linkStyle` so `, ` / ` & ` inherit the byline's look. */
  separatorStyle?: CSSProperties
  /** Optional wrapper for each display name (e.g. Singularity's `NODE_` prefix). */
  renderName?: (name: string) => ReactNode
}) {
  const members = orderedMembers(praxis)
  const sepStyle = separatorStyle ?? linkStyle
  // NO PER-MEMBER CAST STATE HERE ANY MORE (#1089). Each name used to carry a
  // "submitted" / "drafting" marker, gated to a collab still in_progress or
  // pending. ADR-0062 redirects both statuses to the composer, so a praxis that
  // reaches this byline is always `submitted` and the marker could never paint.
  // The live answer to "who still owes their part" is the composer's roster
  // (#1071); here the byline just credits every co-author (#387).

  return (
    <span
      style={{
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {members.map((member, index) => {
        const name = member.character_display_name || `#${member.character_id}`
        return (
          <span key={member.character_id}>
            {index > 0 && (
              <span style={sepStyle}>
                {index === members.length - 1 ? ' & ' : ', '}
              </span>
            )}
            <Link
              to={`/characters/${member.character_id}`}
              className={linkClassName}
              style={linkStyle}
            >
              {renderName ? renderName(name) : name}
            </Link>
          </span>
        )
      })}
    </span>
  )
}

// ── Compact `.btn-*` overrides (#1783) ───────────────────────────────────────
/**
 * What the moderation and flag controls are still allowed to say inline.
 *
 * These sat as sixteen near-identical `style` objects, and thirteen of them
 * opened by restating the button's own `fontSize` — the number the class
 * already declares, typed out again beside it. That restatement is what #1783
 * removed: it looks redundant and is the opposite, because an inline style wins,
 * so each of the thirteen would have pinned its button at 9px on the day the
 * class moved to the label-tier floor. The class owns size, face, casing and
 * tracking; nothing here may name any of the four again.
 *
 * The pad IS a real override — a denser row than `.btn-*`'s default 8px/16px —
 * and the two ring/ink pairs are the danger and warning outline variants. Three
 * objects, declared once, rather than twelve copies that can drift one at a time.
 */
const BTN_COMPACT: CSSProperties = { padding: 'var(--space-xs) var(--space-md)' }
const BTN_COMPACT_DANGER: CSSProperties = {
  ...BTN_COMPACT,
  borderColor: 'var(--color-danger-ring)',
  color: 'var(--color-danger)',
}
const BTN_COMPACT_WARNING: CSSProperties = {
  ...BTN_COMPACT,
  borderColor: 'var(--color-warning-ring)',
  color: 'var(--color-warning)',
}

// ── Admin moderation bar ─────────────────────────────────────────────────────

export function PraxisAdminBar({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showAdminBar, adminFailNote, setAdminFailNote, showFailInput, setShowFailInput, moderating, moderateError, handleModerate } = state
  if (!showAdminBar || !praxis) return null

  return (
    <div className="sidebar-card card-on-page mb-4" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="label-heading">
          {t('detail.admin.eyebrow')}
        </span>
        <span
          className="label-caption"
          style={{
            padding: 'var(--space-xs) var(--space-sm)',
            border: '1px solid var(--color-border)',
            color: praxis.moderation_status === 'flagged' ? 'var(--color-danger)'
              : praxis.moderation_status === 'hidden' ? 'var(--color-text-tertiary)'
              : praxis.moderation_status === 'failed' ? 'var(--color-warning)'
              : 'var(--color-success)',
          }}
        >
          {praxis.moderation_status}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {praxis.moderation_status === 'flagged' && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={BTN_COMPACT}>{t('detail.admin.approve')}</button>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={BTN_COMPACT_DANGER}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
          {praxis.moderation_status === 'visible' && (
            <>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={BTN_COMPACT_DANGER}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
          {(praxis.moderation_status === 'hidden' || praxis.moderation_status === 'failed') && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={BTN_COMPACT}>{t('detail.admin.restore')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
        </div>
      </div>
      {showFailInput && (
        <div className="mt-2 flex gap-2 items-end">
          <textarea
            className="border-2 border-border bg-card px-3 py-1 font-body content-text focus:outline-none focus:border-ink flex-1 resize-none"
            rows={2}
            placeholder={t('detail.admin.failReasonPlaceholder')}
            value={adminFailNote}
            onChange={(e) => setAdminFailNote(e.target.value)}
          />
          <button
            onClick={() => void handleModerate('failed', adminFailNote)}
            disabled={moderating}
            className="btn-primary"
            style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
          >
            {t('detail.admin.confirm')}
          </button>
        </div>
      )}
      {moderateError && <p className="font-body content-text mt-1" style={{ color: 'var(--color-danger)' }}>{moderateError}</p>}
    </div>
  )
}

// ── Comments region (ADR-0061, amending ADR-0006) ────────────────────────────

/**
 * The comments slot a rebuilt praxis-detail archetype mounts itself.
 *
 * ADR-0006 put the thread below every archetype as neutral chrome, and the
 * dispatcher mounted it there. ADR-0061 makes comments the page layout's THIRD
 * region — beneath the main column and the aside, inside the archetype's own
 * sheet — so the skin can dress its section head and place the thread. The
 * `moderation_status === 'visible'` gate lives here rather than in each
 * archetype: a thread renders on a visible praxis only, and one skin forgetting
 * that is exactly the drift this prevents (the task-detail lesson, #1030).
 *
 * Pass `heading` to supply a dressed section head; the thread's own
 * `{n} comments` `<h3>` is then suppressed so the page carries ONE heading for
 * one list (the #1029 trap, warned about on `CommentThread`'s own prop).
 *
 * The ROWS stay faction-dispatched on `comment.author.faction_slug` — a Snide
 * player's comment reads Snide on any page. ADR-0061 draws that boundary
 * explicitly: the neutral rule covers the page's own slots and stops at the
 * speaker's voice.
 */
export function PraxisDetailComments({
  state,
  heading,
  style,
}: {
  state: PraxisDetailState
  heading?: ReactNode
  style?: CSSProperties
}) {
  const { praxis, comments } = state
  if (!praxis || praxis.moderation_status !== 'visible') return null
  return (
    <section style={style}>
      {heading}
      {/* Seeded from the page's own batch (#1281) — the gate above means the
          thread's effect could never have started this early on its own. */}
      <CommentThread
        target="praxes"
        targetId={praxis.id}
        showHeading={heading === undefined}
        seed={comments}
      />
    </section>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

/**
 * The moderation banners, both of them.
 *
 * THE FLAGGED NOTICE LIVES HERE NOW (#2718). It used to be the one moderation
 * state with no shared slot, so all eight dressed archetypes drew it themselves
 * — twenty-two lines apiece, wedged between the two slots they mounted bare on
 * either side of it, and the largest verbatim run in the whole archetype
 * family. Six of the eight were byte-identical; `DefaultPraxisDetail`'s own
 * comment named the hole ("the flagged notice ... has no shared slot, so it
 * renders here") and seven files copied the workaround instead of the fix.
 *
 * That is a mount, and a mount is ADR-0090's TREE bucket — a token cannot add a
 * node. But its DIFFERENCE across the eight was only ever two colours, which is
 * the PAINT bucket, so the node moves here once and the two inks stay the
 * archetype's to name. Six archetypes now name neither and get the shared
 * neutral pair; Ephemerists names its own `-card-notice` for all three marks;
 * Singularity names the warning hue for the body as well as the edge. Those two
 * are the whole per-faction difference on this slot, and they were the only
 * thing twenty-two duplicated lines were carrying.
 *
 * The inks arrive as PROPS rather than as a `var(--x, fallback)` pair because
 * this surface already settled that question the same way: `MemberByline` takes
 * `linkStyle`, `PraxisDetailComments` takes `heading` and `style`, `DuelCard`
 * takes `style` and `ink`. A shared slot on this page wears the archetype's
 * dress through its props, and a second mechanism for one banner would be a
 * vocabulary nobody asked for. It also keeps the rendered style attribute
 * byte-identical to what the eight files emitted before, which is what let this
 * lane prove it moved code and not pixels (`markupStability.test.tsx`).
 *
 * Deliberately NOT wired to `wallInk()` next door. That resolves the failed
 * banner's alarm/notice pair off the TASK's faction, and pointing the flagged
 * notice at it would repaint six factions that are on `--color-warning` today.
 * This lane ships a zero-row computed-value diff; re-measuring this notice
 * against each wall is a design question and belongs to whoever asks it.
 *
 * AND THE ONE PLACE THEY COINCIDE STILL KEEPS ITS LITERAL. Review spotted that
 * Ephemerists' `NOTICE` — `var(--faction-ephemerists-card-notice)` — is
 * byte-for-byte what `wallInk(praxis, 'notice')` returns on that page, because
 * `PraxisDetail` dispatches on `task_faction_slug` and so that archetype only
 * ever mounts for its own slug. True in production, and still not the
 * substitution to make, for three reasons that are worth more than the six
 * characters saved:
 *
 *   - `wallInk` is a function of the PRAXIS; the literal is a fact about the
 *     FILE. They agree only while the dispatcher keys on the task's faction,
 *     and a file that names its own token cannot be wrong if that ever changes.
 *   - It would be a claim the tests cannot check. The registry walks mount
 *     EVERY archetype against one fixture, whose `task_faction_slug` is `ua`
 *     (`test/praxisDetail.tsx`) — so the derived form renders the *ua* notice
 *     ink on the Ephemerists page and the byte-identity gate reds. Verified,
 *     not predicted. Re-recording that would bank a snapshot describing
 *     something that never ships.
 *   - `wallInk` is module-private, and widening this module's API to hand a
 *     file a value it already knows is the wrong direction of travel.
 */
export function PraxisStatusBanners({
  state,
  flaggedInk = 'var(--color-warning)',
  flaggedBodyInk = 'var(--color-text-secondary)',
}: {
  state: PraxisDetailState
  /** Edge and label of the flagged notice. The shared warning hue by default. */
  flaggedInk?: string
  /** The notice's sentence. The shared secondary ink by default. */
  flaggedBodyInk?: string
}) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  return (
    <>
      {/* The read-only cast-status roster (#591) used to lead this block. It
          was gated to a still-resolving collab (in_progress / pending), which
          ADR-0062 now redirects to the composer, so it could never paint again
          and went with #1089. The composer's own roster (#1071) is where "who
          still owes their part" is answered, and a published praxis has the
          byline crediting every co-author instead. */}
      {/* THE TASK CROWN HERO IS GONE; THE FLEUR MOVED TO THE CORNER (#1710).
          A bordered panel led this block — a 34px `TaskCrown`, a "TASK CROWN"
          label and a sentence explaining it — and because it existed, all nine
          archetypes passed `showCrown={false}` to their `ScoreStamp` to keep the
          page to one mark. Owner ruling, 2026-08-14: "Task crown as a box on the
          top should not exist. Just a fleur in the corner." So the panel goes
          and the stamps draw the mark again — the SAME `TaskCrown`, unrestyled
          and still keyed on `is_top_for_task`, so ADR-0028 and ADR-0054 are
          untouched and the "one mark per page" rule is preserved.

          One narrow consequence: `ScoreStamp` draws nothing on an unscored
          praxis (#1444, `failed` / `hidden`), and `crowned_praxis_ids` ranks on
          `Praxis.status == submitted` without reading `moderation_status` — so a
          FAILED praxis that still holds its task's crown now shows no crown on
          this page. That is the right trade: its honest signal is the failed
          banner below, and a crown floating over a failed entry was the louder
          of the two lies. */}
      {/* The "IN EDITING" / "PENDING PUBLISH" pair used to sit here. Both are
          gone with ADR-0062: detail redirects `in_progress` AND `pending` to the
          composer, so neither banner could ever paint again. An open praxis now
          has one owner — the composer's waiting surface (#1071) — instead of two
          that described it differently. */}
      {/* THE MARK DRAWS ON THE STATUS, NOT ON THE NOTE (#1538).
          This used to require `praxis.admin_note` as well, and the note is
          optional everywhere it is set: `ModerationAction.admin_note` is
          `str | None`, and `moderate_praxis` stores `admin_note or ""` on a
          fail — so an admin who leaves the box empty banks an EMPTY STRING,
          falsy here. The card badge next door has always keyed on the status
          alone, so that praxis carried a "FAILED" badge in the feed and, since
          #1444 correctly suppressed its score stamp, nothing whatsoever on this
          page. #1373 made `failed` a PUBLIC MARK — a mark nobody can see is not
          one. The note is now optional detail INSIDE the banner: its span is
          omitted entirely when there is nothing to say, so an empty note leaves
          no dangling element behind the title (which is a whole sentence and
          reads alone). */}
      {praxis.moderation_status === 'failed' && (
        <div style={{ background: 'var(--color-danger-veil)', border: '2px solid var(--color-danger-edge)', borderRadius: 8, padding: 'var(--space-sm) var(--space-lg)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Ornament: a ✗ dingbat used as an icon, not readable text. Sized
              from the label tier (nearest token to its old 16px), never the
              content floor — see WORLD_ZERO_STYLE.md §4, ornament role. */}
          <span style={{ fontSize: 'var(--text-xl)' }}>&#10007;</span>
          {/* Both inks are measured on THIS skin's wall under the veil above
              (#1451). The title's 24px/700 already cleared the 3:1 large-text
              floor on all nine (3.11:1 worst) and moves anyway: the alarm and
              notice roles are the banner's own `-veil`/`-edge` rungs rejoining
              their washes, which is #1449's rule for which mark takes which. */}
          <div>
            <span className="font-body content-title" style={{ color: wallInk(praxis, 'alarm'), fontWeight: 700, display: 'block' }}>
              {t('detail.banners.failedTitle')}
            </span>
            {praxis.admin_note && (
              <span className="font-body content-text" style={{ color: wallInk(praxis, 'notice') }}>
                {praxis.admin_note}
              </span>
            )}
          </div>
        </div>
      )}
      {/* THE THIRD MODERATION STATE (#2718). Drawn after the failed mark, which
          is where the eight archetypes drew it — and the two are mutually
          exclusive anyway, `moderation_status` being one value. Bare, on the
          shared neutral tokens by default: ADR-0061 leaves moderation chrome
          outside the costume, so a skin that names nothing here gets the same
          notice every other skin gets. */}
      {praxis.moderation_status === 'flagged' && (
        <div
          style={{
            border: `2px solid ${flaggedInk}`,
            borderRadius: 8,
            padding: 'var(--space-sm) var(--space-lg)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
          }}
        >
          <span className="label-caption" style={{ color: flaggedInk }}>
            {t('detail.banners.flaggedLabel')}
          </span>
          <span className="font-body content-text" style={{ color: flaggedBodyInk }}>
            {t('detail.banners.flaggedBody')}
          </span>
        </div>
      )}
    </>
  )
}

// ── Owner actions ─────────────────────────────────────────────────────────────

export function PraxisOwnerActions({ state }: { state: PraxisDetailState }) {
  const { praxis, isOwner, withdrawError } = state
  if (!praxis || !isOwner) return null

  // ONE CONTROL, AND IT IS THE UNSUBMIT (#2136).
  //
  // There was an "edit this praxis" link here beside it. #1397 hid it on the
  // `handoff` phase — published with nobody to wait for, i.e. every solo — but
  // the phases it left alone all draw READ-ONLY surfaces too: `completed` for a
  // published collab or a settled duel, `waiting` for a live duel side, a
  // locked composer for a moderated praxis. So the pair advertised the same
  // outcome and only one of them delivered it. Owner ruling: the link is not
  // re-gated by phase, it is gone. "There is no reason for the player to go
  // back to the edit page unless they are going to edit."
  //
  // The way to EDIT a published praxis is what is left: unsubmit → confirm →
  // `PraxisDetail` redirects the now-`in_progress` praxis into the composer.
  // Deliberately NOT an auto-unsubmit on some other control — that would spend
  // the two-step confirm #1094 wrote to keep this beat truthful, and on a
  // settled duel side the same click would be a permanent forfeit.

  // EVERY praxis keeps the cluster here, duel or not (#1090). #752 had moved it
  // into the duel RAIL — "the state and the control that changes it share a
  // surface" — and this component suppressed it for `duel_id != null` so the
  // #646 double-destructive-control bug could not recur. The rail is gone: the
  // duel is now a compact reading card in the aside (`DuelCard`), and epic
  // #1085's layout contract puts OWNER ACTIONS in the main column, so the card
  // stays the same height in every state and carries no button. That leaves
  // exactly one mount site again, which is all #646 ever asked for.
  //
  // The forfeit escalation is untouched: `PraxisSubmitControls` still swaps to
  // the forfeit dialog on a settled duel, wherever it renders.
  return (
    <div>
      {/* Still a flex row with one child: `gap` went with the link, but the
          shrink-to-fit box is what keeps the confirm state's own wrapping row
          from spanning the whole column. */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <PraxisSubmitControls state={state} />
      </div>
      {withdrawError && <p className="font-body content-text mb-3" style={{ color: wallInk(praxis, 'alarm') }}>{withdrawError}</p>}
    </div>
  )
}

/**
 * Which reopen the quiet unsubmit control is actually about to perform (#1094).
 *
 * The control used to show ONE prompt — "Sure? Points & votes will pause." — for
 * every praxis, which is only true of a solo. Each branch below is `unsubmit_praxis`
 * (`services/praxis.py`) read back as a sentence:
 *
 *  - `duelLive` — a duel still `pending` or `active`. Both are pre-settlement:
 *    a forfeit is marked only at `status == settled` (ADR-0011 §Forfeit), so the
 *    reopen is free and neutral and nothing is marked. `pending` sits alongside
 *    `active` in the backend's own `_LIVE_INCOMPLETE_DUEL_STATUSES`, and #1077
 *    already treats the pair identically in the composer's pull-back — a
 *    challenger who casts before the rival accepts is in the same free state.
 *    A `settled` duel never reaches here: it is caught by `forfeitsOnUnsubmit`
 *    above and gets the forfeit dialog instead.
 *  - `collabOwnPart` — a collab mid-consensus (`pending`) where the viewer has
 *    cast. The backend runs `on_member_unsubmit`: only the caller's part comes
 *    back and co-authors' casts stand. Pending praxes are unscored, so there is
 *    no points-and-votes half to warn about.
 *  - `collabGroup` — a published collab. The whole group reopens and EVERY
 *    member's `has_submitted` clears, not just the viewer's.
 *  - `solo` — the original copy, unchanged.
 */
type UnsubmitCase = 'solo' | 'collabGroup' | 'collabOwnPart' | 'duelLive'

export function unsubmitCase(
  praxis: PraxisOut,
  duel: DuelDetailOut | null,
): UnsubmitCase {
  if (duel && (duel.status === 'pending' || duel.status === 'active')) return 'duelLive'
  if (praxis.members.length <= 1) return 'solo'
  return praxis.status === 'pending' ? 'collabOwnPart' : 'collabGroup'
}

/**
 * Trigger label / confirm prompt / confirm-button label, one row per case.
 * `as const` keeps the literals narrow so the typed `t()` key union still
 * checks every string here against the shipped catalog.
 */
const UNSUBMIT_COPY = {
  solo: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPrompt',
    confirm: 'detail.owner.confirmUnsubmit',
  },
  collabGroup: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPromptCollab',
    confirm: 'detail.owner.confirmUnsubmitCollab',
  },
  collabOwnPart: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPromptCollabPart',
    confirm: 'detail.owner.confirmUnsubmitCollabPart',
  },
  // The composer's vocabulary for the same free beat (#1077, "Pull my entry
  // back") — one event, one set of words, no consequence language.
  duelLive: {
    trigger: 'detail.owner.unsubmitDuelLive',
    prompt: 'detail.owner.confirmPromptDuelLive',
    confirm: 'detail.owner.confirmUnsubmitDuelLive',
  },
} as const satisfies Record<
  UnsubmitCase,
  { trigger: string; prompt: string; confirm: string }
>

/**
 * The submit / pull-back / forfeit control for a praxis you own — the one
 * mutation seam that changes its cast state (and, for a duel side, the duel's).
 * Extracted from PraxisOwnerActions (#752) so the duel RAIL could render it
 * beside the state it changes; #1090 deleted the rail and every praxis, duel or
 * not, takes it back inline in the owner controls. Still exactly ONE mount site
 * per praxis, which is what stops the #646 double-destructive-control bug.
 * `withdrawError` is rendered by the caller, next to wherever this control lands.
 *
 * IT ONLY EVER REOPENS. The green CAST control that used to lead this component
 * — plus the "you've submitted, waiting on co-authors" state beside it — went
 * with #1089: both were gated to `in_progress` or `pending`, and ADR-0062
 * redirects a praxis in either status to the composer, so neither could paint on
 * a page this renders on. Casting lives in the composer, on both paths (#1071).
 * Every branch that survives starts from a PUBLISHED praxis.
 */
export function PraxisSubmitControls({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, isOwner, user, duel, withdrawing, showWithdrawConfirm, setShowWithdrawConfirm, handleWithdraw } = state
  if (!praxis || !isOwner) return null

  // A SETTLED duel side's quiet unsubmit is a permanent forfeit (ADR-0011
  // §Forfeit; the backend only forfeits at `status == settled`) — escalate the
  // existing two-step confirm rather than adding a control (#718). During
  // `active` it stays exactly as-is: until the opponent casts, pulling back is a
  // free neutral reopen with no penalty, and warning about one would be a lie.
  const forfeitsOnUnsubmit = duel?.status === 'settled' && duel.forfeited_by_character_id == null

  const viewerCharacterId = user?.character?.id

  // What the quiet unsubmit is about to do, in its own words (#1094). The
  // settled-duel forfeit is handled above and never reaches this table.
  //
  // `unsubmitCase` still resolves all four rows and is tested against all four.
  // Only three can be SELECTED from here: `collabOwnPart` needs `status ===
  // 'pending'`, which ADR-0062 redirects away. The resolver is #1094's pure
  // statement of what the backend does, not a view of this page, so it keeps its
  // fourth row rather than being narrowed to whatever renders today.
  const unsubmitCopy = UNSUBMIT_COPY[unsubmitCase(praxis, duel)]

  return forfeitsOnUnsubmit && duel ? (
    /* A forfeit is the one irreversible duel beat, so it gets the same
       dispatched dialog the (reversible) seal confirm got in #718 rather
       than an inline text expand (#751). The trigger stays put and the
       dialog mounts over it as a fixed overlay. Skinned by the TASK's
       faction, matching the composer's own dispatch. */
    <>
      <button onClick={() => setShowWithdrawConfirm(true)} className="font-body label-caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: wallInk(praxis, 'alarm') }}>
        {t('duelForfeit.action')}
      </button>
      {showWithdrawConfirm && (
        <DuelSealConfirm
          mode="forfeit"
          taskFactionSlug={praxis.task_faction_slug}
          duel={duel}
          viewerCharacterId={viewerCharacterId}
          taskPointValue={praxis.task_point_value}
          onConfirm={handleWithdraw}
          onCancel={() => setShowWithdrawConfirm(false)}
          busy={withdrawing}
        />
      )}
    </>
  ) : !showWithdrawConfirm ? (
    <button onClick={() => setShowWithdrawConfirm(true)} className="font-body label-caption" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      {t(unsubmitCopy.trigger)}
    </button>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
      {/* `points` lands ONLY in the solo prompt, which is the one string that
          interpolates it (#2094). Do NOT add it to `confirmPromptCollab`:
          the score fields are ONE set resolved for the praxis AUTHOR on every
          type including collab (ADR-0053), so on a group praxis this figure
          is the author's, not the reader's. Printing it to a co-author would
          state a number that is NOT what leaves their total — a worse error
          than the vague "points & votes pause" #2094 removed. The owner ruled
          the collab prompt numberless and ruled out putting a per-member share
          on the wire; naming one needs that decision reopened, not a one-line
          "improvement" here. `unsubmitConfirmCopy.test.tsx` guards it. */}
      <span className="label-caption">
        {t(unsubmitCopy.prompt, { points: formatPoints(praxis.score), count: praxis.score })}
      </span>
      <button
        onClick={handleWithdraw}
        disabled={withdrawing}
        // The LABEL takes the wall's alarm ink (#1451); the fill and the rule
        // stay the neutral rungs. `--color-danger` as a 1.5px rule owes 3:1
        // (WCAG 1.4.11) and clears it on all nine walls — 3.31:1 worst.
        //
        // `.btn-outline` DRESSED BY HAND, not hand-rolled from nothing (#1783).
        // This was a free-standing style object repeating the class's face —
        // font, size, casing, cursor — beside a cancel that wears the class, and
        // #1608 left it exactly because raising one of a visible pair is worse
        // than raising neither. Wearing the class is what makes the pair move
        // together and keep moving together; the fill, the rule, the ink, the
        // denser pad and the square corner are the dress, and they stay here.
        className="btn-outline"
        style={{ background: 'var(--color-danger-veil)', border: '1.5px solid var(--color-danger)', color: wallInk(praxis, 'alarm'), ...BTN_COMPACT, borderRadius: 0 }}
      >
        {withdrawing ? t('detail.owner.submitting') : t(unsubmitCopy.confirm)}
      </button>
      <button onClick={() => setShowWithdrawConfirm(false)} className="btn-outline" style={BTN_COMPACT}>{t('detail.owner.cancel')}</button>
    </div>
  )
}

// ── Flag block ────────────────────────────────────────────────────────────────

/**
 * The report card — NEUTRAL CHROME, deliberately outside the costume.
 *
 * All eight faction praxis-detail designs draw this card the same way: shared
 * neutral copy on its own neutral token set, wearing none of the skin's dress
 * while every panel around it does. Only the Unaffiliated design skinned it, and
 * it is the outlier (#1117–#1123). ADR-0061 states the
 * rule the designs were drawing: content slots carry a skin's voice, moderation
 * and system chrome do not — the report card, the steward bar, the banners and
 * the errors read one shared neutral block in every faction's dress.
 *
 * That is enforced structurally rather than by convention: this component takes
 * `state` and nothing else, so there is no `style` seam to dress it through, and
 * every text node inside carries an explicit `--color-*` token or the label
 * tier's neutral — so it cannot inherit a skin's sheet colour by accident.
 * `PraxisAdminBar` above is built the same way for the same reason. If a skin
 * ever needs this card to look different, that is an ADR change, not a prop.
 *
 * ONE THING THE #1307 SWEEP CHANGED ABOUT THAT LAST CLAUSE, AND IT IS A LOADED
 * GUN RATHER THAN A BUG TODAY. `.eyebrow` HARDCODED `--color-text-tertiary`, so
 * a label in here was neutral no matter what it was mounted inside.
 * `.label-caption` reads `--label-ink`, which is a SEAM a faction frame is meant
 * to set once on its own root (see its declaration in `index.css`) — and this
 * card renders INSIDE that root. Nothing sets it yet, so every one of these
 * labels still resolves to the same neutral; the moment a praxis-detail skin
 * repoints it, the steward bar and the report card inherit the skin's quiet ink
 * and ADR-0061's promise quietly breaks. The fix belongs to the token, not here:
 * `.card-on-page` already names the stock these inks were measured on (#1413)
 * and is the right place to pin `--label-ink` back to the neutral. Do not paper
 * over it with an inline colour on each label — that is the per-component
 * contradiction #1252 exists to stop.
 */
export function PraxisFlagBlock({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showFlagForm, setShowFlagForm, flagReason, setFlagReason, flagDetail, setFlagDetail, flagging, flagError, setFlagError, flagSubmitted, handleFlag } = state
  if (!praxis) return null

  if (flagSubmitted) {
    return (
      <div className="sidebar-card card-on-page flex items-center gap-3" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="label-caption" style={{ color: 'var(--color-success)' }}>{t('detail.flag.flaggedOk')}</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('detail.flag.flaggedTitle')}</p>
          <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('detail.flag.flaggedBody')}</p>
        </div>
      </div>
    )
  }

  if (!praxis.can_flag || praxis.moderation_status === 'flagged') return null

  return (
    <div className="sidebar-card card-on-page" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-danger-edge)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="label-caption">{t('detail.flag.badge')}</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('detail.flag.title')}</p>
          <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('detail.flag.body')}</p>
        </div>
        {!showFlagForm && (
          <button onClick={() => { setShowFlagForm(true); setFlagError(null) }} className="btn-outline" style={BTN_COMPACT_DANGER}>
            {t('detail.flag.flag')}
          </button>
        )}
      </div>
      {showFlagForm && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {/* Reason picker — the shared vocabulary (ADR-0037), not free text. */}
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label={t('detail.flag.reasonGroupLabel')}>
            {flagReasonOptions().map(({ value, label }) => (
              <button
                key={value}
                role="radio"
                aria-checked={flagReason === value}
                onClick={() => { setFlagReason(value); setFlagError(null) }}
                disabled={flagging}
                className="btn-outline"
                style={{
                  ...BTN_COMPACT,
                  ...(flagReason === value
                    ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* A note is available for every reason, not just "Other" (#570).
              handleFlag forwards flagDetail regardless of reason. Note: the
              backend only *persists* the note for the "other" reason (ADR-0037,
              stored_flag_reason); for named reasons it is accepted but not
              stored — persisting it for all reasons would need a reason_detail
              column (follow-up, out of #570's scope). */}
          {flagReason !== null && (
            <textarea
              className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-none focus:border-ink w-full resize-none"
              rows={2}
              placeholder={t('detail.flag.notePlaceholder')}
              value={flagDetail}
              onChange={(e) => setFlagDetail(e.target.value)}
              disabled={flagging}
              style={{ marginTop: 'var(--space-sm)' }}
            />
          )}
          <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-sm)' }}>
            {flagReason !== null && (
              <button onClick={() => void handleFlag()} disabled={flagging} className="btn-primary" style={{ ...BTN_COMPACT, background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }}>
                {flagging ? t('detail.flag.submitting') : t('detail.flag.submit')}
              </button>
            )}
            <button onClick={() => { setShowFlagForm(false); setFlagReason(null); setFlagDetail(''); setFlagError(null) }} disabled={flagging} className="btn-outline" style={BTN_COMPACT}>
              {t('detail.flag.cancel')}
            </button>
          </div>
          {flagError && <p className="font-body content-text" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-sm)' }}>{flagError}</p>}
        </div>
      )}
    </div>
  )
}
