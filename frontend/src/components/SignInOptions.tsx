import { useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { loginWith, type AuthProvider } from '../api/auth'
import { useFormFactor } from '../hooks/useFormFactor'
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
 * answer to that: `drawAtRoot` to escape `ShellContent`'s stacking context
 * (#1591), the sheet band's altitude, the same tokens — rather than a second
 * overlay primitive.
 *
 * TWO FORMS, ONE CHASSIS (#2355). It borrowed `CharacterSwitcherSheet`'s
 * bottom-sheet half and not the form-factor split, so a laptop got a phone
 * sheet glued to the bottom edge of the window. The chassis is now
 * `ConfirmDialog`'s and `MetataskRemoveConfirm`'s, ternary for ternary: one
 * fixed flex frame, `items-end` on a phone and `items-center` on a laptop, a
 * bounded and edged card in the second case. No new overlay idiom.
 *
 * REACHABILITY, honestly: `Layout.tsx` mounts `NavBar` only on the desktop
 * branch (the phone gets `MobileHeader`, which has no logged-out control at
 * all), so today nothing can render the phone half of this. It is kept because
 * a sheet that only knows one viewport is exactly the bug above, and because
 * the logged-out phone gap is somebody else's issue to close.
 */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('common')
  const isMobile = useFormFactor() === 'mobile'

  // A modal that only the mouse can dismiss is not dismissible. The character
  // switcher predates this and does without; a new overlay does not get to.
  // Both forms get the same Escape, the same labelled scrim button.
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
        {/* A drag affordance belongs to the form that can be dragged. */}
        {isMobile && <span style={grab} />}
        <div style={sheetTitle}>{t('signIn.title')}</div>
        <div style={options}>
          <SignInOptions style={fullWidth} />
        </div>
      </div>
    </div>
  )
}

// --- token-driven styles ----------------------------------------------------
// The sheet band, read in the ROOT stacking context: backdrop 0 < content 5 <
// chrome 10 < sheets 39/40 < ConfirmDialog 50 < full-screen modals 1000. See
// `ui/drawAtRoot` for the whole argument. The scrim and the panel used to be
// two fixed siblings at 39 and 40; they are now one frame at 40 with the scrim
// nested inside it, so the panel paints over the scrim on DOM order alone and
// the pair can no longer be separated by anything.

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
  // No faction owns a logged-out surface, so the edge that tells a card from a
  // sheet is the neutral border token rather than ConfirmDialog's task accent.
  border: isMobile ? 'none' : '2px solid var(--color-border-strong)',
  padding: isMobile ? 'var(--space-md) var(--space-lg) var(--space-xl)' : 'var(--space-lg)',
  // The colour half is the half that would drift between themes, so it is the
  // half that comes from a token (CharacterSwitcherSheet, ConfirmDialog). A
  // sheet is lit from above the bottom edge; a centred card casts downward.
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
  // Not a second width rule racing the panel's: the panel is full-bleed on a
  // phone and this caps the button column inside it, while on a laptop the
  // panel's own 440 less 2×--space-lg of padding is 404, so this never binds.
  maxWidth: 420, margin: '0 auto',
}
const fullWidth: CSSProperties = {
  width: '100%', padding: 'var(--space-md) var(--space-lg)',
}
