/**
 * Collab submission roster (#591, rebuilt #1416). One shared,
 * faction-token-themed block that replaces the flat member-pill list in the
 * composer and the plain member byline on the praxis detail page. It renders the
 * ADR-0012 lazy-consensus state live: who is on the praxis, who has submitted,
 * and the gate progress.
 *
 * The consensus state machine lives in `collabGate.ts`; the row model — the
 * merge of `members[]` and `invites[]` into four states, and the monogram
 * derivation — lives in `rosterRows.ts`. Both are pure leaves, and both are
 * separate modules for the same measured reason (#1397): a pure function
 * imported from here bills its caller for `ConfirmDialog` and eight factions of
 * confirm copy, which is what put ~5.5 KB gzip of composer on a praxis-detail
 * route that draws no roster.
 *
 * WHAT #1416 CHANGED. Invited people are now IN the roster. They used to be
 * dashed chips drawn outside it by `InviteSearch`, and a declined invite was
 * filtered away everywhere it appeared — so the one question this block exists
 * to answer was split across two widgets and one silent deletion. The pill went
 * from a boolean (`has_submitted`) to the four states in `RosterRowState`, and
 * the rescind × moved onto the invited row it belongs to. The rows themselves
 * lost their filled/dashed frames: done-ness now reads on the avatar and the
 * pill, and the rows are separated by a hairline instead.
 *
 * Pure display everywhere (#646): the cast / pull-back action lives in the
 * composer footer's PublishButton, not the roster, so both the composer and the
 * read-only detail view consume this the same way. Spacing/type via Tailwind
 * utilities and the --text- / --space- token scales, not raw inline pixels
 * (#588 lint guard).
 *
 * Every word resolves through `collabCopy(factionSlug, key)`, so each faction
 * speaks the same states in its own voice and anything it hasn't overridden
 * falls back to the shared `editPraxis.collab.*` block (#591).
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  PraxisInviteOut,
  PraxisMemberOut,
  PraxisType,
} from '../../api/praxis'
import { factionCssVar } from '../../utils/factions'
import ConfirmDialog from '../confirm/ConfirmDialog'
import { kickMemberConfirm } from '../confirm/composerConfirms'
import { collabCopy } from './collabCopy'
import type { CollabCopyKey } from './collabCopy'
import { deriveCollabGate } from './collabGate'
import { RosterAvatar } from './RosterAvatar'
import { buildRosterRows, isRowDone } from './rosterRows'
import type { RosterRow, RosterRowState } from './rosterRows'

// The consensus state machine moved to `collabGate.ts` (#1397) — it is pure, and
// keeping it here billed every caller for this component's dialog and copy.
// Re-exported so every existing importer still reaches it by this path.
export { deriveCollabGate } from './collabGate'
export type { CollabGate, CollabState } from './collabGate'

/** Diameter of the row monogram. The duel side draws the same circle at 28. */
const AVATAR_SIZE = 34
/** The design's 6px status dot. */
const DOT_SIZE = 6
/**
 * The "here now" badge on the avatar's corner (#1744), and the ring that lifts
 * it off the monogram's edge. Bigger than DOT_SIZE because it stands alone on a
 * 34px circle rather than inside a pill that is already a word wide.
 */
const PRESENCE_DOT_SIZE = 10
const PRESENCE_DOT_RING = 2

/**
 * The ink for text sitting ON the faction's card-accent, declared once on the
 * roster root so the filled pill can name it with a fallback.
 *
 * `-on-accent` (#924) is exactly this measurement — it is what ConfirmDialog's
 * primary button reads — but EPHEMERISTS HAS NONE: #1232 deleted it when its
 * last consumer moved to the Valley plate's own CTA pair. index.css belongs to
 * frontend-style, so rather than mint a faction token from here the pill falls
 * back to that faction's own sheet (`card-bg`), which is the ink index.css
 * already measures its card family against. Restoring
 * `--faction-ephemerists-on-accent` (plus its ACCENT_PAIRS row) is the real fix
 * and is flagged on the PR.
 */
const ON_ACCENT_PROPERTY = '--roster-on-accent'

/**
 * THE DRESS, handed in by whoever mounts this block (#2269).
 *
 * Every field is optional and every one falls back to the faction's `card-*`
 * family, because that fallback is CORRECT on the two mounts that pass nothing:
 * the praxis-detail block and the waiting surface really are drawn on the
 * faction's card sheet, which is the ground `ROSTER_PAIRS` gates these inks
 * against and the ground the #694 / #1449 measurements were taken on.
 *
 * THE COMPOSER IS THE MOUNT THAT IS NOT. It passes a skin because it is the one
 * caller that knows which sheet it painted — and for S.N.I.D.E. that sheet is
 * the flyposted WALL (#2177), whose own comment in `factionMarks/snideAtoms`
 * states the rule outright: "the inks that go on it are the `-note-*` family,
 * which flips with it — never `-card-*`, which is pinned near-black in both
 * themes for the slabs pasted ON the wall" (#2066). Reading `card-muted` there
 * measured 1.24:1 (#2267); it was the GROUND that was wrong, not the tier.
 *
 * It carries GEOMETRY and TYPE as well as colour, by owner ruling — "the corners
 * shouldn't be rounded for Ephemerists", whose whole language is the brass
 * plate, and S.N.I.D.E.'s fields are square for the same reason. A `fontFamily`
 * prop alone would have fixed one screenshot and left the next dress decision
 * exactly where this one was.
 */
export interface CollabSkin {
  /** The face the block is set in. Site-generic when absent — the #2269 bug. */
  fontFamily?: string
  /**
   * The corner on the status pills, the Done chip, the nudge control, the
   * per-state notice and the `+ invite` chip. NOT the avatar, which is a disc
   * rather than a rounded rectangle, and not the progress bar's 4px cap.
   */
  radius?: number | string
  /** DONE as a FILL: the finished pill's ground, the progress fill, its ring. */
  accent?: string
  /** The ink ON `accent`. */
  onAccent?: string
  /**
   * DONE as an INK — the waiting notice and the nudge control. Split from
   * `accent` because a faction hue is a fill and not an ink: S.N.I.D.E.'s acid
   * fills a pill happily and measures 1.35:1 as type on its own wall.
   */
  accentInk?: string
  /** The quiet tier: unanswered pills, "· you", the ×s, the `+ invite` chip. */
  quiet?: string
  /** The holdout warning's ink, and the veil it lays over its own ground. */
  notice?: string
  /** Credit: the "+N" gain, the published notice, the here-now dot. */
  credit?: string
  /** The ground this block is cut from — the here-now dot's ring. */
  ground?: string
}

/** Which copy key each of the four states speaks through. */
const PILL_KEY_BY_STATE: Record<RosterRowState, CollabCopyKey> = {
  filed: 'pillCast',
  accepted: 'pillWeaving',
  invited: 'pillInvited',
  declined: 'pillDeclined',
}

export function CollabRoster({
  praxisType,
  members,
  invites,
  currentCharacterId,
  factionSlug,
  taskPointValue,
  presentCharacterIds,
  skin,
  onKick,
  onNudge,
  onRescindInvite,
  onNudgeCrew,
  crewNudge,
}: {
  /**
   * `PraxisOut.type` — the ONLY thing that decides whether this block belongs on
   * the page (#1274). It used to be inferred from `members.length > 1`, which
   * made a collab nobody had joined yet render nothing while its heading still
   * announced "Collaborators · 1".
   *
   * It must be tested POSITIVELY against `'collab'`. A duel side is stored
   * `type='solo'` with a non-null `duel_id` (ADR-0011), so `type === 'duel'`
   * never fires (#992) and a `!== 'solo'` gate would grow a roster on every
   * duel while still missing the collab this fixes.
   */
  praxisType: PraxisType
  members: readonly PraxisMemberOut[]
  /**
   * `PraxisOut.invites`. Since #1416 these are ROWS, not just the awaiting
   * line's names: a pending invite reads Invited and a declined one reads
   * Declined, in the same list as the members.
   *
   * Optional, and legitimately empty rather than merely absent: the backend
   * serialises invites to MEMBERS ONLY (`build_praxis_out`), so a stranger
   * reading the detail page has none. Invite rows must therefore degrade to
   * nothing — no empty row, no crash — which they do by construction, since
   * they exist only where the data does.
   */
  invites?: readonly PraxisInviteOut[]
  currentCharacterId: number | null | undefined
  factionSlug: string | null | undefined
  taskPointValue?: number | null
  /**
   * Who has this praxis's room open right now (#1744, ADR-0073) — a live dot on
   * their row, answering "is he even here?".
   *
   * A PROP, never derived here. Only the composer mount sits inside
   * `PraxisRoomProvider`; the eight praxis-detail mounts, the duel/collab
   * waiting surface and the composer's own waiting stage have no room, and
   * **absent must mean "nothing known", not "everyone away"** — an empty dot
   * column on a public page would read as a crew that had left.
   *
   * Different SOURCE and different lifetime from `StatusPill`, and deliberately
   * a different shape: this is ephemeral awareness that vanishes with a tab,
   * while the pill is workflow state that must still be true tomorrow. Only the
   * pill can tell you the publish is waiting on somebody.
   *
   * **Decoration, never authorization.** Awareness is self-reported by each
   * client and relayed, so an id here is a claim, not a fact. Nothing may gate
   * on it. Membership is the edit key and is checked server-side (#1740).
   */
  presentCharacterIds?: readonly number[]
  /**
   * The block's dress — see {@link CollabSkin}. Absent on the praxis-detail and
   * waiting mounts, which are on the card sheet the fallbacks are measured
   * against; the composer passes one because it is the mount that is not.
   */
  skin?: CollabSkin
  /**
   * Remove another member (#959). Receives the target's CHARACTER id. When
   * provided, a kick × renders on every OTHER member's row — but only if the
   * viewer is themselves a member and the collab is still open, mirroring the
   * backend `kick_member` guard ("any member may kick any other, not self, and
   * only while in_progress/pending" — #1076). The confirm step lives here so
   * both the composer and the read-only detail block get it for free; the
   * callback only has to run the API call + refresh.
   */
  onKick?: (memberId: number) => void | Promise<void>
  /**
   * Poke a member who has not submitted yet (#1083). Receives the target's
   * CHARACTER id. When provided, a Nudge button renders on every OTHER member's
   * row that is still outstanding — but only if the VIEWER has submitted,
   * mirroring the backend rule ("any member who has cast may nudge a member who
   * has not"): you do not get to hurry people you have not caught up with. Left
   * undefined on the read-only detail mount, which draws no author controls at
   * all (#646).
   */
  onNudge?: (characterId: number) => void | Promise<void>
  /**
   * Withdraw a still-pending invite (#421). Receives the INVITE id, not a
   * character id — an invite is the thing being cancelled.
   *
   * It arrived here with #1416: the × used to live on the pending-invite chips
   * that `InviteSearch` drew beside the roster, and absorbing those chips into
   * the roster would otherwise have deleted the control with them. Optional for
   * the same reason `onKick` is — the read-only detail mount passes none.
   */
  onRescindInvite?: (inviteId: number) => void | Promise<void>
  /**
   * Poke everyone still outstanding, in one request (#1418, moved here #1952).
   *
   * It used to sit in the waiting surface's FOOTER, which put one verb on the
   * page at two weights in two places — the per-row buttons above and a quiet
   * orphan below. It is drawn in this block's header now, beside the section
   * label, and only where a single press would actually reach TWO OR MORE
   * people: at one, it is a second button for a row that already has one.
   *
   * The gate is derived from the same list `onNudge` gates its rows on, which
   * is what stops the two readings drifting — the footer had to re-derive it.
   * Takes no recipient list: the server derives the crew and applies the same
   * per-person 24h window.
   */
  onNudgeCrew?: () => void | Promise<void>
  /**
   * What the last crew press actually did, or null before one — the shape of
   * `CrewNudgeResult`, spelled structurally so this leaf keeps no dependency on
   * the composer's hooks.
   *
   * It deliberately OUTLIVES the button: the cooldown is per person per day and
   * server-owned, so a press is routinely part refused, and nudging the last
   * reachable member takes the control away. Silence would read as "all of
   * them".
   */
  crewNudge?: { sent: number; skipped: number } | null
}) {
  const { t } = useTranslation('forms')
  // The member a kick is waiting on confirmation for (#1082). Declared before
  // the solo early-return so the hook order never changes.
  const [pendingKick, setPendingKick] = useState<PraxisMemberOut | null>(null)
  const gate = deriveCollabGate(members, currentCharacterId)
  if (praxisType !== 'collab') return null // solo/duel render nothing

  const accent = skin?.accent ?? factionCssVar(factionSlug, 'card-accent')
  // The two accent-as-TEXT sites. Same value as the fill for the seven skins
  // whose composer IS their card sheet — `${key} card accent` in CARD_PAIRS is
  // that pairing, gated at 4.5:1 since #651.
  const accentInk = skin?.accentInk ?? accent
  const face = skin?.fontFamily
  const radius = skin?.radius ?? 4
  // The roster is one block mounted on eight different faction sheets, so every
  // ink it paints has to be legible on all of them (#694). Three of the four it
  // used were global: --color-warning as the "not cast" pill and the holdout
  // banner (4.14:1 on UA's cream, 3.70:1 on UA's page ground), --color-success
  // as the credit (2.07:1 on S.N.I.D.E.'s near-black card), and
  // --color-text-tertiary as the "· you" byline. They now read the faction's own
  // card-ink family, whose members index.css measures against that faction's
  // sheet in both themes.
  const notice = skin?.notice ?? factionCssVar(factionSlug, 'card-notice')
  const credit = skin?.credit ?? factionCssVar(factionSlug, 'card-credit')
  const quiet = skin?.quiet ?? factionCssVar(factionSlug, 'card-muted')
  const ground = skin?.ground ?? factionCssVar(factionSlug, 'card-bg')
  const onAccent =
    skin?.onAccent ?? `var(${ON_ACCENT_PROPERTY}, ${factionCssVar(factionSlug, 'card-bg')})`
  // A crew of one has no consensus to report, so the tally chip and the bar are
  // both withheld rather than printed at their degenerate readings (#1274) —
  // which also keeps `pct` off a zero denominator on an empty roster.
  const awaiting = gate.state === 'awaiting'
  const pct = awaiting ? 0 : Math.round((gate.castCount / gate.memberCount) * 100)

  // Members and invites, one ordered list (#1416). Pure, and tested as such.
  const rows = buildRosterRows(members, invites)

  // Mirror the backend: only a member may kick, never themselves, and only
  // while the praxis is still open (#1076). `published` is that last condition
  // in roster terms — the backend seals a collab to `submitted` exactly when
  // every member has cast, and every route back out clears all of them, so S4
  // and `status === 'submitted'` are the same fact. Keeping it derived means the
  // rule lives in this one component, not re-stated at each call site.
  const viewerIsMember = members.some((m) => m.character_id === currentCharacterId)
  const canKick = onKick != null && viewerIsMember && gate.state !== 'published'

  // Mirror the backend's nudge rule (#1083): a member who has CAST may nudge a
  // member who has not. `gate.iCast` is that condition already derived, so the
  // rule is read from the same place the banner is and cannot drift from it.
  const canNudge = onNudge != null && viewerIsMember && gate.iCast

  /**
   * How many people ONE press would actually reach (#1418, moved here #1952).
   *
   * Three conditions, none of them new, and all three are the row's own: the
   * backend's authorisation above, the row's `!done`, and `nudged_at` — the
   * server-owned 24h window the row reads its spent state from. Somebody
   * already inside it would come back refused, so they are not somebody a press
   * reaches, which is why this counts REACHABLE rather than outstanding.
   *
   * Two is the floor by owner ruling: at one, the bulk press is a second
   * control for a single row that already carries its own.
   */
  const reachableCrew =
    canNudge && onNudgeCrew != null
      ? members.filter(
          (m) =>
            !m.has_submitted &&
            m.character_id !== currentCharacterId &&
            m.nudged_at == null,
        ).length
      : 0
  const showCrewNudge = reachableCrew >= 2
  /**
   * Which explanation the block owes for the nudge verb — the crew's when the
   * bulk press is drawn, the row's when only rows are. Rows count everyone
   * outstanding, spent window or not, because a row draws its button either way
   * (disabled, reading `Nudged`).
   */
  const nudgeNote: CollabCopyKey | null = showCrewNudge
    ? 'nudgeCrewDescription'
    : canNudge &&
        members.some(
          (m) => !m.has_submitted && m.character_id !== currentCharacterId,
        )
      ? 'nudgeDescription'
      : null

  /**
   * The supporting line's second half (#1952). The tally says how many have
   * approved; this says whether one of the people still being waited on is you.
   *
   * Gated on membership because the praxis-detail mount draws this block to
   * strangers, and on a live proposal because in `writing` there is nothing to
   * be outstanding ON — `has_submitted` is an approval of a live proposal since
   * ADR-0079, not "this member filed their part".
   */
  const proposalLive = gate.state === 'waiting' || gate.state === 'holdout'
  const yours =
    viewerIsMember && proposalLive
      ? collabCopy(factionSlug, gate.iCast ? 'yoursApproved' : 'yoursOutstanding')
      : null

  /** The nudge control's dress — one weight for the verb, wherever it is drawn. */
  const nudgeStyle = (spent: boolean): CSSProperties => ({
    padding: 'var(--space-xs) var(--space-sm)',
    borderRadius: radius,
    fontFamily: face,
    border: `1px solid ${spent ? 'var(--color-border)' : accentInk}`,
    background: 'transparent',
    color: spent ? quiet : accentInk,
    cursor: spent ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  })

  // A kick resets everyone's cast (ADR-0013), so it confirms before firing.
  // The dialog is mounted from HERE rather than from the EditPraxis dispatcher
  // like the composer's other six confirms: this component is also mounted by
  // the read-only praxis-detail block, and the confirm has always belonged to
  // the roster so both consumers get it without wiring anything (#1082).
  const confirmKick = () => {
    const member = pendingKick
    setPendingKick(null)
    if (!member || !onKick) return
    void onKick(member.character_id)
  }

  // `awaiting` used to have a second line naming whoever had been invited and
  // not answered (#1274) — it existed because those people were nowhere in the
  // roster. They are rows now, so the line printed the same name three lines
  // above itself; it went with the chips (#1416). What is left is the one fact
  // rows cannot state: nobody else has joined yet.
  //
  // `waiting` lost its banner with #1952. "Approved. Waiting on the others."
  // was the third of four statements of one situation, and the surface above
  // this block now leads with a heading that names the others; the half of it
  // that was not duplication — that yours is in — is on the header line.
  const banner =
    gate.state === 'awaiting'
      ? {
          text: collabCopy(factionSlug, 'rosterAwaitingAlone'),
          tone: quiet,
          warn: false,
        }
      : gate.state === 'holdout'
        ? { text: collabCopy(factionSlug, 'bannerHoldout'), tone: notice, warn: true }
        : gate.state === 'published'
          ? { text: collabCopy(factionSlug, 'bannerPublished'), tone: credit, warn: false }
          : null

  return (
    <div
      className="flex flex-col gap-2"
      style={
        {
          [ON_ACCENT_PROPERTY]: factionCssVar(factionSlug, 'on-accent'),
          // The root catches what inherits — the × glyphs, the monogram. It is
          // NOT enough on its own: `.label-heading`, `.label-caption` and
          // `.font-body` each `@apply font-body`, so they set the family ON the
          // element and beat anything inherited. The seven nodes wearing one of
          // those restate `face` inline, which is the same move every archetype
          // already makes for `leaveStyle` and its own labels.
          fontFamily: face,
        } as CSSProperties
      }
    >
      {/* Panel header (#1416): the block names itself and reports the gate on
          one row. `Collaborators · N` used to be the ComposerSection label at
          nine separate mounts, which meant the heading and the tally could —
          and did — disagree about how many people were on the praxis.

          N counts MEMBERS, not rows: an invited or declined row is somebody who
          has been asked, not somebody who is on it, and the tally beside it
          reads out of the same denominator. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="label-heading" style={{ fontFamily: face }}>
            {t('editPraxis.composer.collaboratorsLabel', { count: gate.memberCount })}
          </span>
          {/* The bulk press, beside the label it belongs to (#1952). See
              `reachableCrew` for why two is the floor. */}
          {showCrewNudge && (
            <button
              type="button"
              onClick={() => void onNudgeCrew?.()}
              className="label-caption"
              style={nudgeStyle(false)}
            >
              {collabCopy(factionSlug, 'nudgeCrewAction')}
            </button>
          )}
        </span>
        {/* THE SUPPORTING LINE (#1952): the tally, and whether yours is in.
            `awaiting` has nothing true to say here — a tally of one over one is
            not a gate anybody is waiting on (#1274). */}
        {!awaiting && (
          <span className="label-caption" style={{ fontFamily: face }}>
            {collabCopy(factionSlug, 'castStatus', { cast: gate.castCount, total: gate.memberCount })}
            {yours != null && <> · {yours}</>}
          </span>
        )}
      </div>

      {/* The nudge verb explains itself in visible text (#1952), once for the
          block rather than in a `title` on every row that a touch user never
          sees. Which sentence depends on which control is on screen: the bulk
          press has its own, and the rows fall back to theirs — both say the
          same cooldown, which is why only one of them is ever drawn. */}
      {nudgeNote && (
        <p className="label-caption" style={{ color: quiet, fontFamily: face }}>
          {collabCopy(factionSlug, nudgeNote)}
        </p>
      )}

      {/* Progress bar. The design draws none, and #1416 asked for that to be a
          decision rather than an omission: it stays. It is the only glanceable
          reading of the gate, and it is the element carrying `aria-valuenow` —
          deleting it would leave a screen reader with the tally string alone. */}
      {!awaiting && (
        <div
          role="progressbar"
          aria-valuenow={gate.castCount}
          aria-valuemin={0}
          aria-valuemax={gate.memberCount}
          aria-label={collabCopy(factionSlug, 'progressAria', { cast: gate.castCount, total: gate.memberCount })}
          style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: accent, transition: 'width 200ms' }} />
        </div>
      )}

      {/* Roster rows */}
      <div className="flex flex-col">
        {rows.map((row, index) => {
          const done = isRowDone(row.state)
          const isMe =
            row.member != null && row.member.character_id === currentCharacterId
          return (
            <div
              key={row.key}
              className="flex items-center"
              style={{
                gap: 'var(--space-sm)',
                padding: 'var(--space-md) 0',
                // Rows are separated by a hairline rather than framed
                // individually — the state now reads on the avatar and the pill,
                // and eight frames stacked on a faction sheet read as a table.
                borderTop: index === 0 ? undefined : '1px solid var(--color-border)',
              }}
            >
              {/* Identity, and whether they are here. The dot rides the
                  AVATAR's corner — the universal online affordance, sitting
                  with the face rather than beside the pill it must not be
                  confused with. `RosterAvatar` stays a pure, aria-hidden leaf,
                  so the badge is layered by this wrapper instead. Only a MEMBER
                  can be in the room: an invited or declined row has no
                  `row.member`, so it can never light up. */}
              <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <RosterAvatar
                  name={row.name}
                  avatarUrl={row.avatarUrl}
                  size={AVATAR_SIZE}
                  borderColor={done ? accent : quiet}
                  dashed={row.state === 'invited'}
                  color={done ? accent : undefined}
                />
                {row.member != null &&
                  presentCharacterIds?.includes(row.member.character_id) && (
                    <span
                      role="img"
                      aria-label={t('editPraxis.composer.presentAria', { name: row.name })}
                      title={t('editPraxis.composer.presentAria', { name: row.name })}
                      style={{
                        position: 'absolute',
                        right: -1,
                        bottom: -1,
                        width: PRESENCE_DOT_SIZE,
                        height: PRESENCE_DOT_SIZE,
                        borderRadius: '50%',
                        // `card-credit`, not `card-accent`: the row already
                        // spends the accent on DONE, and a dot in that same ink
                        // would read as a second, quieter claim about the same
                        // thing (#694 measures both against this sheet).
                        background: credit,
                        // Cut out of the sheet the roster is mounted on, so the
                        // badge reads as a separate mark rather than a bump on
                        // the monogram's rule.
                        border: `${PRESENCE_DOT_RING}px solid ${ground}`,
                        boxSizing: 'content-box',
                      }}
                    />
                  )}
              </span>

              {/* #2129 — THE NAME WRAPS, and the `min-width: 0` beside it was
                  never what made that safe. This cell used to be the ellipsis
                  pair (`overflow: hidden` + `white-space: nowrap`), which
                  bounds how the name PAINTS and, deliberately, nothing else: a
                  nowrap string's min-content size is its whole rendered width,
                  and `min-width: auto` — the initial value, so the value of
                  every flex item nobody thought about — floors an item at its
                  content-based minimum size. The composer mounts this roster
                  inside `controls.tsx`'s `flex: 1 1 100%` wrapper, which is one
                  of those, so a 22-character name inflated the wrapper to
                  min-content instead of ellipsizing inside it, and the status
                  pill went out past the panel's clip. `min-width: 0` only ever
                  bites once an ancestor HAS a width to shrink against.

                  `overflow-wrap: anywhere` is the fix, and it is the fix at the
                  name rather than at that wrapper because there is no shared
                  ancestor to bound — the same root cause reached the praxis
                  card through a different one (#2132). It puts min-content at a
                  single character, so no ancestor anywhere can be inflated by a
                  name at any length. NOT `break-word`: identical paint, and it
                  does not reduce min-content. `flex: 1` and `min-width: 0` stay
                  — they are what still hands the leftover width to the name.

                  Wrapping over two lines is the intended reading of a long
                  name here. The alternative is a truncation that hides which
                  collaborator a row belongs to, on the one block whose entire
                  job is naming who is on the praxis. */}
              <span
                className="font-body text-[13px]"
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  fontWeight: done ? 700 : 400,
                  fontFamily: face,
                }}
              >
                {row.name}
                {isMe && (
                  <span style={{ color: quiet }}> · {collabCopy(factionSlug, 'you')}</span>
                )}
                {done && gate.state === 'published' && taskPointValue != null && (
                  <span style={{ color: credit, fontWeight: 700 }}> +{taskPointValue}</span>
                )}
              </span>

              {/* Nudge — only on a member who has not submitted, never my own row
                  (#1083). Disabled state comes from `member.nudged_at`, which the
                  server sends and clears when the 24h window lapses; nothing
                  about it is remembered here, so a reload cannot un-nudge it.
                  An invited/declined row has no member to nudge. */}
              {canNudge && row.member != null && !isMe && !done && (
                <button
                  type="button"
                  disabled={row.member.nudged_at != null}
                  onClick={() => onNudge?.(row.member!.character_id)}
                  aria-label={collabCopy(
                    factionSlug,
                    row.member.nudged_at != null ? 'nudgeSentAria' : 'nudgeAria',
                    { name: row.name },
                  )}
                  className="label-caption"
                  style={nudgeStyle(row.member.nudged_at != null)}
                >
                  {collabCopy(
                    factionSlug,
                    row.member.nudged_at != null ? 'nudgeSentAction' : 'nudgeAction',
                  )}
                </button>
              )}

              {/* Kick × — on every OTHER member's row (never my own), gated to
                  members (#959). The glyph is an ornament; the button's name is
                  the aria-label so screen readers and the e2e locator resolve it. */}
              {canKick && row.member != null && !isMe && (
                <RowGlyphButton
                  label={t('editPraxis.invite.kickMemberAria', { name: row.name })}
                  color={quiet}
                  onClick={() => setPendingKick(row.member!)}
                />
              )}

              {/* Rescind × — the pending-invite chip's control, now on the row
                  that chip became (#421, moved #1416). Only a still-pending
                  invite can be withdrawn; a declined one is already answered. */}
              {onRescindInvite != null && row.invite != null && row.state === 'invited' && (
                <RowGlyphButton
                  label={t('editPraxis.invite.rescindInviteAria', { name: row.name })}
                  color={quiet}
                  onClick={() => void onRescindInvite(row.invite!.id)}
                />
              )}

              {/* Done (ADR-0079) — "my part is finished", beside the approval
                  pill rather than inside it, because the two are orthogonal: a
                  member may be done and not have approved, or have approved
                  without ever ticking it. Folding Done into the pill's four
                  states would re-merge two of the three signals ADR-0079 split.
                  Quiet, because it gates nothing and starts nothing. */}
              {row.member?.is_done && (
                <span
                  className="label-caption"
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: radius,
                    fontFamily: face,
                    border: `1px solid ${quiet}`,
                    background: 'transparent',
                    color: quiet,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {collabCopy(factionSlug, 'pillDone')}
                </span>
              )}

              <StatusPill
                row={row}
                label={collabCopy(factionSlug, PILL_KEY_BY_STATE[row.state])}
                accent={accent}
                quiet={quiet}
                onAccent={onAccent}
                face={face}
                radius={radius}
              />
            </div>
          )
        })}
      </div>

      {/* What the last crew press did, under the roster it acted on (#1952).
          Gated separately from the button and deliberately: nudging the last
          reachable member takes the control away, and a press that vanishes its
          own button without saying what it did reads as nothing having
          happened. */}
      {crewNudge != null && (
        <span
          role="status"
          className="label-caption"
          style={{ color: quiet, fontFamily: face }}
        >
          {collabCopy(
            factionSlug,
            crewNudge.skipped > 0 ? 'nudgeCrewResultPartial' : 'nudgeCrewResult',
            {
              sent: crewNudge.sent,
              total: crewNudge.sent + crewNudge.skipped,
              skipped: crewNudge.skipped,
            },
          )}
        </span>
      )}

      {/* Per-state banner */}
      {banner && (
        <p
          className="font-body text-[11px]"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: radius,
            fontFamily: face,
            color: banner.tone,
            border: `1px solid ${banner.tone}`,
            // The veil is the banner's OWN ink at 8%, not a global amber
            // (#1609). It was `rgba(234,179,8,…)` — Tailwind's amber-500, which
            // is neither --color-warning nor any faction's notice, so the one
            // fill sat under eight different inks in both themes. Reading
            // `banner.tone` is the same move the border above makes and cannot
            // drift from it.
            background: banner.warn
              ? `color-mix(in srgb, ${banner.tone} 8%, transparent)`
              : 'transparent',
          }}
        >
          {banner.text}
        </p>
      )}

      {/* Nested inside the roster, but drawn at the document root — the dialog
          portals itself out, so a faction panel's transform can't capture its
          fixed overlay. */}
      {pendingKick && (
        <ConfirmDialog
          request={kickMemberConfirm(
            factionSlug,
            pendingKick.character_display_name,
          )}
          factionSlug={factionSlug}
          onConfirm={confirmKick}
          onDismiss={() => setPendingKick(null)}
        />
      )}
    </div>
  )
}

/**
 * The four-state pill (#1416), replacing the boolean that read only submitted /
 * not submitted.
 *
 * It never communicates by colour alone: every state carries its own word, the
 * two unanswered ones are additionally DASHED, and the leading dot is
 * `aria-hidden` ornament rather than the message.
 */
function StatusPill({
  row,
  label,
  accent,
  quiet,
  onAccent,
  face,
  radius,
}: {
  row: RosterRow
  label: string
  accent: string
  quiet: string
  onAccent: string
  face: string | undefined
  radius: number | string
}) {
  const done = isRowDone(row.state)
  // Asked but not answered — the two states that are not membership.
  const unanswered = row.state === 'invited' || row.state === 'declined'
  return (
    <span
      className="label-caption"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: 'var(--space-xs) var(--space-sm)',
        borderRadius: radius,
        fontFamily: face,
        border: `1px ${unanswered ? 'dashed' : 'solid'} ${done ? accent : quiet}`,
        background: done ? accent : 'transparent',
        color: done ? onAccent : quiet,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          flexShrink: 0,
          background: done ? 'currentColor' : unanswered ? 'transparent' : accent,
          border: unanswered ? `1px solid ${quiet}` : undefined,
        }}
      />
      {label}
    </span>
  )
}

/**
 * The row's × controls — kick and rescind — which are the same button with two
 * names. Extracted because they were literally identical apart from the label
 * and the handler, and `sonarjs/no-identical-functions` is on.
 */
function RowGlyphButton({
  label,
  color,
  onClick,
}: {
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'transparent',
        border: 'none',
        color,
        cursor: 'pointer',
        fontSize: 'var(--text-xl)',
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
      }}
    >
      ×
    </button>
  )
}
