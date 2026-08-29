import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPraxis } from '../api/praxis'
import { extractError } from '../utils/errors'

/**
 * Taking a task from a card — the one implementation, for every surface that
 * mounts a `<TaskCard>` (#2188).
 *
 * Signing up IS creating the solo praxis: there is no separate enrolment
 * record, so the press posts `/praxis` and goes straight to the composer for
 * the row it just made. That was written out four times byte-identical (home,
 * `/tasks`, the field desk, and about to be the two page families #2188 wires
 * up), which is why it lives here now.
 *
 * The copy is `home:signup.error` — the home namespace because `/` is where
 * the message was first drawn, and one key because every caller is saying the
 * same thing. `extractError` prefers the server's own words when the failure
 * carried any; the key is the fallback for a network error or a bare 500.
 *
 * `signupMsg` is only ever a FAILURE. The success path navigates away, so
 * there is no surface left to say "ok" on; the shape used to be
 * `{ id, msg, ok }` on `/tasks` alone and no caller ever set `ok: true` nor
 * read `id`, so it reconciles down to the string the other two already used.
 */
interface TaskSignup {
  /** Why the last sign-up failed, or `null`. Cleared at the start of each try. */
  signupMsg: string | null
  handleSignup: (id: number) => Promise<void>
}

export function useTaskSignup(): TaskSignup {
  const { t } = useTranslation('home')
  const navigate = useNavigate()
  const [signupMsg, setSignupMsg] = useState<string | null>(null)

  const handleSignup = useCallback(
    async (id: number) => {
      setSignupMsg(null)
      try {
        const praxis = await createPraxis({ task_id: id, type: 'solo' })
        navigate(`/praxis/${praxis.id}/edit`)
      } catch (err) {
        setSignupMsg(extractError(err, t('signup.error')))
      }
    },
    [navigate, t],
  )

  return { signupMsg, handleSignup }
}
