import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPraxis } from '../api/praxis'
import { extractError } from '../utils/errors'

/** Where a sign-up attempt lands: the new composer, or a failure message. */
export async function signupOutcome(
  taskId: number,
  fallback: string,
): Promise<{ to: string } | { error: string }> {
  try {
    const praxis = await createPraxis({ task_id: taskId, type: 'solo' })
    return { to: `/praxis/${praxis.id}/edit` }
  } catch (err) {
    return { error: extractError(err, fallback) }
  }
}

/**
 * Task sign-up for every `<TaskCard>` surface (#2188). Signing up IS creating
 * the solo praxis, then navigating to its composer.
 */
interface TaskSignup {
  /** Failure message only (success navigates away), or `null`. */
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
      const outcome = await signupOutcome(id, t('signup.error'))
      if ('to' in outcome) navigate(outcome.to)
      else setSignupMsg(outcome.error)
    },
    [navigate, t],
  )

  return { signupMsg, handleSignup }
}
