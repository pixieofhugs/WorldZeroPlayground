import type { CSSProperties, ReactNode } from "react";

/**
 * Shared primitives for the MOBILE task-detail skins.
 *
 * The Field Kit (#495) gives every detail screen a fixed bottom **sticky action
 * bar** (`.sticky-cta`) so the primary verb (sign up / continue / edit) stays
 * thumb-reachable while the body scrolls. Factoring it here means each faction
 * mobile skin (Default, Everymen, and the later #496–#500 skins) reuses the same
 * pinning + safe-area math instead of re-deriving it. Kept deliberately small —
 * a container that pins and a caption line — so it doesn't harden into a
 * layout framework.
 */

/**
 * Sticky bottom action bar. Pins just above the fixed {@link MobileTabBar}
 * (~3.5rem) and clears the home-indicator safe area; goes full-bleed by
 * cancelling the mobile shell's 16px gutter. Stacks its children in a column so
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
        bottom: "calc(3.5rem + env(safe-area-inset-bottom))",
        marginLeft: -16,
        marginRight: -16,
        marginTop: 20,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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

/**
 * A tracked, muted caption — the meta line under a sticky CTA ("earn up to N
 * pts · X of Y slots open"). Uppercase micro-label per the Field Kit type scale.
 */
export function MobileStickyCaption({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <div
      className="font-body"
      style={{
        fontSize: "var(--text-base)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: color ?? "var(--color-text-tertiary)",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
