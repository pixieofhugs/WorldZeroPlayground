import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withdrawProposal, type TaskOut } from '../../api/tasks'
import ConfirmDialog from '../../components/confirm/ConfirmDialog'
import type { ProposalActions } from '../../components/taskCard/proposalActions'
import { extractError } from '../../utils/errors'

/** Edit and withdraw for the viewer's own pending proposals (#3771). */
export function useOwnProposals(
  proposedTasks: TaskOut[],
  isOwnProfile: boolean,
  factionSlug: string | undefined,
): { tasks: TaskOut[]; actions: ProposalActions | null; dialog: ReactNode; error: string | null } {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  const [withdrawn, setWithdrawn] = useState<ReadonlySet<number>>(new Set())
  const [confirming, setConfirming] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tasks = useMemo(
    () => proposedTasks.filter((task) => !withdrawn.has(task.id)),
    [proposedTasks, withdrawn],
  )
  const actions = useMemo<ProposalActions | null>(
    () =>
      isOwnProfile
        ? {
            ids: new Set(tasks.filter((task) => task.status === 'pending').map((task) => task.id)),
            onEdit: (id) => navigate(`/propose-task/${id}`),
            onWithdraw: setConfirming,
          }
        : null,
    [isOwnProfile, tasks, navigate],
  )

  const confirmWithdraw = async () => {
    const id = confirming
    setConfirming(null)
    if (id === null) return
    setError(null)
    try {
      await withdrawProposal(id)
      setWithdrawn((prior) => new Set(prior).add(id))
    } catch (err) {
      setError(extractError(err, t('proposalCard.withdrawFailed')))
    }
  }

  const dialog =
    confirming === null ? null : (
      <ConfirmDialog
        request={{
          kind: 'withdraw-proposal',
          title: t('proposalCard.withdrawTitle'),
          body: t('proposalCard.withdrawBody'),
          confirmLabel: t('proposalCard.withdrawConfirm'),
          danger: true,
        }}
        factionSlug={factionSlug}
        onConfirm={confirmWithdraw}
        onDismiss={() => setConfirming(null)}
      />
    )

  return { tasks, actions, dialog, error }
}
