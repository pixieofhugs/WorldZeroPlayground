/**
 * Duel shared slots (#718) — bespoke-frame + shared-slots, the split
 * `praxisCard/mobile/shared.tsx` uses.
 *
 * Skins own the FRAME (chrome, fonts, ornament). These slots own the LOGIC —
 * the stakes arithmetic, the per-side cast status, and the per-`DuelStatus`
 * branching — so it is written once and every faction inherits the same
 * (correct) rules. A skin may rearrange these slots; it must never drop one and
 * must never re-implement one.
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
 * class, and no rail skin may set `fontSize` on its wrapper. That inversion is
 * the fix for #769: the rail wrappers each carried `fontSize: var(--text-sm)`
 * (9px, Label tier), and because these slots inherited it, the roster, the
 * next-step line and the stakes copy — all functional text a player reads — sat
 * at half the 18px content floor. `DuelSlotTheme` deliberately carries no size
 * field: a skin owns font, colour and ornament, never type size
 * (WORLD_ZERO_STYLE §4a). Genuine Label-tier bits keep their own token
 * explicitly — the tile captions stay on `.eyebrow`, the seal buttons on
 * `--text-sm` as button chrome.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../api/duel'
import { useGameConfig } from '../../hooks/useGameConfig'

/** The per-faction voice each slot dresses itself in. Every value is a CSS var. */
export interface DuelSlotTheme {
  /** Faction accent — figures, emphasis, rules. */
  accent: string
  /** Secondary / muted text. */
  muted?: string
  /** Body font for the prose. */
  bodyFont?: string
}

const DEFAULT_THEME: Required<Pick<DuelSlotTheme, 'muted' | 'bodyFont'>> = {
  muted: 'var(--color-text-secondary)',
  bodyFont: 'var(--font-body)',
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
  /** Base points on a tie (1.0×, or the win/loss rate when exactly one side is Snide). */
  tie: number
  /** Base points if the duel never happens (declined / no opponent): plain solo. */
  solo: number
}

const SNIDE_FACTION_SLUG = 'snide'

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

  // Tie: 1.0× for both sides, unless exactly one side is Snide — then Snide
  // takes the win rate and the other side the loss rate.
  const exactlyOneSnide =
    (viewerFactionSlug === SNIDE_FACTION_SLUG) !== (opponentFactionSlug === SNIDE_FACTION_SLUG)
  const tieModifier = !exactlyOneSnide
    ? 1.0
    : viewerFactionSlug === SNIDE_FACTION_SLUG
      ? faction.duel_win_modifier
      : faction.duel_loss_modifier

  return {
    win: taskPointValue * faction.duel_win_modifier,
    lose: taskPointValue * faction.duel_loss_modifier,
    tie: taskPointValue * tieModifier,
    solo: taskPointValue,
  }
}

/** Points render as integers where they are whole, one decimal otherwise. */
export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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
      <span className="eyebrow" style={{ color: theme.muted ?? DEFAULT_THEME.muted }}>
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
          color="var(--color-success)"
          theme={theme}
        />
        <Tile
          label={t('duelStakes.loseLabel')}
          value={formatPoints(stakes.lose)}
          color={stakes.lose === 0 ? 'var(--color-danger)' : muted}
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
          color: cast ? 'var(--color-success)' : theme.muted ?? DEFAULT_THEME.muted,
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
 */
export function RaceRoster({
  me,
  foe,
  theme,
}: {
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <ul className="flex flex-col gap-1 mt-2">
      <RosterRow name={t('duelRoster.you')} cast={me.is_submitted} theme={theme} />
      <RosterRow name={foe.display_name} cast={foe.is_submitted} theme={theme} />
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* NextStepLine — what you are waiting for                                    */
/* -------------------------------------------------------------------------- */

/**
 * One line per `DuelStatus`, explicit — never a fallthrough (#717 shipped a
 * settled tally to `pending` and `declined` precisely because the old component
 * had one). The forfeited case pre-empts the status, since a forfeit can land
 * on any live duel.
 */
export function NextStepLine({
  duel,
  me,
  foe,
  theme,
}: {
  duel: DuelDetailOut
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const style: CSSProperties = {
    fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
    color: theme.muted ?? DEFAULT_THEME.muted,
  }

  if (duel.forfeited_by_character_id != null) {
    const iForfeited = duel.forfeited_by_character_id === me.character_id
    return (
      <p style={style} className="mt-2 content-text">
        {iForfeited
          ? t('duelNextStep.youForfeited')
          : t('duelNextStep.wonByDefault', { name: foe.display_name })}
      </p>
    )
  }

  let line: string
  switch (duel.status) {
    case 'pending':
      line = t('duelNextStep.pending', { name: foe.display_name })
      break
    case 'declined':
      line = t('duelNextStep.declined', { name: foe.display_name })
      break
    case 'active':
      // Both sides having cast is what SETTLES a duel, so inside `active` at
      // most one side is submitted. Either they owe a cast, or you do.
      line = me.is_submitted
        ? t('duelNextStep.activeWaitingOnThem', { name: foe.display_name })
        : t('duelNextStep.activeWaitingOnYou', { name: foe.display_name })
      break
    case 'settled':
      line = t('duelNextStep.settled')
      break
    case 'resolved':
      // The era closed and the outcome is frozen (ADR-0052). A null winner is a
      // tie or a no-contest (an `active` duel that never became votable).
      line =
        duel.winner_character_id == null
          ? t('duelNextStep.resolvedNoWinner')
          : duel.winner_character_id === me.character_id
            ? t('duelNextStep.resolvedYouWon', { name: foe.display_name })
            : t('duelNextStep.resolvedYouLost', { name: foe.display_name })
      break
  }

  return (
    <p style={style} className="mt-2 content-text">
      {line}
    </p>
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
        style={{ fontSize: 'var(--text-sm)', fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont }}
      >
        {cancelLabel ?? t('duelSeal.cancel')}
      </button>
      <button
        type="button"
        autoFocus
        disabled={busy}
        onClick={onConfirm}
        className="btn-primary px-4 py-2"
        style={{
          fontSize: 'var(--text-sm)',
          fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
          opacity: busy ? 0.5 : 1,
          ...(danger
            ? {
                background: 'var(--color-danger)',
                borderColor: 'var(--color-danger)',
                color: 'var(--color-text-on-accent)',
              }
            : {}),
        }}
      >
        {confirmLabel ?? t('duelSeal.confirm')}
      </button>
    </div>
  )
}
