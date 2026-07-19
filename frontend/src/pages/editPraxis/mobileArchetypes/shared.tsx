/**
 * Shared mobile-composer primitives (#498). The two phone skins (Default + the
 * COVEN pilot) diverge visually but share three load-bearing behaviours: the
 * Write/Preview segmented toggle, the fluid media grid, and the sticky submit
 * bar that must ride above the fixed MobileTabBar (and, on a phone, the
 * on-screen keyboard). Kept here so both skins stay thin and neither
 * re-implements the viewport plumbing.
 */
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

// The fixed MobileTabBar + its safe-area padding occupy this much at the bottom
// of the viewport (mirrors MobileLayout's <main> bottom padding). The submit
// bar rides just above it via env(safe-area-inset-bottom).
export const MOBILE_TABBAR_CLEARANCE =
  "calc(3.5rem + env(safe-area-inset-bottom))";

/**
 * Sticky submit bar pinned above the fixed tab bar. Sticky (in-flow), not
 * fixed, so it never overlaps content — it flows at the end of the scroll and
 * pins to `bottom` while the body scrolls under it. When the keyboard opens the
 * layout viewport shrinks and the sticky element rides up with it, keeping the
 * submit affordance reachable.
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
        bottom: MOBILE_TABBAR_CLEARANCE,
        zIndex: 8,
        marginTop: "var(--space-xl)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type ComposerTab = "write" | "preview";

export interface SegToggleSkin {
  containerStyle?: CSSProperties;
  buttonStyle?: (active: boolean) => CSSProperties;
}

/**
 * Write / Preview segmented control. Owns the a11y wiring (tablist / tab /
 * aria-selected); each skin paints the pill via `buttonStyle`.
 */
export function SegToggle({
  tab,
  setTab,
  skin,
}: {
  tab: ComposerTab;
  setTab: (next: ComposerTab) => void;
  skin: SegToggleSkin;
}) {
  const { t } = useTranslation("forms");
  const options: { key: ComposerTab; label: string }[] = [
    { key: "write", label: t("editPraxis.mobile.write") },
    { key: "preview", label: t("editPraxis.mobile.preview") },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("editPraxis.mobile.viewToggleAria")}
      style={{ display: "flex", ...skin.containerStyle }}
    >
      {options.map((option) => {
        const active = tab === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(option.key)}
            style={{
              flex: 1,
              cursor: "pointer",
              ...(skin.buttonStyle ? skin.buttonStyle(active) : {}),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
