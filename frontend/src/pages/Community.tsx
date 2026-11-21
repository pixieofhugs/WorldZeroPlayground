import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SegmentedRail from '../components/ui/FilterBar/SegmentedRail'
import { useFormFactor } from '../hooks/useFormFactor'
import { rememberSide, sideHref, type CommunitySide } from './communitySide'
import './community.css'

/**
 * The phone's Community page (#3761): one title and a Players | Factions switch over
 * today's two pages, which keep their routes. Desktop gets the page untouched.
 */
export default function Community({ side, children }: { side: CommunitySide; children: ReactNode }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const mobile = useFormFactor() === 'mobile'
  useEffect(() => rememberSide(side), [side])
  if (!mobile) return <>{children}</>

  return (
    <>
      <div className="community-head">
        <h1 className="community-title">{t('nav.community')}</h1>
        <div className="community-switch">
          <SegmentedRail
            rail={{
              key: 'community',
              label: t('nav.community'),
              value: side,
              defaultValue: 'players',
              segments: [
                { value: 'players', label: t('nav.players') },
                { value: 'factions', label: t('nav.factions') },
              ],
              onChange: (next) => navigate(sideHref(next as CommunitySide), { replace: true }),
            }}
          />
        </div>
      </div>
      {children}
    </>
  )
}
