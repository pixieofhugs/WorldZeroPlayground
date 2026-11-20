import { useEffect, useState } from 'react'
import {
  getFlaggedComments,
  getFlaggedPraxes,
  getMessages,
  getOverview,
  getPendingTasks,
} from '../../api/admin'

/** `null` = not loaded, or that endpoint failed: the rail then shows no number rather than a wrong one. */
export interface AdminCounts {
  reports: number | null
  messages: number | null
  proposals: number | null
  praxis: number | null
  tasks: number | null
  people: number | null
}

const NONE: AdminCounts = { reports: null, messages: null, proposals: null, praxis: null, tasks: null, people: null }

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null)

/**
 * What needs a moderator, for the admin rail (and #3666's MOD badge). Class C
 * (ADR-0072): these are obligations, so never cached; `refreshKey` re-reads
 * after the moderator has moved (the rail passes the pathname).
 */
export function useAdminCounts(refreshKey = ''): AdminCounts {
  const [counts, setCounts] = useState<AdminCounts>(NONE)

  useEffect(() => {
    let cancelled = false
    void Promise.allSettled([
      getFlaggedPraxes(),
      getFlaggedComments(),
      getMessages(false),
      getPendingTasks(),
      getOverview(),
    ]).then(([praxes, comments, messages, proposals, overview]) => {
      if (cancelled) return
      const p = ok(praxes)
      const c = ok(comments)
      const o = ok(overview)
      setCounts({
        reports: p && c ? p.length + c.length : null,
        messages: ok(messages)?.length ?? null,
        proposals: ok(proposals)?.length ?? null,
        praxis: o?.praxis ?? null,
        tasks: o?.active_tasks ?? null,
        people: o?.accounts ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return counts
}
