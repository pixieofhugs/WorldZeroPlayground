import { useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { loginWith, type AuthProvider } from '../api/auth'
import { useFormFactor } from '../hooks/useFormFactor'
import { drawAtRoot } from './ui/drawAtRoot'

/**
 * The sign-in providers, in one place (#1773). Callers: the NavBar sheet below
 * and the onboarding auth card (#1861); the caller owns layout.
 * NO PROVIDER NAME IN FRAMING COPY (#1738): only on its own button.
 */
export default function SignInOptions({
  className = 'btn-primary',
  style,
  onChoose,
}: {
  className?: string
  style?: CSSProperties
  /**
   * Runs just before the full-page navigation to the provider. Onboarding uses
   * it to remember it was mid-flow: the callback always returns to `FRONTEND_URL`.
   */
  onChoose?: () => void
}) {
  const { t } = useTranslation('common')
  const go = (provider: AuthProvider) => () => {
    onChoose?.()
    loginWith(provider)
  }
  // Not mapped: literal keys keep the catalog greppable.
  return (
    <>
      <button
        type="button"
        onClick={go('google')}
        className={className}
        style={style}
        data-testid="sign-in-google"
      >
        {t('signIn.google')}
      </button>
      <button
        type="button"
        onClick={go('discord')}
        className={className}
        style={style}
        data-testid="sign-in-discord"
      >
        {t('signIn.discord')}
      </button>
    </>
  )
}

/**
 * The NavBar's logged-out sign-in sheet, drawn at root (#1591). Same chassis as
 * `ConfirmDialog` (#2355): bottom sheet on a phone, centred card on a laptop.
 * The phone half is currently unreachable (NavBar is desktop-only) but kept.
 */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('common')
  const isMobile = useFormFactor() === 'mobile'

  // Escape dismisses: a mouse-only modal is not dismissible.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return drawAtRoot(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('signIn.title')}
      style={frame(isMobile)}
    >
      <button type="button" aria-label={t('signIn.close')} onClick={onClose} style={scrim} />
      <div style={sheet(isMobile)}>
        {isMobile && <span style={grab} />}
        <div style={sheetTitle}>{t('signIn.title')}</div>
        <div style={options}>
          <SignInOptions style={fullWidth} />
        </div>
      </div>
    </div>
  )
}

// Root stacking: content 5 < chrome 10 < sheets 39/40 < ConfirmDialog 50 < modals 1000 (see `ui/drawAtRoot`).
// One frame at 40 with the scrim nested, so nothing can slip between them.

const frame = (isMobile: boolean): CSSProperties => ({
  position: 'fixed', inset: 0, zIndex: 40,
  display: 'flex', justifyContent: 'center',
  alignItems: isMobile ? 'flex-end' : 'center',
  padding: isMobile ? 0 : 'var(--space-lg)',
})
const scrim: CSSProperties = {
  position: 'absolute', inset: 0, border: 'none', padding: 0,
  background: 'var(--color-overlay-strong)', cursor: 'pointer',
}
const sheet = (isMobile: boolean): CSSProperties => ({
  position: 'relative',
  background: 'var(--color-bg-surface)',
  width: isMobile ? '100%' : 'min(440px, 100%)',
  borderRadius: isMobile ? '22px 22px 0 0' : 12,
  // Neutral border: no faction owns a logged-out surface.
  border: isMobile ? 'none' : '2px solid var(--color-border-strong)',
  padding: isMobile ? 'var(--space-md) var(--space-lg) var(--space-xl)' : 'var(--space-lg)',
  boxShadow: isMobile
    ? '0 -12px 34px var(--color-cast-shadow)'
    : '0 8px 28px var(--color-cast-shadow)',
})
const grab: CSSProperties = {
  display: 'block', width: 38, height: 4, borderRadius: 999,
  background: 'var(--color-border-strong)', margin: 'var(--space-xs) auto var(--space-lg)',
}
const sheetTitle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)', margin: '0 var(--space-xs) var(--space-lg)',
  textAlign: 'center',
}
const options: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
  // Binds only on a phone; on a laptop the panel is narrower.
  maxWidth: 420, margin: '0 auto',
}
const fullWidth: CSSProperties = {
  width: '100%', padding: 'var(--space-md) var(--space-lg)',
}
