import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import Quill from './Quill'

/** Step `declined`: nothing was written; Reconsider is Back to the contract. */
export default function Declined({ onReconsider }: { onReconsider?: () => void }) {
  const { t } = useTranslation('onboarding')
  const { user } = useAuth()
  return (
    <section className="ob-declined">
      <span aria-hidden="true" className="boing ob-dq">
        <span className="ob-dq-line" />
        <span className="ob-sulk">
          <Quill />
        </span>
        <span className="ob-ink" />
      </span>
      <h1 className="ob-lora boing ob-d2 ob-dh">{t('declined.title')}</h1>
      <p className="boing ob-d4 ob-dp">{t('declined.body')}</p>
      <nav className="boing ob-d5 ob-dnav">
        {onReconsider && (
          <button type="button" className="ob-opt" onClick={onReconsider} data-testid="onboarding-reconsider">
            {t('declined.reconsider')}
          </button>
        )}
        {/* Layout sends a signed-in account with no acceptance straight back to the contract. */}
        {!user && (
          <Link to="/tasks" className="ob-opt" data-testid="onboarding-look-around">
            {t('declined.lookAround')}
          </Link>
        )}
      </nav>
    </section>
  )
}
