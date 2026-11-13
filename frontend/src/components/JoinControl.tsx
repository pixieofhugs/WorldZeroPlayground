import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionName } from "../utils/factions";
import { CARD_CTA } from "./ctaTapFloor";

const NA_SLUG = "na";

/**
 * What the control needs from its host to run a join. Lives in `components/`
 * because `InvitationLetterPopup` hosts it too (#2656).
 */
export interface JoinTarget {
  /** The faction the viewer would LEAVE by joining; nullish or "na" reads as unaffiliated. */
  currentFactionSlug: string | null | undefined;
  /** Run the join. The host owns the call and its failure; this control only reports. */
  join: () => Promise<void>;
  joining: boolean;
  joinError: string | null;
}

/**
 * The paint every kit hands the join trio (#2651). A typed skin so a forgotten
 * button is a compile error. The control owns behaviour; the kit owns pixels.
 */
export interface JoinControlSkin {
  /** The primary verb, before the confirm step. Full width in every kit. */
  openStyle: CSSProperties;
  /** The affirmative half of the pair — the RIGHT-hand button (#646). */
  confirmStyle: CSSProperties;
  /** The quiet half — the LEFT-hand button. */
  cancelStyle: CSSProperties;
  /** A kit CSS class for the two AFFIRMATIVE buttons only (e.g. `.eph-cta`, #2146). */
  className?: string;
  /** The switch sentence above the pair. */
  proseStyle?: CSSProperties;
  /** Renders only after a FAILED join. */
  errorStyle?: CSSProperties;
}

const PAIR_ROW: CSSProperties = { display: "flex", gap: "var(--space-sm)" };

/*
 * THE 44px TAP FLOOR (#2826): `CARD_CTA` is spread here, once, not into the
 * nine skins — a tap target is not paint. Spread FIRST so a kit's geometry wins.
 * Imported from `ctaTapFloor`, NOT `taskCard/cardCta`: that one would strand the
 * faction font sheet on the critical path (#2079). Guard: `joinTapTarget.test.tsx`.
 */

/**
 * The join trio — [Join] → switch sentence, error slot, [Cancel] … [Confirm] —
 * written ONCE for all nine faction bodies (#2651), in the #646 order.
 *
 * Busy paint is `.control-off` on the affirmative (#3011; not inline opacity,
 * which loses contrast twice, #2486), ALONGSIDE the skin's class.
 *
 * `SealActions` is NOT reused (owner ruling): it would flatten nine kits into one grey pair.
 */
export function JoinControl({
  membership,
  name,
  skin,
  openLabel,
  joiningLabel,
  intro,
  autoFocus = false,
}: {
  membership: JoinTarget;
  /** The mounted faction's display name, for the confirm sentence. */
  name: string;
  skin: JoinControlSkin;
  /**
   * The kit's own verb for opening the confirm step, and its own word for the
   * pending state. Passed in rather than resolved from the slug so the catalog
   * keys stay LITERAL at the call site: a `t(\`${slug}.join.joinButton\`)` here
   * would be invisible to the copy greps and to `eslint-plugin-i18next`.
   */
  openLabel: ReactNode;
  joiningLabel: ReactNode;
  /** Title and blurb, open state only. */
  intro?: ReactNode;
  /** MODAL hosts only (#2656, #2130): scrolls the confirm into view. Inline it would yank the page. */
  autoFocus?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <>
        {intro}
        <button
          type="button"
          data-join="open"
          autoFocus={autoFocus}
          className={skin.className}
          onClick={() => setConfirming(true)}
          style={{ ...CARD_CTA, ...skin.openStyle }}
        >
          {openLabel}
        </button>
      </>
    );
  }

  return (
    <JoinConfirm
      membership={membership}
      name={name}
      skin={skin}
      joiningLabel={joiningLabel}
      onCancel={() => setConfirming(false)}
      autoFocus={autoFocus}
    />
  );
}

/**
 * The confirm step: prose, error slot, pair — one unit, since the error only
 * shows on failure and is easy to drop. Stateless so `joinControlOrder` can
 * render it statically.
 */
export function JoinConfirm({
  membership,
  name,
  skin,
  joiningLabel,
  onCancel,
  autoFocus = false,
}: {
  membership: JoinTarget;
  name: string;
  skin: JoinControlSkin;
  joiningLabel: ReactNode;
  onCancel: () => void;
  /**
   * `true` focuses the AFFIRMATIVE. `"cancel"` for hosts opened by Enter in a
   * text field (#3149), where a repeating keypress would confirm.
   */
  autoFocus?: boolean | "cancel";
}) {
  const { t } = useTranslation("factions");
  const current = membership.currentFactionSlug;
  const busy = membership.joining;
  // Captured on first render, before autoFocus moves it, so cancel can restore focus.
  const trigger = useRef<Element | null>(typeof document === "undefined" ? null : document.activeElement);
  const cancel = () => {
    onCancel();
    if (autoFocus === "cancel" && trigger.current instanceof HTMLElement) trigger.current.focus();
  };

  return (
    <>
      <p className="content-text" style={skin.proseStyle}>
        {current && current !== NA_SLUG
          ? t("detail.join.confirmSwitch", { faction: name, current: factionName(current) })
          : t("detail.join.confirm", { faction: name })}
      </p>
      {membership.joinError && (
        <p className="content-text" style={skin.errorStyle}>
          {membership.joinError}
        </p>
      )}
      {/* [Cancel] … [Confirm] (#646). DOM order is visual order. */}
      <div style={PAIR_ROW}>
        <button
          type="button"
          data-join="cancel"
          autoFocus={autoFocus === "cancel"}
          onClick={cancel}
          disabled={busy}
          style={{ ...CARD_CTA, ...skin.cancelStyle, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {t("detail.join.cancel")}
        </button>
        <button
          type="button"
          data-join="confirm"
          autoFocus={autoFocus === true}
          className={
            skin.className ? `${skin.className} control-off` : "control-off"
          }
          onClick={() => void membership.join()}
          disabled={busy}
          style={{
            ...CARD_CTA,
            ...skin.confirmStyle,
            flex: 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? joiningLabel : t("detail.join.confirmAction")}
        </button>
      </div>
    </>
  );
}
