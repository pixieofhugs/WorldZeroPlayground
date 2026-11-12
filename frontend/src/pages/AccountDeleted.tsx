import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'

/**
 * `/goodbye` — where a deleted account lands (#2161). Reads nothing off an
 * account (there is no viewer by now), and is not a `ProtectedRoute`. The
 * "again" line pre-announces `/start/again`'s fresh-start gate (#2162); the
 * "kept" line goes false if deletion ever becomes hard (`DeleteAccountCard`).
 */
export default function AccountDeleted() {
  const { t } = useTranslation('common')
  return (
    <div className="py-8 max-w-2xl" data-testid="account-deleted">
      <PageTitle title={t('accountDeleted.title')} />

      <div className="card p-6 space-y-5 font-body text-base leading-relaxed">
        <p>{t('accountDeleted.gone')}</p>
        <p>{t('accountDeleted.kept')}</p>
        <p>{t('accountDeleted.again')}</p>
        <p>
          <Link to="/">{t('accountDeleted.home')}</Link>
        </p>
      </div>
    </div>
  )
}
