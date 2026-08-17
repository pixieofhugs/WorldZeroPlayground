/**
 * Block, from the character profile (#1668, ADR-0077).
 *
 * IT TAKES NO EDGE (#1907). The control used to be offered only on the viewer's
 * own outgoing friend/foe edge, because a block was a `status` on one and the
 * client had to name a row id — and `GET /relationships` is outgoing-only. That
 * ceiling excluded exactly the player the feature exists for: declared a foe by
 * someone, holding no declaration of their own, and so shown the friend/foe
 * buttons and no way to block. ADR-0077 moves the block onto its own record
 * keyed by character, and a character id is something the profile always has,
 * so the gate below no longer mentions an edge at all.
 *
 * VISIBILITY IS THE CONTRACT. Blocking is a safety affordance, and the rule
 * "hide unusable controls, don't show them disabled" is not cosmetic here: a
 * block button rendered next to `unblock`, or on your own profile, is a wrong
 * ACTION offered, not a wrong pixel. All of it lives in the gate below rather
 * than in the caller's JSX, so the page cannot place this control anywhere it
 * would be wrong, and so the three cases are assertable in a harness with no
 * DOM.
 *
 * WHY IT CONFIRMS. `unblock` is a recovery from a deliberate act and reads fine
 * as a direct click. Block IS the deliberate act, so it goes through the shared
 * `ConfirmDialog` (#1082) — which, unlike `window.confirm`, is styleable, wears
 * the faction of the surface it interrupts, traps focus, and is visible to the
 * test harness. The wording is a pure builder for the same reason the
 * composer's are: the dialog needs a DOM, a request does not.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import ConfirmDialog, {
  type ConfirmRequest,
} from '../../components/confirm/ConfirmDialog'

/** Interpolated keys can't be the typed literals `t()` wants (composerConfirms). */
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, string | number>,
) => string

/**
 * The confirm, fully worded — a pure builder so its copy is testable without a
 * browser.
 *
 * It names the consequence rather than asking "are you sure", and it carries
 * the three things ADR-0077 decided that a player would otherwise have to guess
 * at: what a block actually reaches (taunts and the friends-and-foes feed
 * sources — it is a feed-scope instrument, not a contact barrier), that it is
 * SILENT to the person blocked, and that it is REVERSIBLE.
 *
 * This is the only place a player reads any of that, so the reach clause stays
 * as narrow as the ADR's own list. Widening what a block prevents is a separate
 * decision with its own record; this copy must not promise it early.
 */
export function blockConfirm(displayName: string): ConfirmRequest {
  return {
    kind: 'blockRelationship',
    title: tString('common:relationships.blockConfirm.title', {
      name: displayName,
    }),
    body: tString('common:relationships.blockConfirm.body'),
    confirmLabel: tString('common:relationships.blockConfirm.action'),
    danger: true,
  }
}

export default function RelationshipBlockControl({
  viewerCharacterId,
  targetCharacterId,
  targetDisplayName,
  factionSlug,
  alreadyBlocked,
  busy,
  onBlock,
}: {
  /** The viewer's active character; undefined when logged out / character-less. */
  viewerCharacterId: number | undefined
  /** Whose profile this is. */
  targetCharacterId: number
  /** Their name — the dialog and the accessible name both address a person. */
  targetDisplayName: string
  /** Their faction: the dialog wears the surface it interrupts. */
  factionSlug: string | null | undefined
  /**
   * This viewer already holds a block record against them. Read from the
   * viewer's OWN block list, never from anything the target could see — so this
   * is false for the blocked party by construction, not by a branch.
   */
  alreadyBlocked: boolean
  /** A relationship mutation is in flight. */
  busy: boolean
  /** Write the block. The page owns the API call and the error. */
  onBlock: () => void
}) {
  const { t } = useTranslation('common')
  const [confirming, setConfirming] = useState(false)

  const blockable =
    viewerCharacterId !== undefined &&
    viewerCharacterId !== targetCharacterId &&
    // Already blocked: the slot belongs to `unblock`. No edge is consulted —
    // blocking someone you have friended is legal and leaves the edge alive.
    !alreadyBlocked
  if (!blockable) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy}
        // "block" alone is a verb with no object once a screen reader lifts it
        // out of the card it sits in.
        aria-label={t('relationships.blockAria', { name: targetDisplayName })}
        className="label-caption"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        {t('relationships.block')}
      </button>
      {confirming && (
        <ConfirmDialog
          request={blockConfirm(targetDisplayName)}
          factionSlug={factionSlug}
          onConfirm={() => {
            setConfirming(false)
            onBlock()
          }}
          onDismiss={() => setConfirming(false)}
        />
      )}
    </>
  )
}
