import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { backdropIsOrnamented } from './ornamentedGrounds'

/**
 * Page-backdrop context. A page declares its "contextual faction" via
 * useFactionBackdrop(slug); <FactionBackdrop> reads it and swaps the full-page
 * background. Mixed / neutral pages leave it null and get the global watercolor.
 * See docs/spec/SPEC-faction-ui-profile.md §2.
 *
 * It also answers, for the cards standing on that ground, "is the ground busy?"
 * — see {@link useGroundIsBusy}.
 */
interface BackdropContextValue {
  slug: string | null
  /**
   * The declaring page claimed the faction-page exemption: its cards keep their
   * ornament however busy the ground is. See {@link useFactionBackdrop}.
   */
  cardsKeepOrnament: boolean
  setGround: (slug: string | null, cardsKeepOrnament: boolean) => void
}

/**
 * Exported so a test can render a dispatcher at a chosen slug. `useFactionBackdrop`
 * sets the slug from an EFFECT, and the suite renders with `renderToStaticMarkup`
 * where effects never run — so a provider is the only way to reach any slug but
 * `null`. Same reason `AuthContext`, `VoteFactionContext` and `FeedRowSkinContext`
 * are exported. Pages use the two hooks below, never this.
 */
export const BackdropContext = createContext<BackdropContextValue>({
  slug: null,
  cardsKeepOrnament: false,
  setGround: () => {},
})

export function BackdropProvider({ children }: { children: ReactNode }) {
  // One piece of state, so a page's slug and its ornament claim can never be
  // half-applied: `useFactionBackdrop` sets both in one call.
  const [ground, setGround] = useState<{
    slug: string | null
    cardsKeepOrnament: boolean
  }>({ slug: null, cardsKeepOrnament: false })
  const set = useCallback(
    (slug: string | null, cardsKeepOrnament: boolean) =>
      setGround({ slug, cardsKeepOrnament }),
    [],
  )
  // Memoize so consumers (e.g. FactionBackdrop) only re-render when the ground
  // changes, not on every Layout render.
  const value = useMemo(
    () => ({ ...ground, setGround: set }),
    [ground, set],
  )
  return <BackdropContext.Provider value={value}>{children}</BackdropContext.Provider>
}

/** Read the active backdrop faction slug (null = global fallback). */
export function useBackdropSlug(): string | null {
  return useContext(BackdropContext).slug
}

/**
 * IS THE GROUND UNDER THIS CARD BUSY? (#2195)
 *
 * The law, owner 2026-08-17: a card on an ornamented ground drops its own
 * background texture; a card on a plain ground wears it. True here means "go
 * plain". Chrome — frame, masthead, points mark, dividers — never branches on
 * this.
 *
 * There is exactly ONE route where this is true today: a character profile,
 * which paints the page in the profiled player's faction (`CharacterProfile`).
 * A faction's own page mounts a backdrop too and is EXEMPT (owner, 2026-08-18:
 * "we can have a busy faction background page with busy task and praxis cards
 * on it"), and every other route themes nothing and is plain by default. It is
 * still a hook rather than a prop the profile threads down: the cards there sit
 * inside nine `profileBody` archetypes, so a prop would be nine files wide and
 * would have to be re-threaded by every kit that ever grows a card.
 *
 * Computed at READ time from two context values rather than pushed into state,
 * so the suite can reach every branch — effects never run under
 * `renderToStaticMarkup` (see the note on {@link BackdropContext}).
 */
export function useGroundIsBusy(): boolean {
  const { slug, cardsKeepOrnament } = useContext(BackdropContext)
  return !cardsKeepOrnament && backdropIsOrnamented(slug)
}

/**
 * Theme the page backdrop to a faction for as long as the calling page is
 * mounted. Pass null/undefined (or omit the call) to keep the global watercolor.
 * Auto-clears on unmount so navigating away resets to the fallback.
 *
 * `cardsKeepOrnament` claims the faction-page exemption from the ornament
 * alternation (#2195) — see {@link useGroundIsBusy}. It defaults to false
 * because the law is the default and the carve-out is the special case: a page
 * that mounts a patterned backdrop and says nothing gets plain cards, rather
 * than silently keeping a clash nobody typed out.
 */
export function useFactionBackdrop(
  slug: string | null | undefined,
  { cardsKeepOrnament = false }: { cardsKeepOrnament?: boolean } = {},
) {
  const { setGround } = useContext(BackdropContext)
  useEffect(() => {
    setGround(slug ?? null, cardsKeepOrnament)
    return () => setGround(null, false)
  }, [slug, cardsKeepOrnament, setGround])
}
