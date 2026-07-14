import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'

export default function Donate() {
  const { t } = useTranslation('common')
  return (
    <div className="py-8 max-w-2xl text-center">
      <PageTitle title={t('donate.title')} />

      <div className="card p-8 mb-6">
        <p className="font-body text-base leading-relaxed mb-6">
          {t('donate.intro')}
        </p>
        <a
          href="https://www.patreon.com/c/WorldZero"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-base px-8 py-2 inline-block"
        >
          {t('donate.patreon')}
        </a>
      </div>

      <p className="font-body text-sm text-muted">
        {t('donate.outro')}
      </p>
    </div>
  )
}
