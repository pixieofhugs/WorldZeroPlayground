/**
 * Section-D metatask picker (#933) — the neutral surface where the author seals
 * a foreign metatask onto a solo praxis.
 *
 * It is deliberately UN-skinned: the panel itself wears the community spectrum
 * (the `na`/Default rainbow), themed by no single faction, because the choice
 * spans every issuing faction. Each ROW, however, wears its issuing faction's
 * dress by reusing the read-only `<MetaTaskSeal>` card, so the allegiance reads
 * at a glance. A faction filter row and a title/description search narrow the
 * list; the footer confirms the pending choice before it attaches.
 *
 * One metatask attaches at a time (`state.addMetatask` → `applyMetatask`); the
 * model still allows many total across the praxis. Rows already sealed render
 * inert with a "Sealed" tag.
 *
 * Mounted once from the EditPraxis dispatcher (beside DuelSealConfirm), so all
 * 16 composer surfaces inherit it. Mobile gets a full-screen sheet, desktop a
 * centred panel, via `useFormFactor()`.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TaskOut } from "../../api/tasks";
import MetaTaskSeal from "../../components/metaTaskSeal/MetaTaskSeal";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionCssVar, factionName } from "../../utils/factions";
import type { EditPraxisState } from "./useEditPraxis";

const ALL_FILTER = "all" as const;

export default function MetataskPicker({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  const isMobile = useFormFactor() === "mobile";
  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState<string>(ALL_FILTER);
  const [pending, setPending] = useState<TaskOut | null>(null);

  // Distinct issuing factions present in the eligible set — the filter chips.
  const factionSlugs = useMemo(() => {
    const seen: string[] = [];
    for (const mt of state.metaTasks) {
      const slug = mt.metatask_faction_slug;
      if (slug && !seen.includes(slug)) seen.push(slug);
    }
    return seen;
  }, [state.metaTasks]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.metaTasks.filter((mt) => {
      if (factionFilter !== ALL_FILTER && mt.metatask_faction_slug !== factionFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack = `${mt.title} ${mt.description ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [state.metaTasks, query, factionFilter]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editPraxis.seal.pickerTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        padding: isMobile ? 0 : "var(--space-lg)",
        background: isMobile
          ? "var(--color-bg-page)"
          : "radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          gap: "var(--space-md)",
          padding: "var(--space-lg)",
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
        {/* the whole rainbow, no allegiance — this surface belongs to no faction */}
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
            {t("editPraxis.seal.pickerTitle")}
          </h2>
          <p
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              color: "var(--faction-default-card-muted)",
              marginTop: "var(--space-xs)",
            }}
          >
            {t("editPraxis.seal.pickerSubtitle")}
          </p>
        </div>

        {/* Faction filter chips: All + each issuing faction */}
        <div
          className="flex flex-wrap"
          style={{ gap: "var(--space-xs)" }}
          role="group"
          aria-label={t("editPraxis.seal.filterAria")}
        >
          <button
            type="button"
            onClick={() => setFactionFilter(ALL_FILTER)}
            aria-pressed={factionFilter === ALL_FILTER}
            style={chipStyle(factionFilter === ALL_FILTER, null)}
          >
            {t("editPraxis.seal.filterAll")}
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
          placeholder={t("editPraxis.seal.searchPlaceholder")}
          aria-label={t("editPraxis.seal.searchAria")}
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

        {/* Rows — each wears its issuing faction's dress */}
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
              {t("editPraxis.seal.empty")}
            </p>
          )}
          {rows.map((mt) => {
            const sealed = state.appliedMetatasks.has(mt.id);
            const selected = pending?.id === mt.id;
            return (
              <button
                key={mt.id}
                type="button"
                disabled={sealed}
                onClick={() => setPending(mt)}
                aria-pressed={selected}
                aria-label={t("editPraxis.seal.addAria", { title: mt.title })}
                className="text-left"
                style={{
                  display: "block",
                  width: "100%",
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  borderRadius: 12,
                  cursor: sealed ? "default" : "pointer",
                  opacity: sealed ? 0.55 : 1,
                  outline: selected
                    ? "2px solid var(--faction-default-card-accent)"
                    : "none",
                  outlineOffset: 2,
                }}
              >
                <MetaTaskSeal metatasks={[mt]} />
                {sealed && (
                  <span
                    className="eyebrow block"
                    style={{
                      color: "var(--color-success)",
                      marginTop: "var(--space-xs)",
                    }}
                  >
                    {t("editPraxis.seal.alreadySealed")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer — confirms the pending choice */}
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
              {t("editPraxis.seal.pending", {
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
              onClick={state.closeMetataskPicker}
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
              {t("editPraxis.seal.cancel")}
            </button>
            <button
              type="button"
              disabled={!pending || state.applyingMetatask !== null}
              onClick={() => {
                if (pending) void state.addMetatask(pending);
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
              {t("editPraxis.seal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
