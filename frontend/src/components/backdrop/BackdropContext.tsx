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
 * Page-backdrop context: a page declares its faction via useFactionBackdrop;
 * <FactionBackdrop> swaps the page ground (SPEC-faction-ui-profile.md §2).
 * Also answers {@link useGroundIsBusy}.
 */
interface BackdropContextValue {
  slug: string | null
  /** The faction-page exemption: cards keep their ornament. */
  cardsKeepOrnament: boolean
  setGround: (slug: string | null, cardsKeepOrnament: boolean) => void
}

/**
 * Exported for tests: `useFactionBackdrop` sets state in an effect, which
 * `renderToStaticMarkup` never runs. Pages use the hooks below.
 */
export const BackdropContext = createContext<BackdropContextValue>({
  slug: null,
  cardsKeepOrnament: false,
  setGround: () => {},
})

export function BackdropProvider({ children }: { children: ReactNode }) {
  // One state, so slug and ornament claim are never half-applied.
  const [ground, setGround] = useState<{
    slug: string | null
    cardsKeepOrnament: boolean
  }>({ slug: null, cardsKeepOrnament: false })
  const set = useCallback(
    (slug: string | null, cardsKeepOrnament: boolean) =>
      setGround({ slug, cardsKeepOrnament }),
    [],
  )
  const value = useMemo(
    () => ({ ...ground, setGround: set }),
    [ground, set],
  )
  return <BackdropContext.Provider value={value}>{children}</BackdropContext.Provider>
}

/** null = global fallback. */
export function useBackdropSlug(): string | null {
  return useContext(BackdropContext).slug
}

/**
 * Is the ground under this card busy? (#2195) Owner law: a card on an
 * ornamented ground drops its background texture; chrome never branches on
 * this. True only on a character profile; a faction's own page is exempt.
 * A hook, not a prop, because the cards sit in nine `profileBody` archetypes.
 * Computed at read time so static-markup tests reach every branch.
 */
export function useGroundIsBusy(): boolean {
  const { slug, cardsKeepOrnament } = useContext(BackdropContext)
  return !cardsKeepOrnament && backdropIsOrnamented(slug)
}

/**
 * Theme the page backdrop to a faction while mounted; auto-clears on unmount.
 * `cardsKeepOrnament` claims the faction-page exemption (#2195); off by default
 * so a patterned ground gets plain cards unless a page says otherwise.
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
