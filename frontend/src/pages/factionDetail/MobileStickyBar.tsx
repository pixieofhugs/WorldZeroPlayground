import type { CSSProperties, ReactNode } from "react";

/**
 * Sticky bottom action bar for faction detail.
 *
 * The Field Kit (#495) gives every mobile page a bottom **sticky action bar** so
 * the primary verb stays thumb-reachable while the body scrolls. Kept
 * deliberately small — a container that pins — so it does not harden into a
 * layout framework.
 *
 * WHY IT IS HERE AND NOT IN `mobileArchetypes/`
 * ---------------------------------------------
 * It lived at `pages/taskDetail/mobileArchetypes/shared.tsx` until #1068, then
 * at `pages/factionDetail/mobileArchetypes/shared.tsx` until #1314. Both folders
 * were retired by a collapse to one responsive component per faction, and both
 * times the bar itself was not the thing being retired: pinning the primary verb
 * above the tab bar is a *structural* requirement (ADR-0069's rule — a cosmetic
 * delta between two form-factor twins is drift, a structural one survives), so
 * it moved up a directory rather than dying with its neighbours.
 *
 * Its companion export `MobileStickyCaption` had no consumer outside the deleted
 * skins and went with them;
 * `git show 0521fa2a:frontend/src/pages/taskDetail/mobileArchetypes/shared.tsx`
 * has it if a caption line is ever wanted again.
 *
 * WHO USES IT NOW
 * ---------------
 * One caller: `archetypes/DefaultFactionBody`, at phone widths only. The seven
 * bespoke bodies do not, and that is a decision rather than an oversight — see
 * the `ponytail:` on `DefaultFactionBody`'s join block and ADR-0077.
 *
 * Note there is a second, DIFFERENT `MobileStickyBar` in
 * `pages/editPraxis/mobileArchetypes/shared.tsx`. Same name, same pinning idea,
 * but that one is a bare positioner (sticky + z-index + top margin) that leaves
 * every composer to paint its own chrome; this one paints the bar — full-bleed
 * background, blur, top rule, column stack. They are not duplicates and must not
 * be merged without deciding which behaviour the callers of the other actually
 * want.
 *
 * It must stay a child of the page's own tall box (`FactionDetail`'s `.py-8`
 * root, via the body's fragment) rather than of a card inside it. `position:
 * sticky` resolves against its nearest scrolling ancestor, so a bar nested in a
 * short panel never pins.
 */

/**
 * Pins just above the fixed `MobileTabBar` and clears the home-indicator safe
 * area — both halves of that sum live in `--tab-bar-clearance` (#1566). Goes
 * full-bleed by cancelling the mobile shell's 16px gutter. Stacks its children
 * in a column so a caller can drop an error line or caption above the action
 * row.
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
