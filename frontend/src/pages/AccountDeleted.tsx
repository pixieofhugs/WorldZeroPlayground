import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'

/**
 * `/goodbye` — where a deleted account lands (#2161).
 *
 * IT READS NOTHING OFF AN ACCOUNT, AND IT CANNOT. `DELETE /me/account` leaves
 * the JWT inert and the danger zone signs out on the way here, so by the time
 * this paints there is no viewer to interpolate. Every sentence below is a
 * constant for that reason — no name, no character, no count. Not a
 * `ProtectedRoute` either: a guard would bounce the very reader it is for.
 *
 * THE SECOND SENTENCE IS CONSENT OFFERED BEFORE THE FACT. Signing in again with
 * the same Google or Discord identity inside the tombstone window meets
 * `/start/again`'s gate (#2162), which offers a fresh start and nothing else.
 * Saying so here is what makes that gate a confirmation rather than a surprise
 * — it is the design of the whole flow, not a courtesy.
 *
 * "Points you awarded to other players stay with them" is repeated from the
 * danger zone deliberately: it is the one thing a player might want reassurance
 * about after the fact, and it is the sentence that stops being true if the
 * backend ever becomes a hard delete (see `settings/DeleteAccountCard.tsx`).
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
