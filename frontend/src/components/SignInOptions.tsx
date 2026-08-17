import { useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { loginWith, type AuthProvider } from '../api/auth'
import { drawAtRoot } from './ui/drawAtRoot'

/**
 * The ways in, in one place (#1773).
 *
 * Both logged-out entry points used to call `loginWithGoogle()` directly, so
 * Discord shipped server-side (#1772) and stayed unreachable. This is the one
 * component that knows which providers exist and what they are called.
 *
 * Two callers now: the NavBar's sign-in sheet below, and the onboarding arc's
 * auth card (#1861), which is where the Home hero's pair went — a stranger is
 * owed the explanation before the ask, so the hero leads into `/start` and
 * `/start` offers the providers.
 *
 * NO PROVIDER NAME IN FRAMING COPY (#1738): a provider is named on the button
 * that goes to it and nowhere else. `signIn.title` frames the stop as somewhere
 * to keep a score, not as a gate.
 *
 * The caller owns the container — a column in the sheet below, a wrapping row
 * on the onboarding sheet — so the buttons need no layout variant of their own,
 * and neither provider is styled as the recommended one.
 */
export default function SignInOptions({
  className = 'btn-primary',
  style,
  onChoose,
}: {
  className?: string
  style?: CSSProperties
  /**
   * Run just before the browser leaves for the provider.
   *
   * `loginWith` is a full document navigation, so this is the last moment any
   * of this tab's code runs. The onboarding flow uses it to record that it was
   * mid-flow, because the backend callback redirects to a constant
   * (`FRONTEND_URL`) and nothing else survives the round trip. Absent
   * everywhere else — the NavBar sheet and the Home hero have no place to
   * return to.
   */
  onChoose?: () => void
}) {
  const { t } = useTranslation('common')
  const go = (provider: AuthProvider) => () => {
    onChoose?.()
    loginWith(provider)
  }
  // Written out rather than mapped over a provider list: two of them, and a
  // literal key is what keeps the catalog greppable from the call site.
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
 * The NavBar's logged-out button opens this.
 *
 * One nav button cannot hold two providers, and this is the repo's existing
 * answer to that: the same bottom-sheet band `CharacterSwitcherSheet` uses —
 * `drawAtRoot` to escape `ShellContent`'s stacking context (#1591), scrim 39 /
 * sheet 40, the same tokens — rather than a second overlay primitive. NavBar is
 * desktop-only (`Layout.tsx` gives the phone `MobileHeader`, which has no
 * logged-out control at all), so unlike the character switcher this one never
 * needs to clear the mobile tab bar.
 */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('common')

  // A modal that only the mouse can dismiss is not dismissible. The character
  // switcher predates this and does without; a new overlay does not get to.
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
    <div role="dialog" aria-modal="true" aria-label={t('signIn.title')}>
      <button type="button" aria-label={t('signIn.close')} onClick={onClose} style={scrim} />
      <div style={sheet}>
        <span style={grab} />
        <div style={sheetTitle}>{t('signIn.title')}</div>
        <div style={options}>
          <SignInOptions style={fullWidth} />
        </div>
      </div>
    </div>
  )
}

// --- token-driven styles ----------------------------------------------------
// The bottom-sheet band, read in the ROOT stacking context: backdrop 0 <
// content 5 < chrome 10 < sheets 39/40 < ConfirmDialog 50 < full-screen modals
// 1000. See `ui/drawAtRoot` for the whole argument.

const scrim: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 39, border: 'none', padding: 0,
  background: 'var(--color-overlay-strong)', cursor: 'pointer',
}
const sheet: CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
  background: 'var(--color-bg-surface)', borderRadius: '22px 22px 0 0',
  padding: 'var(--space-md) var(--space-lg) var(--space-xl)',
  // The colour half is the half that would drift between themes, so it is the
  // half that comes from a token (CharacterSwitcherSheet, ConfirmDialog).
  boxShadow: '0 -12px 34px var(--color-cast-shadow)',
}
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
  maxWidth: 420, margin: '0 auto',
}
const fullWidth: CSSProperties = {
  width: '100%', padding: 'var(--space-md) var(--space-lg)',
}
