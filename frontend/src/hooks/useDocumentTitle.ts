import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** The one writer of `document.title`: pages with a dynamic name call it, `Layout` calls it for the rest. */
export function useDocumentTitle(page: string | null | undefined): void {
  const { t } = useTranslation('common')
  const brand = t('brand')
  useEffect(() => {
    if (page) document.title = `${page} · ${brand}`
  }, [page, brand])
}
