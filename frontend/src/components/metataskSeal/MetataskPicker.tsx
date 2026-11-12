/**
 * Section-D metatask picker (#933): seal a foreign metatask onto a solo praxis.
 * The panel is un-skinned (spans every faction); each row wears its issuing
 * faction via `<MetataskSeal>`. One attaches at a time. Mounted once from the
 * EditPraxis dispatcher. Draws at the root (#2244) to escape `ShellContent`'s
 * stacking context; see `drawAtRoot`.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TaskOut } from "../../api/tasks";
import MetataskSeal from "./MetataskSeal";
import { drawAtRoot } from "../ui/drawAtRoot";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionCssVar, factionName } from "../../utils/factions";
import { ErrorBanner } from "../../pages/editPraxis/archetypes/shared";
import type { EditPraxisState } from "../../pages/editPraxis/useEditPraxis";

const ALL_FILTER = "all" as const;

/** Selected row's non-colour tell (#2729); same check `OptionPicker` uses. */
const CHECK_GLYPH = "✓";

export default function MetataskPicker({
  metatasks,
  appliedMetatasks,
  applyingMetatask,
  addMetatask,
  closeMetataskPicker,
  error,
}: Pick<
  EditPraxisState,
  | "metatasks"
  | "appliedMetatasks"
  | "applyingMetatask"
  | "addMetatask"
  | "closeMetataskPicker"
  | "error"
>) {
  const { t } = useTranslation("forms");
  const isMobile = useFormFactor() === "mobile";
  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState<string>(ALL_FILTER);
  const [pending, setPending] = useState<TaskOut | null>(null);

  const factionSlugs = useMemo(() => {
    const seen: string[] = [];
    for (const mt of metatasks) {
      const slug = mt.metatask_faction_slug;
      if (slug && !seen.includes(slug)) seen.push(slug);
    }
    return seen;
  }, [metatasks]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return metatasks.filter((mt) => {
      if (factionFilter !== ALL_FILTER && mt.metatask_faction_slug !== factionFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack = `${mt.title} ${mt.description ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [metatasks, query, factionFilter]);

  const chipStyle = (active: boolean, slug: string | null) => ({
    padding: "var(--space-xs) var(--space-md)",
    borderRadius: 999,
    border: `1px solid ${
      slug ? factionCssVar(slug, "border") : "var(--faction-default-border)"
    }`,
    background: active
      ? slug
        ? factionCssVar(slug, "light")
        : "var(--faction-default-light)"
      : "transparent",
    color: "var(--color-text-primary)",
    fontSize: "var(--text-md)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editPraxis.attach.pickerTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        padding: isMobile ? 0 : "var(--space-lg)",
        background: isMobile
          ? "var(--color-bg-page)"
          : "var(--color-overlay-strong)",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          gap: "var(--space-md)",
          padding: "var(--space-lg)",
          // Over the tab bar, so the sheet holds the safe-area gap itself.
          paddingBottom: isMobile
            ? "calc(var(--space-lg) + env(safe-area-inset-bottom))"
            : "var(--space-lg)",
          width: isMobile ? "100%" : "min(560px, 100%)",
          height: isMobile ? "100%" : "auto",
          maxHeight: isMobile ? "100%" : "85vh",
          background: "var(--faction-default-card-bg)",
          color: "var(--faction-default-card-text)",
          border: isMobile ? "none" : "2px solid var(--faction-default-border)",
          borderRadius: isMobile ? 0 : 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute"
          style={{
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--faction-default-rainbow)",
          }}
        />

        <div>
          <h2
            className="font-display"
            style={{
              fontSize: "var(--text-content)",
              color: "var(--color-text-primary)",
            }}
          >
            {t("editPraxis.attach.pickerTitle")}
          </h2>
          <p
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              color: "var(--faction-default-card-muted)",
              marginTop: "var(--space-xs)",
            }}
          >
            {t("editPraxis.attach.pickerSubtitle")}
          </p>
        </div>

        <div
          className="flex flex-wrap"
          style={{ gap: "var(--space-xs)" }}
          role="group"
          aria-label={t("editPraxis.attach.filterAria")}
        >
          <button
            type="button"
            onClick={() => setFactionFilter(ALL_FILTER)}
            aria-pressed={factionFilter === ALL_FILTER}
            style={chipStyle(factionFilter === ALL_FILTER, null)}
          >
            {t("editPraxis.attach.filterAll")}
          </button>
          {factionSlugs.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setFactionFilter(slug)}
              aria-pressed={factionFilter === slug}
              style={chipStyle(factionFilter === slug, slug)}
            >
              {factionName(slug)}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("editPraxis.attach.searchPlaceholder")}
          aria-label={t("editPraxis.attach.searchAria")}
          className="font-body"
          style={{
            width: "100%",
            fontSize: "var(--text-md)",
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            outline: "none",
          }}
        />

        <div
          className="flex flex-col"
          style={{ gap: "var(--space-sm)", overflowY: "auto", flex: 1 }}
        >
          {rows.length === 0 && (
            <p
              className="font-body"
              style={{
                fontSize: "var(--text-md)",
                color: "var(--faction-default-card-muted)",
                padding: "var(--space-md)",
                textAlign: "center",
              }}
            >
              {t("editPraxis.attach.empty")}
            </p>
          )}
          {rows.map((mt) => (
            <PickerRow
              key={mt.id}
              metatask={mt}
              sealed={appliedMetatasks.has(mt.id)}
              selected={pending?.id === mt.id}
              onPick={() => setPending(mt)}
            />
          ))}
        </div>

        {/* A refused attach shows here, not behind the overlay (#2382). Above
            the footer so the buttons never reflow. */}
        <ErrorBanner message={error} />

        <div
          className="flex items-center"
          style={{
            gap: "var(--space-md)",
            flexWrap: "wrap",
            borderTop: "1px solid var(--faction-default-border)",
            paddingTop: "var(--space-md)",
          }}
        >
          {pending && (
            <span
              className="font-body"
              style={{
                fontSize: "var(--text-md)",
                color: "var(--faction-default-card-text)",
                flex: "1 1 auto",
              }}
            >
              {t("editPraxis.attach.pending", {
                faction: factionName(pending.metatask_faction_slug),
                points: pending.point_value,
              })}
            </span>
          )}
          <div
            className="flex items-center"
            style={{ gap: "var(--space-sm)", marginLeft: "auto" }}
          >
            <button
              type="button"
              onClick={closeMetataskPicker}
              className="font-body"
              style={{
                fontSize: "var(--text-md)",
                padding: "var(--space-sm) var(--space-md)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t("editPraxis.attach.cancel")}
            </button>
            <button
              type="button"
              disabled={!pending || applyingMetatask !== null}
              onClick={() => {
                if (pending) void addMetatask(pending);
              }}
              className="font-body"
              style={{
                fontSize: "var(--text-md)",
                padding: "var(--space-sm) var(--space-lg)",
                background: pending
                  ? "var(--faction-default-card-accent)"
                  : "var(--faction-default-light)",
                color: pending
                  ? "var(--color-bg-page)"
                  : "var(--faction-default-card-muted)",
                border: "none",
                borderRadius: 8,
                cursor: pending ? "pointer" : "default",
              }}
            >
              {t("editPraxis.attach.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return drawAtRoot(overlay);
}

/**
 * One picker row, exported so tests (no clicks) can render a selected state.
 *
 * The control is a transparent overlay SIBLING of the seal, not a button around
 * it (#2648): the seal's faction band is a `<Link>`, invalid inside a button.
 * `zIndex: 3` clears the band's 2 (`CardMasthead`).
 *
 * ponytail: keyboard ceiling: Tab reaches the band's link before the row
 * control; fix needs a band that can be told "not here" (#2648).
 *
 * The selection ring rides the control (#2729): a parent's outline paints under
 * its children. Radius and ink are the card's own tokens. Some accents fail 3:1
 * on this sheet, so `.metatask-pick__tick` carries the non-colour signal.
 */
export function PickerRow({
  metatask,
  sealed,
  selected,
  onPick,
}: {
  metatask: TaskOut;
  sealed: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const { t } = useTranslation("forms");
  return (
    <div className="relative text-left" style={{ opacity: sealed ? 0.55 : 1 }}>
      <MetataskSeal metatasks={[metatask]} />
      <button
        type="button"
        disabled={sealed}
        onClick={onPick}
        aria-pressed={selected}
        aria-label={t("editPraxis.attach.addAria", { title: metatask.title })}
        className="absolute"
        style={{
          inset: 0,
          zIndex: 3,
          width: "100%",
          padding: 0,
          background: "transparent",
          border: "none",
          borderRadius: factionCssVar(
            metatask.metatask_faction_slug,
            "card-radius",
          ),
          // Only when selected, so unselected rows keep the browser focus ring.
          ...(selected
            ? {
                outline: `2px solid ${factionCssVar(
                  metatask.metatask_faction_slug,
                  "card-accent",
                )}`,
                outlineOffset: 2,
              }
            : null),
          cursor: sealed ? "default" : "pointer",
        }}
      >
        {selected && (
          <span className="metatask-pick__tick" aria-hidden="true">
            {CHECK_GLYPH}
          </span>
        )}
      </button>
      {sealed && (
        <span
          className="label-caption block"
          style={{
            color: "var(--color-success)",
            marginTop: "var(--space-xs)",
          }}
        >
          {t("editPraxis.attach.alreadyAttached")}
        </span>
      )}
    </div>
  );
}
