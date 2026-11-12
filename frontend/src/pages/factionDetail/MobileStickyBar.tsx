import type { CSSProperties, ReactNode } from "react";

/**
 * Sticky bottom action bar for faction detail (Field Kit, #495). Structural, so
 * it survived the per-faction collapse (ADR-0069, ADR-0078). One caller:
 * `DefaultFactionBody` on phones (see its `ponytail:`).
 *
 * Not the same as editPraxis's `MobileStickyBar` (a bare positioner); this one
 * paints the bar. Don't merge them blindly.
 *
 * Must be a child of the page's tall box (`FactionDetail`'s `.py-8` root), not a
 * card: sticky pins against the nearest scrolling ancestor.
 */

/**
 * Pins above `MobileTabBar` plus the safe area (`--tab-bar-clearance`, #1566);
 * full-bleed by cancelling the 16px gutter; children stack in a column.
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
