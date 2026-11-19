import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { messageForCode } from '../utils/errors'

/**
 * `?login=required` is ProtectedRoute's bounce; anything else is an `ErrorCode` from a
 * failed OAuth callback (#1773), worded by `errors.json`, with a fallback for unknown codes.
 */
export default function LoginNotice() {
  const { t } = useTranslation('home')
  const code = useSearchParams()[0].get('login')
  if (!code) return null
  const notice = code === 'required' ? t('loginRequired') : (messageForCode(code) ?? t('loginFailed'))
  return <p className="font-body content-text text-muted mt-6 border-2 border-border px-4 py-2 inline-block">{notice}</p>
}
