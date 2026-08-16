import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { clearOnboardingHandoff, onboardingHandoffPending } from '../utils/onboardingResume'
import IntroCard from './onboarding/IntroCard'
import AuthCard from './onboarding/AuthCard'
import TermsCard from './onboarding/TermsCard'

/**
 * `/start` — the arc from a scanned QR code to character creation, and the only
 * thing the QR code points at.
 *
 * ONE FLOW, TWO ENTRANCES: the sticker, and Home's logged-out CTA. Not two
 * explanations of the same game (`docs/spec/SPEC-onboarding.md` § The arc).
 *
 * NO `ProtectedRoute`. A door, not a wall — tasks, praxis, factions, the
 * leaderboard and profiles are all already public, and the failure this fixes is
 * copy and routing, not permissions.
 *
 * THE STATE IS ONE BOOLEAN, and the rest is derived. "Past the intro?" is the
 * only thing this component can know that nothing else does; whether the auth
 * card is owed is a question about the session, so it is *read* from the session
 * on every render rather than stored:
 *
 *     intro → (session? no: auth) → terms → hand off
 *
 * Storing it instead is how the flow would come to disagree with `/auth/me` —
 * a viewer who signed in a second tab, or whose session landed while they were
 * still reading, would be sent to a provider they no longer need. That
 * asymmetry is the flow's one exception and it is the only one: re-asking for
 * agreement is free, re-authenticating is a full round trip, and bouncing a
 * signed-in person out to a provider looks like the site has lost them.
 *
 * A SCAN ALWAYS RE-RUNS FROM THE TOP. No resume and no bookmark: mounting this
 * route starts at the intro, terms simply shows again, and the append-only
 * consent log absorbs another row. `CurrentUser` therefore gains nothing —
 * there is no terms flag for the flow and the server to disagree about.
 *
 * The ONE exception to that is the OAuth round trip, which is not a re-scan but
 * the same visit interrupted. See `utils/onboardingResume`: the flow marks its
 * place before it leaves, `RootLanding` sends the returning browser back here,
 * and this component clears the mark on mount — so it can resume at most once,
 * and a mark that never gets consumed dies with the tab.
 */
export default function Onboarding() {
  const { user, loading } = useAuth()
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  // Read once, during the first render, because the mark's whole job is to
  // choose the opening card. Clearing it is the effect below — doing it here
  // would be a side effect in a render, which StrictMode double-invokes.
  const [pastIntro, setPastIntro] = useState(onboardingHandoffPending)

  useEffect(() => {
    // Consumed. From here the mark can neither send this browser back a second
    // time nor survive into a later, unrelated sign-in.
    clearOnboardingHandoff()
  }, [])

  if (!pastIntro) return <IntroCard onContinue={() => setPastIntro(true)} />

  // `user` is null while `/auth/me` is in flight, which is indistinguishable
  // from a guest — so wait rather than show a signed-in returner the one card
  // they are owed an exemption from.
  if (loading) return <div className="page font-body text-muted">{t('loading')}</div>

  if (!user) return <AuthCard />

  return (
    <TermsCard
      onAccepted={() => {
        // THE HAND-OFF: the flow ends here and does not resume. Where a
        // brand-new character then lands is `CreateCharacter`'s own decision,
        // derived from that character's state (spec § The hand-off) — not
        // something this flow passes in.
        //
        // ponytail: `user.character` is "has a life", which is the part of the
        // spec's predicate that exists today. The full rule is "has this
        // character ever completed the onboarding task", which is the same
        // derivation the *start here* mark needs and is being built alongside
        // it; when it lands, this ternary reads it instead.
        navigate(user.character ? '/' : '/characters/create')
      }}
    />
  )
}
