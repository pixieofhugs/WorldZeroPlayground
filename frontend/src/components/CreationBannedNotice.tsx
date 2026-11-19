import { useTranslation } from 'react-i18next'

export default function CreationBannedNotice() {
  const { t } = useTranslation('errors')
  return (
    <main className="mx-auto max-w-prose p-6">
      <p role="alert">{t('codes.CHARACTER_CREATION_BANNED')}</p>
    </main>
  )
}
