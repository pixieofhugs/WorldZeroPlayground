/**
 * The unaffiliated pair — add friend / add foe — from the character profile
 * (the edge ADR-0077 keeps independent of its block; `RelationshipBlockControl`
 * is the block's own control).
 *
 * SPLIT OUT SO THE BUSY STATE IS A PROP (#3011). `CharacterProfile` held
 * `relationshipLoading` in local `useState`, and this harness has no DOM —
 * every render test in this codebase asserts `renderToStaticMarkup` output
 * against PROPS, never a click. `RelationshipBlockControl` already takes its
 * `busy` flag as a prop for the same reason; this is that shape applied to
 * the other half of the row.
 */
import { useTranslation } from "react-i18next";
import { factionFill } from "../../utils/factions";

const BUTTON_BASE: React.CSSProperties = {
  fontFamily: "'Courier Prime', monospace",
  fontSize: "var(--text-md)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  padding: "var(--space-xs) 0",
  border: "none",
  cursor: "pointer",
  borderRadius: 2,
};

export default function AddRelationshipButtons({
  loading,
  factionSlug,
  onAddFriend,
  onAddFoe,
}: {
  /** A relationship mutation is in flight. */
  loading: boolean;
  /** na → rainbow frame; real faction → solid hue + on-fill ink. */
  factionSlug: string | null | undefined;
  onAddFriend: () => void;
  onAddFoe: () => void;
}) {
  const { t } = useTranslation("common");
  // `.sg-control-off` rides alongside on a Singularity profile (#3011 review):
  // the header these sit in is `VOID` there, theme-invariant, so the house
  // `.control-off` neutral would lay a pale slab on it — the same pairing
  // `JOIN_SKIN` and `SingularityDuelSealConfirm` wear. A paint branch, which
  // is what a slug may be branched on.
  const offClass =
    factionSlug === "singularity" ? "control-off sg-control-off" : "control-off";
  return (
    <>
      <button
        onClick={onAddFriend}
        disabled={loading}
        // `.control-off` rather than the inline `opacity` fade (#2486, #3011):
        // `opacity` composites the whole element, so the fill sinks toward the
        // sheet and the label's ink fades over the already-faded fill, losing
        // contrast twice.
        className={offClass}
        style={{
          ...BUTTON_BASE,
          ...factionFill(factionSlug, "pill"),
        }}
      >
        {t("relationships.addFriend")}
      </button>
      <button
        onClick={onAddFoe}
        disabled={loading}
        className={offClass}
        style={{
          ...BUTTON_BASE,
          background: "none",
          color: "var(--color-danger)",
          border: "1.5px solid var(--color-danger)",
        }}
      >
        {t("relationships.addFoe")}
      </button>
    </>
  );
}
