import type { CSSProperties, ReactNode } from "react";

/**
 * Shared primitives for the MOBILE faction-page skins.
 *
 * The Field Kit (#495) gives every mobile page a fixed bottom **sticky action
 * bar** (`.sticky-cta`) so the primary verb stays thumb-reachable while the body
 * scrolls. Factoring it here means each faction mobile skin reuses the same
 * pinning + safe-area math instead of re-deriving it. Kept deliberately small —
 * a container that pins — so it doesn't harden into a layout framework.
 *
 * It lived at `pages/taskDetail/mobileArchetypes/shared.tsx` until #1068. That
 * folder was retired when ADR-0058 collapsed task detail to one responsive
 * component per faction, but the bar itself was never task-detail-specific: the
 * eight mobile faction pages here are its only remaining consumers, so it moved
 * to them rather than dying with its old neighbours. Its companion export
 * `MobileStickyCaption` had no consumer outside the deleted skins and went with
 * them; `git show 0521fa2a:frontend/src/pages/taskDetail/mobileArchetypes/shared.tsx`
 * has it if a caption line is ever wanted again.
 *
 * Note there is a second, DIFFERENT `MobileStickyBar` in
 * `pages/editPraxis/mobileArchetypes/shared.tsx`. Same name, same pinning idea,
 * but that one is a bare positioner (sticky + z-index + top margin) that leaves
 * every composer to paint its own chrome; this one paints the bar — full-bleed
 * background, blur, top rule, column stack. They are not duplicates and must not
 * be merged without deciding which behaviour the callers of the other actually
 * want.
 */

/**
 * Sticky bottom action bar. Pins just above the fixed {@link MobileTabBar} and
 * clears the home-indicator safe area — both halves of that sum live in
 * `--tab-bar-clearance` (#1566). Goes full-bleed by cancelling the mobile
 * shell's 16px gutter. Stacks its children in a column so
 * a skin can drop an error line or caption above the action row.
 */
export function MobileStickyBar({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: "var(--tab-bar-clearance)",
        marginLeft: "calc(-1 * var(--space-lg))",
        marginRight: "calc(-1 * var(--space-lg))",
        marginTop: "var(--space-xl)",
        padding: "var(--space-md) var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        background: "var(--color-nav-bg)",
        backdropFilter: "blur(var(--nav-blur))",
        borderTop: "1px solid var(--color-border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
