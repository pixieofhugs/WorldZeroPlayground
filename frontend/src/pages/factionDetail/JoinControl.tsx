import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionName } from "../../utils/factions";
import type { Membership } from "./useFactionDetail";

const NA_SLUG = "na";

/**
 * The paint every kit hands the join trio (#2651).
 *
 * A TYPED SKIN, NOT A `style` PROP — `PublishButtonSkin`'s shape
 * (`editPraxis/archetypes/controls.tsx`), where a kit that forgets a button gets
 * a compile error rather than an unpainted control. The three button slots are
 * required for exactly that reason; prose and error are optional because
 * `DefaultFactionBody` deliberately leaves its confirm sentence uncoloured (it
 * inherits, see #1819) and a kit that passes nothing renders readable prose.
 *
 * The control owns BEHAVIOUR — the confirm step, the handlers, the disabled and
 * busy states, and the #646 order. The archetype owns every pixel, and the box
 * these buttons sit in is still the kit's own: S.N.I.D.E.'s plate, Coven's slip
 * and the Ephemerists' marginalia are not this component's business.
 */
export interface JoinControlSkin {
  /** The primary verb, before the confirm step. Full width in every kit. */
  openStyle: CSSProperties;
  /** The affirmative half of the pair — the RIGHT-hand button (#646). */
  confirmStyle: CSSProperties;
  /** The quiet half — the LEFT-hand button. */
  cancelStyle: CSSProperties;
  /**
   * For reaching a kit's CSS class, mounted on the two AFFIRMATIVE buttons and
   * not on the cancel. The Ephemerists' `.eph-cta` is the live case and it
   * dressed exactly those two before this extraction: an enclosure that changes
   * width between the cascades has no inline expression (#2146).
   */
  className?: string;
  /** The switch sentence above the pair. */
  proseStyle?: CSSProperties;
  /** The `joinError` line, which only ever renders after a FAILED join. */
  errorStyle?: CSSProperties;
}

/** The pair's row. Identical in all nine kits before the extraction. */
const PAIR_ROW: CSSProperties = { display: "flex", gap: "var(--space-sm)" };

/**
 * The join trio — [Join] → the switch sentence, the error slot and
 * [Cancel] … [Confirm] — written ONCE for all nine faction bodies (#2651).
 *
 * It was written out longhand in eight of them, and seven put the affirmative on
 * the LEFT. That is a shipped global ruling broken in seven places (#646, stated
 * at `duel/shared.tsx`'s `SealActions`), and it is the reason the extraction
 * takes the whole pair rather than the primary button alone: a control that owns
 * only the primary leaves the defect standing.
 *
 * Two drifts fall out of the same cause and are fixed here because the component
 * now owns the state they describe:
 *
 *   THE BUSY OPACITY. `opacity: 0.6` while joining shipped on WOW and the
 *     fall-through only; the other six disabled the button and showed nothing.
 *     It is applied uniformly now, on the affirmative alone — which is where
 *     both of those two put it.
 *
 *   THE BUSY CURSOR. Six kits set `cursor: not-allowed` while joining and two
 *     left `pointer` under a disabled button. Uniform, and on both halves of the
 *     pair since both are disabled.
 *
 * `SealActions` is NOT reused, on the owner's ruling: it paints with the global
 * `btn-primary` / `btn-outline` and lets a theme override only `fontFamily`, so
 * nine kits would collapse into one grey pair in nine typefaces. It stays
 * grandfathered for the duel sheet, untouched.
 */
export function JoinControl({
  membership,
  name,
  skin,
  openLabel,
  joiningLabel,
  intro,
}: {
  membership: Membership;
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
  /**
   * The kit's title and blurb above the primary verb. Drawn in the open state
   * only — the confirm step replaces the pitch with the question.
   */
  intro?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <>
        {intro}
        <button
          type="button"
          data-join="open"
          className={skin.className}
          onClick={() => setConfirming(true)}
          style={skin.openStyle}
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
    />
  );
}

/**
 * The confirm step: prose, then the error slot, then the pair.
 *
 * THE UNIT IS ALL THREE. The error only renders on a failed join, so no browser
 * pass and no screenshot can catch its absence — it is the piece an extraction
 * drops silently, which is why it lives inside the control rather than being
 * left to nine call sites.
 *
 * Exported STATELESS, the same shape `SealActions` has, so the order ruling can
 * be asserted against rendered markup: this harness renders with
 * `renderToStaticMarkup` and has no DOM to click, so a `confirming` reachable
 * only through a click event would be a rule with no test. `joinControlOrder`
 * is the guard.
 */
export function JoinConfirm({
  membership,
  name,
  skin,
  joiningLabel,
  onCancel,
}: {
  membership: Membership;
  name: string;
  skin: JoinControlSkin;
  joiningLabel: ReactNode;
  onCancel: () => void;
}) {
  const { t } = useTranslation("factions");
  const current = membership.currentFactionSlug;
  const busy = membership.joining;

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
      {/* [Cancel] … [Confirm] — the global footer order (#646). DOM order is
          visual order here: no kit reverses this row. */}
      <div style={PAIR_ROW}>
        <button
          type="button"
          data-join="cancel"
          onClick={onCancel}
          disabled={busy}
          style={{ ...skin.cancelStyle, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {t("detail.join.cancel")}
        </button>
        <button
          type="button"
          data-join="confirm"
          className={skin.className}
          onClick={() => void membership.join()}
          disabled={busy}
          style={{
            ...skin.confirmStyle,
            flex: 1,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? joiningLabel : t("detail.join.confirmAction")}
        </button>
      </div>
    </>
  );
}
