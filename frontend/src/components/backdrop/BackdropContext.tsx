import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Page-backdrop context. A page declares its "contextual faction" via
 * useFactionBackdrop(slug); <FactionBackdrop> reads it and swaps the full-page
 * background. Mixed / neutral pages leave it null and get the global watercolor.
 * See docs/spec/SPEC-faction-ui-profile.md §2.
 */
interface BackdropContextValue {
  slug: string | null
  setSlug: (slug: string | null) => void
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
  setSlug: () => {},
})

export function BackdropProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null)
  // Memoize so consumers (e.g. FactionBackdrop) only re-render when slug changes,
  // not on every Layout render.
  const value = useMemo(() => ({ slug, setSlug }), [slug])
  return <BackdropContext.Provider value={value}>{children}</BackdropContext.Provider>
}

/** Read the active backdrop faction slug (null = global fallback). */
export function useBackdropSlug(): string | null {
  return useContext(BackdropContext).slug
}

/**
 * Theme the page backdrop to a faction for as long as the calling page is
 * mounted. Pass null/undefined (or omit the call) to keep the global watercolor.
 * Auto-clears on unmount so navigating away resets to the fallback.
 */
export function useFactionBackdrop(slug: string | null | undefined) {
  const { setSlug } = useContext(BackdropContext)
  useEffect(() => {
    setSlug(slug ?? null)
    return () => setSlug(null)
  }, [slug, setSlug])
}
