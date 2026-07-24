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
import type { PraxisType } from "../../../api/praxis";
import { ModePicker } from "../archetypes/controls";
import type { EditPraxisState } from "../useEditPraxis";

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

const MODE_KEYS = ["solo", "collab", "duel"] as const;

/**
 * Mobile mode picker (#877) — the single-row Solo · Collab · Duel segmented
 * control that scrolls at the top of every mobile composer. It renders THROUGH
 * the shared ModePicker (archetypes/controls) so the level gate (#311), the
 * task's allowed-modes filter, and the lock collapse are reused verbatim — this
 * skin only paints each segment. The duel segment appears only when
 * `duelChipVisible`; once `modeIsLocked` (published/moderated) the shared
 * component hides the non-active options, so this collapses to a single static
 * pill instead of a dead one-segment toggle. Copy reuses the desktop `na` mode
 * labels — no new strings. Every faction shares this one Default skin until a
 * bespoke mobile picker lands.
 */
export function DefaultModePicker({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  const allowedModes = state.task?.allowed_modes ?? ["solo", "collab", "duel"];
  const options: { key: PraxisType; label: string }[] = MODE_KEYS.map(
    (key) => ({ key, label: t(`editPraxis.na.mode.${key}.label`) }),
  );
  const locked = state.modeIsLocked;
  return (
    <ModePicker
      state={state}
      skin={{
        options,
        allowedModes,
        // Locked: shed the segmented chrome so the lone active option reads as a
        // standalone pill, not a container hugging one button.
        containerStyle: locked
          ? { display: "inline-flex" }
          : {
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 999,
            },
        renderOption: (opt, { active, disabled, onSelect }) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            disabled={disabled && !active}
            onClick={onSelect}
            style={{
              flex: locked ? "0 0 auto" : 1,
              padding: "var(--space-sm) var(--space-md)",
              borderRadius: 999,
              border: "none",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-md)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: active ? 700 : 400,
              background: active ? "var(--faction-default)" : "transparent",
              color: active
                ? "var(--color-text-on-accent)"
                : "var(--color-text-secondary)",
              cursor: disabled ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        ),
      }}
    />
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
