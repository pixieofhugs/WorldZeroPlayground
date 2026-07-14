import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'

export default function Disclaimer() {
  const { t } = useTranslation('common')
  return (
    <div className="py-8 max-w-2xl">
      <PageTitle title={t('disclaimer.title')} />

      <div className="card p-6 space-y-5 font-body text-base leading-relaxed">
        <p>{t('disclaimer.p1')}</p>
        <p>{t('disclaimer.p2')}</p>
        <p>{t('disclaimer.p3')}</p>
        <p>{t('disclaimer.p4')}</p>
        <p className="text-muted text-sm">{t('disclaimer.lastUpdated')}</p>
      </div>
    </div>
  )
}
