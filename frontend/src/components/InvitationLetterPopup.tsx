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

// `<slug>.invitation.*` is runtime-dynamic, so relax t()'s compile-time key check (as LevelUpPopup's tKey).
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
 * Faction invitation-letter pop-up (#243). This file is the BEHAVIOUR (scrim,
 * Escape, join POST, confirm step); the letter body is the faction's
 * `invitationLetter` manifest surface (#3294, ADR-0090). No slug branch here.
 * Copy: `<slug>.invitation.*` in locales/en/factions.json.
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
  // The host owns the step and the POST; the letter only draws.
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

  // Joining is one-way (ADR-0019), so ENLIST arms a confirm step first (#493).
  async function join() {
    setJoining(true)
    setJoinError(null)
    try {
      // Adopting the answer (#1383) also clears the invitation, so the watcher won't reopen it.
      applyUser(await chooseFaction(factionSlug))
      onClose() // advance the queue; watcher keys the popup per slug so state resets
    } catch (err) {
      setJoinError(extractError(err, t('detail.errors.join')))
      setJoining(false)
    }
  }

  const joinTarget: JoinTarget = {
    currentFactionSlug: currentSlug,
    join,
    joining,
    joinError,
  }

  const headline = tKey(t, `${base}.headline`)

  // DISMISS IS NOT CANCEL: dismiss leaves the invitation standing; cancel returns to the pitch.
  // `invitation.dismiss` is shared with the feed card (#2620).
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        // Short viewports (#2130): the scrim scrolls and the letter centres via
        // `margin: auto` — `align-items: center` overflows off an unreachable top.
        alignItems: 'flex-start',
        justifyContent: 'center',
        // Full-bleed on a phone (#3294).
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
            // `autoFocus` scrolls the taller step into view (#2130).
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
