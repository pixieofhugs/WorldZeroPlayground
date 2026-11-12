/**
 * Add friend / add foe on the character profile (ADR-0077; the block is
 * `RelationshipBlockControl`). Busy state is a prop so tests can render it (#3011).
 */
import { useTranslation } from "react-i18next";
import { factionFill } from "../../utils/factions";

const BUTTON_BASE: React.CSSProperties = {
  fontFamily: "var(--font-body)",
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
  loading: boolean;
  /** na → rainbow frame; real faction → solid hue + on-fill ink. */
  factionSlug: string | null | undefined;
  onAddFriend: () => void;
  onAddFoe: () => void;
}) {
  const { t } = useTranslation("common");
  // Singularity's header is theme-invariant VOID, where `.control-off` would lay
  // a pale slab; `.sg-control-off` fixes it (#3011). A paint branch.
  const offClass =
    factionSlug === "singularity" ? "control-off sg-control-off" : "control-off";
  return (
    <>
      <button
        onClick={onAddFriend}
        disabled={loading}
        // Not an `opacity` fade, which loses contrast twice (#2486).
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
