import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withAppCopy } from '../../i18n'
import type { CharacterOut } from '../../api/auth'
import { useModal } from '../../hooks/useModal'
import { factionName } from '../../utils/factions'
import { REQUESTS_QUEUE_LINK } from '../../pages/updates/requestsQueueAnchor'
import FactionAvatar from '../avatar/FactionAvatar'
import { drawAtRoot } from '../ui/drawAtRoot'
import PendingBadge from './PendingBadge'
import './youSheet.css'

// Admins only: the chunk and its counts never reach a player.
const ModGroup = lazy(() => withAppCopy(import('../admin/ModGroup')))

/**
 * The You tab's bottom sheet (#3761): profile, Updates, Settings, and for mods a
 * Moderation group. It stops above the tab bar, which stays live (#1566).
 */
export default function YouSheet({
  character,
  pending,
  isAdmin,
  onClose,
}: {
  character: CharacterOut
  pending: number
  isAdmin: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  const ref = useModal(onClose)
  const requests = t('nav.youRequests', { count: pending })

  return drawAtRoot(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={t('nav.you')}>
      <button type="button" className="you-scrim" aria-label={t('nav.youClose')} onClick={onClose} />
      <div className="you-sheet">
        <span className="you-grab" />
        <div className="you-head">
          <FactionAvatar character={character} size={40} badge={false} />
          <div>
            <div className="you-name">{character.display_name}</div>
            <div className="you-meta">
              {t('nav.youMeta', { level: character.level, faction: factionName(character.faction_slug) })}
            </div>
          </div>
        </div>
        <Link to={`/characters/${character.id}`} className="you-row" onClick={onClose}>
          <span className="you-row__text">{t('nav.youProfile')}</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link
          to={REQUESTS_QUEUE_LINK}
          className="you-row"
          onClick={onClose}
          aria-label={pending > 0 ? `${t('nav.updates')}, ${requests}` : undefined}
        >
          <span className="you-row__text">
            {t('nav.updates')}
            {pending > 0 && <span className="you-row__sub">{requests}</span>}
          </span>
          <PendingBadge count={pending} />
          <span aria-hidden="true">›</span>
        </Link>
        <Link to="/settings" className="you-row" onClick={onClose}>
          <span className="you-row__text">{t('settings.title')}</span>
          <span aria-hidden="true">›</span>
        </Link>
        {isAdmin && (
          <Suspense fallback={null}>
            <ModGroup onNavigate={onClose} />
          </Suspense>
        )}
      </div>
    </div>,
  )
}
