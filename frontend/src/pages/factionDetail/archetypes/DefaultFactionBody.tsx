import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { factionCssVar, factionName } from "../../../utils/factions";
import { computeFactionMultiplier } from "../../../utils/points";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { MobileStickyBar } from "../MobileStickyBar";
import type { FactionDetailState } from "../useFactionDetail";

const NA_SLUG = "na";

/** Shared flex-wrap card grid — varied card sizes are intentional, not a CSS grid. */
const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  alignItems: "flex-start",
};

/**
 * Default faction-body archetype — the members / tasks / recently-completed
 * sections lifted verbatim from the original FactionDetail page, now consuming
 * the shared {@link FactionDetailState}. Any faction without a bespoke body
 * falls through to this, so it must stay visually identical to before.
 *
 * NOTE: the styling here is intentionally PLACEHOLDER — real per-faction visual
 * design is deferred to Claude design. Data wiring + structure are final; the
 * section chrome (member tiles, layout) is meant to be restyled by a faction's
 * own body archetype.
 *
 * THE JOIN BLOCK (#1314). This archetype used to carry only the burn notice,
 * because the factions falling through to it were waiting on #951's join/gate
 * design. WOW got a body of its own in #1611 and Albescent is the only faction
 * left here, so that note was stale — and worse, it described a real asymmetry:
 * the phone twin `mobileArchetypes/DefaultFactionPage` DID carry a join block,
 * so you could join from a phone and not from a laptop. Collapsing the pair
 * without acting would have taken the phone's away too. What follows is that
 * skin's block moved across unchanged — sticky Join with a confirm step,
 * confirm-switch copy, the soft gate and the burn, all ADR-0019-gated to a
 * viewer who can actually act. It keeps the `mobile.*` catalog keys it arrived
 * with; renaming them is a catalog change and this PR makes none.
 */
export default function DefaultFactionBody({
  state,
}: {
  state: FactionDetailState;
}) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } =
    state;
  const [confirming, setConfirming] = useState(false);
  const phone = useFormFactor() === "mobile";

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const accent = factionCssVar(faction.slug, "border");
  const name = factionName(faction.slug);
  const currentSlug = membership.currentFactionSlug;
  const switching = currentSlug && currentSlug !== NA_SLUG;

  /**
   * The primary verb. Rendered ONCE — inline under the standing line on a
   * laptop, pinned above the tab bar on a phone (#495 / #1566). Only an
   * "eligible" viewer can act (ADR-0019), and a control nobody can use is
   * hidden rather than disabled.
   */
  const joinAction = membership.state === "eligible" && (
    <>
      {membership.joinError && (
        // The phone skin this came from wrote `text-red-600`, and its legacy
        // exemption died with the file. The token says the same thing and is
        // what every other body's join error already uses (#1853).
        <p className="font-body content-text" style={{ color: "var(--color-danger)" }}>
          {membership.joinError}
        </p>
      )}
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} style={JOIN_BUTTON_STYLE}>
          {t("mobile.join", { faction: name })}
        </button>
      ) : (
        <>
          <p className="font-body content-text" style={{ color: "var(--color-text-primary)" }}>
            {switching
              ? t("detail.join.confirmSwitch", { faction: name, current: factionName(currentSlug) })
              : t("detail.join.confirm", { faction: name })}
          </p>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              type="button"
              onClick={() => void membership.join()}
              disabled={membership.joining}
              style={{ ...JOIN_BUTTON_STYLE, flex: 1, opacity: membership.joining ? 0.6 : 1 }}
            >
              {membership.joining ? t("mobile.joining") : t("mobile.confirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={membership.joining}
              style={CANCEL_BUTTON_STYLE}
            >
              {t("detail.join.cancel")}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* ── The burn (#1305) ── this viewer left this faction this era, so
          joining is refused for the rest of it. The phone twin said this in its
          own words (`mobile.burnedHint`); that delta was cosmetic, so it
          collapses to the neutral platform wording every other body uses
          (ADR-0057: the dress is ours, the words are not). ── */}
      {membership.state === "burned" && (
        <div
          className="sidebar-card mb-6"
          style={{ padding: "var(--space-md) var(--space-lg)" }}
        >
          <p className="label-heading mb-1">{t("detail.burned.kicker")}</p>
          <p className="font-body content-text text-ink">
            {t("detail.burned.body", { faction: factionName(faction.slug) })}
          </p>
        </div>
      )}

      {/* ── Standing / the soft gate ── the two states a viewer cannot act on.
          "gate" is "not invited YET" (#454), which is why its copy tells you to
          keep going; the burn above is a closed door and must stay a different
          sentence. ── */}
      {membership.state === "member" && (
        <p className="label-caption mb-6" style={{ color: accent }}>
          {t("mobile.memberBadge")}
        </p>
      )}
      {membership.state === "gate" && (
        <p className="font-body text-muted content-text mb-6">
          {t("mobile.gateHint", { faction: name })}
        </p>
      )}

      {/* ponytail: on a laptop the verb sits here, in a plain 420px column,
          because this archetype has no rail to put it in — the whole file is
          placeholder chrome and #951's join/gate design is what will place it
          properly. On a phone it pins instead, at the bottom of the page. ── */}
      {!phone && joinAction && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
            maxWidth: 420,
            marginBottom: "var(--space-xl)",
          }}
        >
          {joinAction}
        </div>
      )}

      {/* ── Members ── PLACEHOLDER: design to restyle ── */}
      <section className="mb-8">
        <h2 className="label-heading mb-3">
          {t("detail.default.membersHeading", { total: members.length })}
        </h2>
        {members.length === 0 ? (
          <p className="font-body text-muted content-text">{t("detail.membersEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  border: `1px solid ${accent}`,
                  padding: "var(--space-sm) var(--space-md)",
                  background: "var(--color-bg-surface)",
                }}
              >
                <CharacterBadge character={m} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Tasks ── reuses the per-faction TaskCard archetype ── */}
      <section className="mb-8">
        <h2 className="label-heading mb-3">
          {t("detail.default.tasksHeading", { total: tasks.length })}
        </h2>
        {tasks.length === 0 ? (
          <p className="font-body text-muted content-text">{t("detail.default.tasksEmpty")}</p>
        ) : (
          <div style={CARD_GRID}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                basePoints={task.point_value}
                multiplier={computeFactionMultiplier(
                  viewerFactionSlug,
                  task.primary_faction_slug,
                  gameFactions,
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recently completed ── PLACEHOLDER: design to restyle ── */}
      <section className="mb-8">
        <h2 className="label-heading mb-3">{t("detail.default.recentHeading")}</h2>
        {recentPraxis.length === 0 ? (
          <p className="font-body text-muted content-text">
            {t("detail.default.recentEmpty")}
          </p>
        ) : (
          <div style={CARD_GRID}>
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── The pinned action band ── phone only, and the LAST child of the
          page's tall box so `position: sticky` has something to pin against
          (#495, #1566). ── */}
      {phone && joinAction && <MobileStickyBar>{joinAction}</MobileStickyBar>}
    </>
  );
}

const JOIN_BUTTON_STYLE: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-xl)",
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "var(--color-text-on-accent)",
  background: "var(--color-text-primary)",
  border: "none",
  borderRadius: 999,
  padding: "var(--space-md) var(--space-lg)",
  cursor: "pointer",
};

const CANCEL_BUTTON_STYLE: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-md)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-secondary)",
  background: "transparent",
  border: "1px solid var(--color-border-strong)",
  borderRadius: 999,
  padding: "var(--space-md) var(--space-lg)",
  cursor: "pointer",
};
