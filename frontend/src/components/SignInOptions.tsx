import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  atprotoChallengeStart,
  atprotoChallengeVerify,
  atprotoLogin,
  loginWith,
  type AuthProvider,
} from '../api/auth'
import { keyLaneAvailable, loadOrCreateKey, loginWithKey } from '../auth/keyLane'
import { useFormFactor } from '../hooks/useFormFactor'
import { extractError, extractErrorCode } from '../utils/errors'
import { ErrorCode } from '../utils/errors'
import { drawAtRoot } from './ui/drawAtRoot'

/**
 * The ways in, in one place (#1773).
 *
 * Both logged-out entry points used to call `loginWithGoogle()` directly, so
 * Discord shipped server-side (#1772) and stayed unreachable. This is the one
 * component that knows which providers exist and what they are called.
 *
 * Two caller families now (ADR-0088): the NavBar's sign-in sheet below, and
 * the onboarding arc's auth card (#1861), which is where the Home hero's pair
 * went — a stranger is owed the explanation before the ask, so the hero leads
 * into `/start` and `/start` offers the providers. The email-less lanes render
 * the same in both: they are forms, not navigations, so they stack under the
 * buttons wherever the container stacks.
 *
 * NO PROVIDER NAME IN FRAMING COPY (#1738): a provider is named on the button
 * that goes to it and nowhere else. `signIn.title` frames the stop as somewhere
 * to keep a score, not as a gate.
 *
 * The caller owns the container — a column in the sheet below, a wrapping row
 * on the onboarding sheet — so the buttons need no layout variant of their own,
 * and no provider is styled as the recommended one.
 *
 * XHR lanes vs the redirect family: OAuth needs the browser to LEAVE, so its
 * success is this tab's death; the ATProto and key lanes answer in place and
 * finish with `location.assign('/')` — one full read of the app's own boot,
 * exactly the boot the OAuth callback performs, so the player's landing can
 * never hinge on which door they walked through.
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
   * of this tab's code runs; the XHR lanes call it on the same terms, right
   * before `location.assign('/')`. The onboarding flow uses it to record that
   * it was mid-flow, because nothing else survives a whole-page boot. Absent
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
      <AtprotoLane className={className} style={style} onChoose={onChoose} />
      <KeyLane className={className} style={style} onChoose={onChoose} />
    </>
  )
}

/**
 * The shared end of any XHR sign-in: a yes boots the app anew, a paused
 * identity walks to the returning-player gate, anything else is an error line
 * under the lane that asked. One helper so no lane invents its own copy of
 * the law. Returns nothing; renders nothing itself — the setter shapes that.
 */
async function finishSignIn(
  trySignIn: () => Promise<unknown>,
  onChoose: (() => void) | undefined,
  setError: (copy: string) => void,
  navigate: (to: string) => void,
): Promise<void> {
  try {
    await trySignIn()
  } catch (err) {
    if (extractErrorCode(err) === ErrorCode.returningPlayerConsentRequired) {
      navigate('/start/again')
      return
    }
    setError(extractError(err))
    return
  }
  onChoose?.()
  window.location.assign('/')
}

/** ATProto: handle/DID + app password, or the zero-credential "prove it in a post" lane. */
function AtprotoLane({
  className,
  style,
  onChoose,
}: {
  className?: string
  style?: CSSProperties
  onChoose?: () => void
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'password' | 'challenge'>('password')
  const [challenge, setChallenge] = useState<{ token: string } | null>(null)

  const submitPassword = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    await finishSignIn(
      () => atprotoLogin(handle.trim(), password),
      onChoose,
      setError,
      navigate,
    )
    setBusy(false)
  }

  const startChallenge = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const out = await atprotoChallengeStart(handle.trim())
      setChallenge({ token: out.token })
    } catch (err) {
      setError(extractError(err))
    }
    setBusy(false)
  }

  const checkChallenge = async () => {
    if (busy || !challenge) return
    setBusy(true)
    setError(null)
    await finishSignIn(
      () => atprotoChallengeVerify(handle.trim(), challenge.token),
      onChoose,
      setError,
      navigate,
    )
    setBusy(false)
  }

  return (
    <div style={lane} data-testid="sign-in-atproto">
      <input
        aria-label={t('signIn.atprotoHandle')}
        placeholder={t('signIn.atprotoHandle')}
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        style={laneInput}
        autoComplete="username"
      />
      {mode === 'password' ? (
        <>
          <input
            aria-label={t('signIn.atprotoPassword')}
            placeholder={t('signIn.atprotoPassword')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={laneInput}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={className}
            style={style}
            onClick={submitPassword}
            data-testid="sign-in-atproto-go"
          >
            {busy ? t('signIn.signingIn') : t('signIn.atproto')}
          </button>
          <button type="button" style={laneLink} onClick={() => setMode('challenge')}>
            {t('signIn.atprotoSwitchToPost')}
          </button>
        </>
      ) : (
        <>
          {challenge ? (
            <>
              <p style={laneHelp}>{t('signIn.atprotoPostHelp')}</p>
              <code style={laneToken}>{challenge.token}</code>
              <button
                type="button"
                className={className}
                style={style}
                onClick={checkChallenge}
                data-testid="sign-in-atproto-check"
              >
                {busy ? t('signIn.signingIn') : t('signIn.atprotoCheck')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={className}
              style={style}
              onClick={startChallenge}
              data-testid="sign-in-atproto-start"
            >
              {busy ? t('signIn.signingIn') : t('signIn.atprotoStart')}
            </button>
          )}
          <button type="button" style={laneLink} onClick={() => setMode('password')}>
            {t('signIn.atprotoSwitchToPassword')}
          </button>
        </>
      )}
      {error && (
        <p role="alert" style={laneError} data-testid="sign-in-atproto-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** The key lane (ADR-0088): this browser IS the key; hidden where it cannot be one. */
function KeyLane({
  className,
  style,
  onChoose,
}: {
  className?: string
  style?: CSSProperties
  onChoose?: () => void
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!keyLaneAvailable()) return null

  const signInWithKey = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    await finishSignIn(
      async () => {
        const key = await loadOrCreateKey()
        await loginWithKey(key)
      },
      onChoose,
      setError,
      navigate,
    )
    setBusy(false)
  }

  return (
    <div style={lane} data-testid="sign-in-key">
      <button
        type="button"
        className={className}
        style={style}
        onClick={signInWithKey}
        data-testid="sign-in-key-go"
      >
        {busy ? t('signIn.signingIn') : t('signIn.key')}
      </button>
      {error && (
        <p role="alert" style={laneError} data-testid="sign-in-key-error">
          {error}
        </p>
      )}
    </div>
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

// --- the email-less lanes (ADR-0088) ----------------------------------------
// Token-driven, dressless: lane buttons wear the caller's class like every
// other door's, so no package of borders makes one look chosen. Inputs read
// the sheet's own ground and line tokens — the same pair the seam around them
// is cut from — because a lane that invents its own input surface is a lane
// that drifts.
const lane: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
  paddingTop: 'var(--space-sm)',
  borderTop: '1px solid var(--color-border-strong)',
}
const laneInput: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border-strong)', borderRadius: 6,
  padding: 'var(--space-sm) var(--space-md)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
}
const laneHelp : CSSProperties = {
  margin: 0, color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
}
const laneToken: CSSProperties = {
  display: 'block', padding: 'var(--space-sm) var(--space-md)',
  background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border-strong)', borderRadius: 6,
  fontSize: 'var(--text-content)',
  wordBreak: 'break-all', userSelect: 'all',
}
// A lane switcher is a plain sentence of type, not a third button: the section
// already holds the button that names the provider, and the framing-copy law
// (#1738) leaves no button-shaped home for "the other way in".
const laneLink: CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--color-text-primary)', textDecoration: 'underline',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
  alignSelf: 'flex-start',
}
const laneError: CSSProperties = {
  margin: 0, color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)', fontStyle: 'italic',
  fontSize: 'var(--text-content)',
}
