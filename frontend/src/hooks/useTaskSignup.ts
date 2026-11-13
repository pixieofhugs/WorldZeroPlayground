import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPraxis } from '../api/praxis'
import { extractError } from '../utils/errors'

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
