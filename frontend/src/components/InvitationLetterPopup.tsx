import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { factionName } from '../utils/factions'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import { useAuth } from '../auth/AuthContext'
import { useFormFactor } from '../hooks/useFormFactor'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { JoinConfirm, type JoinTarget } from './JoinControl'
import type { InvitationPerk } from './invitation/letterTypes'

// The per-faction key path (`<slug>.invitation.*`) is runtime-dynamic, so it
// isn't one of the compile-time key literals the scoped t() expects. Resolve
// through a plain-string / plain-object view of t -- the catalog still owns the
// words; only the compile-time key check is relaxed for these lookups (same
// pattern as LevelUpPopup's tKey).
function tKey(t: TFunction<'factions'>, key: string): string {
  const resolve = t as unknown as (k: string) => string
  return resolve(key)
}

function tArr<T>(t: TFunction<'factions'>, key: string): T[] {
  const resolve = t as unknown as (k: string, o: { returnObjects: true }) => unknown
  const value = resolve(key, { returnObjects: true })
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * InvitationLetterPopup -- the #243 faction invitation-letter pop-up. When a
 * character earns faction X's invitation, this surfaces X's recruitment letter.
 *
 * THIS FILE IS THE BEHAVIOUR; THE LETTER IS DISPATCHED (#3294). The scrim, the
 * Escape key, the join POST, the one-way confirm step (`JoinConfirm`, #2656),
 * dismiss and queue advance live here and are the same for every faction. The
 * letter BODY -- its ground, masthead, ornaments, perks and CTA -- is the
 * faction's own `invitationLetter` manifest surface (`components/invitation/`),
 * which is tree and paint only (ADR-0090). No slug is branched on here.
 *
 * Copy lives in frontend/src/locales/en/factions.json under
 * `<slug>.invitation.{headline,pitch,perks[].{name,desc},cta.join}`
 * (writer-editable) and is handed to the letter resolved. a11y matches
 * LevelUpPopup: Escape closes, primary action autofocuses, no focus trap.
 *
 * #2298 cut the kicker, the prospectus overline and the terms slip, and refilled
 * the slip's box with the perks.
 */

interface InvitationLetterPopupProps {
  factionSlug: string
  onClose: () => void
}

export default function InvitationLetterPopup({
  factionSlug,
  onClose,
}: InvitationLetterPopupProps) {
  const { t } = useTranslation('factions')
  const { user, applyUser } = useAuth()
  const mobile = useFormFactor() === 'mobile'
  const currentSlug = user?.character?.faction_slug
  // `confirming` stays with the popup because the letter draws the open step
  // (its own CTA, flanked by its own ornaments) and the host is the only thing
  // that can know which step it is on. `joining` / `joinError` stay because the
  // host owns the POST -- together with the current slug they are the
  // `JoinTarget` handed to the confirm step.
  const [confirming, setConfirming] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const name = factionName(factionSlug)
  const base = `${factionSlug}.invitation`
  const Letter = resolveVariant(surfaceMap('invitationLetter'), factionSlug)

  // The letter ENLIST commits the join in place (#493). Joining is one-way
  // (ADR-0019), so ENLIST arms a confirm step before actually joining.
  async function join() {
    setJoining(true)
    setJoinError(null)
    try {
      // Membership moves the faction slug and the capability flags together, and
      // this is also what clears the letter out of `user.character.invitations`
      // so the watcher stops re-opening it. The POST answers that whole viewer
      // (#1383), so adopting it does the job the follow-up `/auth/me` used to.
      applyUser(await chooseFaction(factionSlug))
      onClose() // advance the queue; watcher keys the popup per slug so state resets
    } catch (err) {
      setJoinError(extractError(err, t('detail.errors.join')))
      setJoining(false)
    }
  }

  /** Five fields on the faction page; the four the trio reads, built here. */
  const joinTarget: JoinTarget = {
    currentFactionSlug: currentSlug,
    join,
    joining,
    joinError,
  }

  const headline = tKey(t, `${base}.headline`)

  // DISMISS IS NOT CANCEL: `onDismiss` closes the letter and leaves the
  // invitation standing, while the cancel one click further in returns to the
  // pitch. `invitation.dismiss` is top-level, not per-slug, and the feed's
  // invitation CARD reads it too (#2620) -- deferring is one act.
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        // Short viewports (#2130): the scrim is the scroller, and the letter
        // centres with `margin: auto` rather than `align-items: center`. A
        // centred flex item taller than its scroll container overflows off BOTH
        // ends and the top end cannot be scrolled to. Auto margins centre while
        // there is free space and collapse to 0 when there isn't. Both steps
        // live in this one scrim; the confirm button's `autoFocus` is what
        // scrolls it into view when the taller step swaps in.
        alignItems: 'flex-start',
        justifyContent: 'center',
        // Full-bleed on a phone (#3294): the letter IS the screen there.
        padding: mobile ? 0 : 'var(--space-xl)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        zIndex: 1000,
        background: 'var(--color-overlay-strong)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        style={{ margin: 'auto', maxWidth: '100%', width: mobile ? '100%' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <Letter
          slug={factionSlug}
          name={name}
          headline={headline}
          pitch={tKey(t, `${base}.pitch`)}
          perks={tArr<InvitationPerk>(t, `${base}.perks`)}
          joinLabel={tKey(t, `${base}.cta.join`)}
          dismissLabel={t('invitation.dismiss')}
          confirming={confirming}
          onEnlist={() => setConfirming(true)}
          onDismiss={onClose}
          renderConfirm={(skin) => (
            // `autoFocus` because this step is TALLER than the pitch and both
            // live in the one scrim above: focusing the affirmative is what
            // scrolls it into view on a short viewport (#2130).
            <JoinConfirm
              membership={joinTarget}
              name={name}
              skin={skin}
              joiningLabel={t('detail.join.joining')}
              onCancel={() => setConfirming(false)}
              autoFocus
            />
          )}
        />
      </div>
    </div>
  )
}
