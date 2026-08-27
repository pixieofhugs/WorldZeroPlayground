/**
 * Duel shared slots (#718) — bespoke-frame + shared-slots, the split
 * `praxisCard/shared.tsx` uses.
 *
 * Skins own the FRAME (chrome, fonts, ornament). These slots own the LOGIC —
 * the stakes arithmetic and the per-side cast status — so it is written once and
 * every faction inherits the same (correct) rules. A skin may rearrange these
 * slots; it must never drop one and must never re-implement one.
 *
 * THE CONSUMERS ARE THE DUEL SEAL / FORFEIT DIALOGS (#1090). This file used to
 * serve the praxis-detail duel rail as well, which is why `NextStepLine` — one
 * line of narration per `DuelStatus` — lived here. The rail is gone and detail
 * narrates outcomes only, so that slot went with it; every export below is still
 * mounted by the seal skins (`components/duel/*DuelSealConfirm.tsx`) or, for
 * `duelSides`, by the composer's waiting surface. Checked per export, not per
 * folder — the #1068 trap.
 *
 * The rules these encode, all verified against the backend:
 *  - Stakes are per-faction, not a fixed 1.5×/0.5×: `duel_win_modifier` /
 *    `duel_loss_modifier` come off `FactionConfigOut`. Snide is 2.0× / **0.0×**
 *    (`eras/era_1.py`), so a losing Snide duelist earns literally nothing — any
 *    hardcoded ratio or "half your points" phrasing is a lie for 1 faction in 7.
 *  - A tie pays both sides 1.0×, *unless* exactly one side is Snide, in which
 *    case Snide takes the win rate and the other the loss rate
 *    (`compute_duel_multiplier`, `services/scoring.py`).
 *  - Casting while the duel is still `pending` is allowed and ungated. If the
 *    opponent declines, `praxis_scoring.py` never picks the duel up and the
 *    praxis scores as a plain solo praxis at 1.0×.
 *  - Numbers are BASE points before crowd votes. `total_stars` adds flat, after
 *    all multipliers, and is unknowable at cast time — so every figure here is
 *    labelled as a floor, never a total.
 *
 * ponytail: the faction multiplier (`own_task_modifier` / `other_task_modifier`)
 * is deliberately LEFT OUT of these figures. It multiplies both the win and the
 * lose branch identically, so it changes no decision the player makes here; it
 * is already broken out on the praxis-detail score breakdown; and including it
 * would mean porting `compute_faction_multiplier` to TS for zero added signal.
 *
 * Copy is faction-neutral by decision (#718) — plain typed `t()` keys, not a
 * `collabCopy`-style dynamic resolver. Per-faction identity lives in the skins.
 *
 * TYPE SIZE (#769). Every slot here sets its OWN size, via a `.content-*` role
 * class, and no skin may set `fontSize` on its wrapper. That inversion is the
 * fix for #769: the rail wrappers each carried `fontSize: var(--text-sm)` (9px,
 * Label tier), and because these slots inherited it, the roster, the next-step
 * line and the stakes copy — all functional text a player reads — sat at half
 * the 18px content floor. `DuelSlotTheme` deliberately carries no size field: a
 * skin owns font, colour and ornament, never type size (WORLD_ZERO_STYLE §4a).
 * Genuine Label-tier bits keep their own token explicitly — the tile captions
 * stay on the caption tier.
 *
 * THE SEAL BUTTONS NO LONGER NAME A SIZE AT ALL (#1783). #769 ruled they stay
 * at the tier's second-smallest step "as button chrome", and they carried that
 * as an inline value beside `.btn-primary` / `.btn-outline` — the same number
 * the class already declared. #1783 moved button chrome site-wide onto the
 * label-tier floor and weighed that precedent: it settled a decorative seal, not
 * the primary action chrome of the whole site, so it did not carry. Both buttons
 * take the class's size now, which is the only way they stay level with every
 * other confirm on the site. Do not reintroduce the inline value; an inline
 * style wins, so it would pin these two and nothing would warn you.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../api/duel'
import { useGameConfig } from '../../hooks/useGameConfig'
import { formatPoints } from '../../utils/points'

/**
 * The per-faction voice each slot dresses itself in. Every value is a CSS var.
 *
 * `credit` and `alarm` are the #1168 seam. They used to be hardcoded here as
 * `--color-success` / `--color-danger`, which meant NO skin could route them:
 * a global functional ink chosen against the app's near-white surface, painted
 * on eight different faction sheets (WORLD_ZERO_STYLE §3, the #694 shape). The
 * measurements that forced it are on `--color-success`, which reads **2.07:1**
 * on S.N.I.D.E.'s photocopier ink, **1.99:1** on Singularity's terminal glass
 * and **1.88:1** on Everymen's inked forfeit panel — all in the LIGHT theme,
 * because those three grounds are dark in both themes while the token flips
 * with the viewer.
 *
 * Both default to exactly what this file painted before, so a skin that passes
 * neither is byte-identical. Pass an ink the skin has MEASURED on the ground it
 * mounts these slots over; this seam is a place to repoint an existing token
 * (`--faction-{slug}-card-credit` / `-card-notice` exist for all eight), never
 * a reason to mint one.
 */
export interface DuelSlotTheme {
  /** Faction accent — figures, emphasis, rules. */
  accent: string
  /** Secondary / muted text. */
  muted?: string
  /** Body font for the prose. */
  bodyFont?: string
  /**
   * A positive figure and a sealed side: the win tile's number and the
   * roster's "sealed" mark. Default `--color-success`.
   */
  credit?: string
  /**
   * A zero / destructive figure: the lose tile when it pays nothing (Snide's
   * 0.0×). Default `--color-danger`.
   */
  alarm?: string
}

const DEFAULT_THEME: Required<Pick<DuelSlotTheme, 'muted' | 'bodyFont' | 'credit' | 'alarm'>> = {
  muted: 'var(--color-text-secondary)',
  bodyFont: 'var(--font-body)',
  credit: 'var(--color-success)',
  alarm: 'var(--color-danger)',
}

/**
 * Field-by-field rather than a spread: `{...DEFAULT_THEME, ...theme}` would let
 * an explicit `undefined` in a partially-filled object erase a default — the
 * detail `DuelCardInk` (#1153) records for the same reason. Everymen relies on
 * it directly, handing `credit` only in forfeit mode and `undefined` otherwise.
 */
function slotInk(theme: DuelSlotTheme): { credit: string; alarm: string } {
  return {
    credit: theme.credit ?? DEFAULT_THEME.credit,
    alarm: theme.alarm ?? DEFAULT_THEME.alarm,
  }
}

/* -------------------------------------------------------------------------- */
/* Side resolution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Split a duel into "me" and "the foe" from the viewer's character id.
 *
 * Every duel surface needs this and each one used to spell it differently (the
 * read page keyed off the praxis id, the composer off the character id). One
 * helper, so a viewer who is neither side (a spectator) falls back predictably
 * to the challenger's point of view.
 */
export function duelSides(
  duel: DuelDetailOut,
  viewerCharacterId: number | null | undefined,
): { me: DuelSideOut; foe: DuelSideOut } {
  const iAmOpponent = viewerCharacterId != null && duel.opponent.character_id === viewerCharacterId
  return iAmOpponent
    ? { me: duel.opponent, foe: duel.challenger }
    : { me: duel.challenger, foe: duel.opponent }
}

/* -------------------------------------------------------------------------- */
/* Stakes arithmetic                                                          */
/* -------------------------------------------------------------------------- */

export interface DuelStakes {
  /** Base points if this side wins the head-to-head. */
  win: number
  /** Base points if it loses. `0` for Snide — by construction, not by branch. */
  lose: number
  /**
   * Base points on a tie: 1.0×, or the win/loss rate when exactly one side
   * holds the take-the-tie perk (`takes_duel_ties`).
   */
  tie: number
  /** Base points if the duel never happens (declined / no opponent): plain solo. */
  solo: number
}

/**
 * Win / lose / tie / solo-fallback base points for ONE side of a duel.
 *
 * Uses the VIEWER's own faction config — the modifier that applies to you is
 * yours (the rail's *tokens* come from the opponent instead; each for its own
 * reason, see #718).
 *
 * Returns `null` until the app-wide game config has loaded, so callers render
 * nothing rather than a wrong number.
 */
export function useDuelStakes(
  viewerFactionSlug: string | null | undefined,
  opponentFactionSlug: string | null | undefined,
  taskPointValue: number | null | undefined,
): DuelStakes | null {
  const config = useGameConfig()
  if (!config || taskPointValue == null) return null
  const faction = config.factions.find((entry) => entry.slug === viewerFactionSlug)
  if (!faction) return null

  // Tie: 1.0× for both sides, unless exactly ONE side holds `takes_duel_ties` —
  // then that side takes its win rate and the other its loss rate.
  //
  // #2664: this reads the era's flag off the payload rather than comparing a
  // slug, and it is the same field the server's `sole_tie_taker_slug` banks the
  // points from. That is the whole point: the stakes a player is shown here and
  // the points the server actually banks are now one rule with one source,
  // rather than two hardcoded copies of `'snide'` that agreed by luck and that
  // no era could move (ADR-0042).
  const opponent = config.factions.find((entry) => entry.slug === opponentFactionSlug)
  const viewerTakesTies = faction.takes_duel_ties
  const opponentTakesTies = opponent?.takes_duel_ties ?? false
  const tieModifier =
    viewerTakesTies === opponentTakesTies
      ? 1.0
      : viewerTakesTies
        ? faction.duel_win_modifier
        : faction.duel_loss_modifier

  return {
    win: taskPointValue * faction.duel_win_modifier,
    lose: taskPointValue * faction.duel_loss_modifier,
    tie: taskPointValue * tieModifier,
    solo: taskPointValue,
  }
}


/* -------------------------------------------------------------------------- */
/* StakesTiles — what winning and losing are worth                            */
/* -------------------------------------------------------------------------- */

function Tile({
  label,
  value,
  color,
  theme,
}: {
  label: string
  value: string
  color: string
  theme: DuelSlotTheme
}) {
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2"
      style={{
        border: `1px solid ${theme.accent}`,
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <span className="label-caption" style={{ color: theme.muted ?? DEFAULT_THEME.muted }}>
        {label}
      </span>
      {/* The figure is a score — "numbers a player cares about" are content tier
          (WORLD_ZERO_STYLE §4), and this figure is the whole point of the tile. */}
      <span className="content-title" style={{ fontWeight: 700, color }}>
        {value}
      </span>
    </div>
  )
}

/**
 * The win / lose pair, plus the tie rule as a line of copy (not a third tile —
 * a tie is an edge, and three equal tiles reads like three equal outcomes).
 *
 * While the duel is still `pending` the pair is replaced outright by the
 * solo-fallback line: nothing is at stake until the opponent accepts, and
 * showing a lose figure they might never be exposed to would be false.
 */
export function StakesTiles({
  viewerFactionSlug,
  opponentFactionSlug,
  opponentName,
  taskPointValue,
  status,
  theme,
}: {
  viewerFactionSlug: string | null | undefined
  opponentFactionSlug: string | null | undefined
  opponentName: string
  taskPointValue: number | null | undefined
  status: DuelStatus
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const stakes = useDuelStakes(viewerFactionSlug, opponentFactionSlug, taskPointValue)
  if (!stakes) return null

  const font = theme.bodyFont ?? DEFAULT_THEME.bodyFont
  const muted = theme.muted ?? DEFAULT_THEME.muted
  const { credit, alarm } = slotInk(theme)

  // pending: the challenge is unanswered, so there is no head-to-head yet.
  if (status === 'pending') {
    return (
      <p
        className="mt-2 content-text"
        style={{ fontFamily: font, color: muted }}
      >
        {t('duelStakes.soloFallback', {
          name: opponentName,
          points: formatPoints(stakes.solo),
        })}
      </p>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <Tile
          label={t('duelStakes.winLabel')}
          value={formatPoints(stakes.win)}
          color={credit}
          theme={theme}
        />
        <Tile
          label={t('duelStakes.loseLabel')}
          value={formatPoints(stakes.lose)}
          color={stakes.lose === 0 ? alarm : muted}
          theme={theme}
        />
      </div>
      <p
        className="mt-2 content-text"
        style={{ fontFamily: font, color: muted }}
      >
        {t('duelStakes.tieLine', { points: formatPoints(stakes.tie) })}{' '}
        {t('duelStakes.beforeVotes')}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* RaceRoster — who has cast                                                  */
/* -------------------------------------------------------------------------- */

function RosterRow({
  name,
  cast,
  theme,
}: {
  name: string
  cast: boolean
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <li
      className="flex items-center justify-between gap-2 content-text"
      style={{
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
      }}
    >
      <span style={{ fontWeight: 700 }}>{name}</span>
      <span
        style={{
          // 18px regular, so this mark owes the FULL 4.5:1 — it is the tightest
          // consumer of `credit` (the win figure beside it is 24px bold and owes
          // only 3:1), and it is what the #1168 routings are measured against.
          color: cast ? slotInk(theme).credit : theme.muted ?? DEFAULT_THEME.muted,
        }}
      >
        {cast ? t('duelRoster.sealed') : t('duelRoster.walking')}
      </span>
    </li>
  )
}

/**
 * Per-side cast status, straight off `DuelSideOut.is_submitted` — the field that
 * has been on the wire since #313 and, until now, was never rendered anywhere.
 *
 * `spectator` (#999): a viewer who is not a party to the duel names BOTH sides by
 * `display_name` — never "You". The seal-confirm skins always render for the
 * caster (a party), so they leave it at the default and keep the "You" row.
 */
export function RaceRoster({
  me,
  foe,
  theme,
  spectator = false,
}: {
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
  spectator?: boolean
}) {
  const { t } = useTranslation('praxis')
  return (
    <ul className="flex flex-col gap-1 mt-2">
      <RosterRow
        name={spectator ? me.display_name : t('duelRoster.you')}
        cast={me.is_submitted}
        theme={theme}
      />
      <RosterRow name={foe.display_name} cast={foe.is_submitted} theme={theme} />
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Seal copy — the one thing that differs between the two modes               */
/* -------------------------------------------------------------------------- */

/**
 * Which irreversible beat the seal dialog is standing in for (#751).
 *
 *  - `submit` — casting your side. Today's dialog, unchanged.
 *  - `forfeit` — pulling back a SETTLED duel side, which hands the win to the
 *    opponent permanently. Used to be an inline expand on the praxis-detail
 *    page: the one duel moment with a genuinely irreversible consequence, and
 *    the only one with no skinnable surface.
 *
 * Deliberately NOT a second pair of surface keys. A forfeit dialog is the seal
 * dialog with different words — same frame, same stakes, same roster, same
 * footer — so each faction writes two files, not four (#751, ADR-free ruling on
 * the manifest seam after #782).
 */
export type DuelSealMode = 'submit' | 'forfeit'

/** Everything that varies between the modes, resolved once for every skin. */
export interface DuelSealCopy {
  /** Dialog title, also its `aria-label`. */
  heading: string
  /** The main body line. */
  body: string
  /**
   * Reassurance line under the body, or `null` when the state has none. Only
   * `submit` has one (the free-reopen note); a forfeit has nothing reassuring
   * left to say, which is the point.
   */
  note: string | null
  /** Confirm-button label. */
  confirmLabel: string
  /** Whether the confirm button should wear the destructive tone. */
  danger: boolean
}

/**
 * The mode branch, written once so no skin re-implements it.
 *
 * Copy is the shipped `duelSeal.*` / `duelForfeit.*` catalog verbatim — the
 * forfeit strings are the ones the inline prompt already used, so promoting it
 * to a dialog changes the frame and nothing a player reads. `duelForfeit.cost`
 * needs live stakes, so this is a hook; the figures come from the same
 * `useDuelStakes` the rail and the tiles use, which is how a Snide duelist is
 * correctly told they keep 0 rather than some invented "half".
 */
export function useDuelSealCopy(
  mode: DuelSealMode,
  duel: DuelDetailOut,
  viewerCharacterId: number | null | undefined,
  taskPointValue: number | null | undefined,
): DuelSealCopy {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)
  // Unconditional: hooks may not sit behind the mode branch.
  const stakes = useDuelStakes(me.faction_slug, foe.faction_slug, taskPointValue)

  if (mode === 'forfeit') {
    const cost = stakes
      ? t('duelForfeit.cost', {
          name: foe.display_name,
          points: formatPoints(stakes.lose),
          win: formatPoints(stakes.win),
        })
      : null
    return {
      heading: t('duelForfeit.action'),
      // Falls back to the prompt alone until the game config lands, rather
      // than rendering a sentence with a hole where the number goes.
      body: cost ? `${t('duelForfeit.confirmPrompt')} ${cost}` : t('duelForfeit.confirmPrompt'),
      note: null,
      confirmLabel: t('duelForfeit.action'),
      danger: true,
    }
  }

  return {
    heading: t('duelSeal.heading'),
    body:
      duel.status === 'pending'
        ? t('duelSeal.bodyPending', { name: foe.display_name })
        : t('duelSeal.bodyActive', { name: foe.display_name }),
    // The free-reopen half of the truth: until they cast, nothing is stuck.
    // Only meaningful once the duel is live — a pending duel can't settle.
    note:
      duel.status === 'active' && !foe.is_submitted
        ? t('duelSeal.reopenNote', { name: foe.display_name })
        : null,
    confirmLabel: t('duelSeal.confirm'),
    danger: false,
  }
}

/* -------------------------------------------------------------------------- */
/* SealActions — the confirm / cancel pair                                    */
/* -------------------------------------------------------------------------- */

/**
 * The dialog's action pair. Global order is [Cancel] … [Submit] (#646), so the
 * affirmative sits on the right on every surface.
 *
 * `danger` repaints the confirm button destructively for the forfeit mode
 * (#751). It lives here rather than in each skin because the tone is a fact
 * about the action, not a faction flourish — a forfeit is red in every voice.
 */
export function SealActions({
  onConfirm,
  onCancel,
  busy,
  confirmLabel,
  cancelLabel,
  danger,
  theme,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  danger?: boolean
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        type="button"
        onClick={onCancel}
        className="btn-outline px-4 py-2"
        style={{ fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont }}
      >
        {cancelLabel ?? t('duelSeal.cancel')}
      </button>
      <button
        type="button"
        // The sheet's commit, whether it seals or forfeits (#2453). Its label is
        // `duelSeal.confirm` / `duelForfeit.action` — catalog copy, and the seal
        // half of it moved in #1928.
        data-testid="duel-seal-confirm"
        autoFocus
        disabled={busy}
        onClick={onConfirm}
        className="btn-primary px-4 py-2"
        style={{
          fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
          opacity: busy ? 0.5 : 1,
          ...(danger
            ? {
                background: 'var(--color-danger)',
                borderColor: 'var(--color-danger)',
                // NOT --color-text-on-accent: that is #ffffff in both themes
                // and the dark red is bright, so the forfeit label measured
                // 2.77:1 (#1169). --color-on-danger is the ink for this fill.
                color: 'var(--color-on-danger)',
              }
            : {}),
        }}
      >
        {confirmLabel ?? t('duelSeal.confirm')}
      </button>
    </div>
  )
}
