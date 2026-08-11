/**
 * Block, from the character profile (#1668, ADR-0009).
 *
 * The whole block path was already built — `PUT /relationships/{id}`, the
 * service, and `blockRelationship` in `api/relationships.ts` with the ADR cited
 * directly above it — except for the control. So the profile could UNblock an
 * edge it had never been able to block. This is the missing half.
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
 *
 * ponytail (#1668): block is offered only on the viewer's OWN outgoing edge,
 * because that is the only edge whose id the client ever holds —
 * `GET /relationships` is outgoing-only (`list_relationships` filters
 * `from_character_id == me`). The backend is symmetric (either party may block,
 * `relationship_service.block_relationship`), so ADR-0009's motivating case —
 * B is declared a foe by A, cannot delete A's edge, and blocks it — has no id
 * to act on from here and shows the friend/foe buttons instead. The upgrade
 * path is the incoming edge appearing in the list response; that is backend
 * work and its own issue, deliberately not this one.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import ConfirmDialog, {
  type ConfirmRequest,
} from '../../components/confirm/ConfirmDialog'
import type { RelationshipListItem } from '../../api/relationships'

/** Interpolated keys can't be the typed literals `t()` wants (composerConfirms). */
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, string | number>,
) => string

/**
 * The confirm, fully worded — a pure builder so its copy is testable without a
 * browser.
 *
 * It names the consequence rather than asking "are you sure", and it says the
 * two things ADR-0009 decided that a player would otherwise assume the opposite
 * of: the block is VISIBLE to the person blocked (World Zero diverges from the
 * silent-block convention on purpose), and it is REVERSIBLE.
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
  relationship,
  viewerCharacterId,
  targetCharacterId,
  targetDisplayName,
  factionSlug,
  busy,
  onBlock,
}: {
  /** The viewer's edge to this character, or null if they hold none. */
  relationship: RelationshipListItem | null
  /** The viewer's active character; undefined when logged out / character-less. */
  viewerCharacterId: number | undefined
  /** Whose profile this is. */
  targetCharacterId: number
  /** Their name — the dialog and the accessible name both address a person. */
  targetDisplayName: string
  /** Their faction: the dialog wears the surface it interrupts. */
  factionSlug: string | null | undefined
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
    relationship !== null &&
    // ADR-0009: `Blocked` is dyad-level — either edge blocked shows it to both
    // parties. Whichever edge carries it, the slot belongs to `unblock`.
    relationship.display_status !== 'Blocked'
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
