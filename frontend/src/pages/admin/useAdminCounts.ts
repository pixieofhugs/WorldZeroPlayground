import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
 * after the moderator has moved (the rail passes the pathname); `reload`
 * re-reads on demand, for a decision that doesn't change the route.
 */
export function useAdminCounts(refreshKey = ''): AdminCounts & { reload: () => void } {
  const [counts, setCounts] = useState<AdminCounts>(NONE)
  const [bump, setBump] = useState(0)

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
  }, [refreshKey, bump])

  return { ...counts, reload: () => setBump((n) => n + 1) }
}

/** The console layout's `reload`, for a page's action handlers; a no-op where the page is mounted outside the console. */
export function useReloadCounts(): () => void {
  return useOutletContext<{ reloadCounts: () => void } | undefined>()?.reloadCounts ?? (() => {})
}
