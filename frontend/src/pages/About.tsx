import { Trans, useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'

export default function About() {
  const { t } = useTranslation('common')
  return (
    <div className="py-8 max-w-2xl">
      <PageTitle title={t('about.title')} />

      <div className="card p-6 mb-6">
        <p className="font-body text-base leading-relaxed mb-4">
          {t('about.intro1')}
        </p>
        <p className="font-body text-base leading-relaxed">
          {t('about.intro2')}
        </p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-display text-2xl font-bold mb-3">{t('about.howToPlayHeading')}</h2>
        <ol className="font-body text-base leading-relaxed space-y-2 list-decimal list-inside">
          <li>{t('about.step1')}</li>
          <li>{t('about.step2')}</li>
          <li>{t('about.step3')}</li>
          <li>{t('about.step4')}</li>
          <li>{t('about.step5')}</li>
        </ol>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-2xl font-bold mb-3">{t('about.inspiredHeading')}</h2>
        <p className="font-body text-base leading-relaxed">
          <Trans
            t={t}
            i18nKey="about.inspiredBody"
            components={[
              <span key="0" />,
              <a
                key="1"
                href="https://sf0.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted"
              />,
            ]}
          />
        </p>
      </div>
    </div>
  )
}
