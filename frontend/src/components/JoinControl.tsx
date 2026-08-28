import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionName } from "../utils/factions";
import { CARD_CTA } from "./ctaTapFloor";

const NA_SLUG = "na";

/**
 * What the control needs from its host in order to run a join.
 *
 * It lives HERE, and the control now lives under `components/`, because of
 * #2656: the trio's second host is `InvitationLetterPopup`, which is not a
 * faction page and not an archetype. A shared control parked under `pages/` —
 * reaching back into that page's hook for its own prop contract — is a
 * dependency pointing the wrong way the moment anything outside that page
 * mounts it.
 *
 * The faction page's `Membership` extends this and adds `state`, which the trio
 * never reads: the host decides whether a join block is drawn at all, and by
 * the time this renders that question is already answered. The popup builds one
 * of these inline from `useAuth` and its own POST.
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

/* ---------------------------------------------------------------------------
 * THE 44px TAP FLOOR, DECLARED ONCE FOR THE FOURTH CTA SURFACE (#2826).
 *
 * `CARD_CTA` is the task card's sign-up geometry (#2030), the task detail's and
 * the faction SELECT card's (#2818). The faction DETAIL page's join verb is the
 * same act on a fourth surface and had no floor at all: measured at
 * `10e41471`, `min-height` computed
 * to `0px` on all seven detail CTAs, six cleared 44px only because their own
 * padding and type added up to it, and Singularity's `> CONNECT` stood at
 * 40.5px. Coven's exactly-44.0 was one type rung away from the same fall.
 *
 * IT IS SPREAD HERE AND NOT INTO THE NINE SKINS. Every join verb on the site
 * routes through this component — eight faction bodies and
 * `InvitationLetterPopup` — so nine copies of the same declaration would be nine
 * places for it to rot, which is the shape #2651 extracted this control to
 * remove. A kit supplies PAINT; a tap target is not paint.
 *
 * SPREAD FIRST, so a kit's own geometry still wins: Coven's open verb declares
 * `display: flex` for the glyph it carries and keeps it. No kit declares a
 * `minHeight`, so nothing overrides the floor today, and a kit that wanted to
 * would have to write the number down where this comment is visible.
 *
 * The `display: inline-flex` this brings is inert on the two halves of the pair
 * — a flex item is blockified — and on the open verb it only centres a label the
 * button already centred, since every kit's label is a single text node bar
 * Coven's, which was already a flex box.
 *
 * IT IS IMPORTED FROM `ctaTapFloor` AND NOT FROM `taskCard/cardCta`, which is
 * where it used to live and still re-exports it. This component is on the
 * critical path and `cardCta.ts` sets eight faction `font-family` values, so a
 * static import of that module from here strands the faction font sheet
 * (#2079). `factionFaceSplit.test.ts` failed on exactly that import.
 *
 * `joinTapTarget.test.tsx` is the guard, off the rendered markup of all nine
 * bodies and of the pair.
 * ------------------------------------------------------------------------- */

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
  /**
   * The kit's title and blurb above the primary verb. Drawn in the open state
   * only — the confirm step replaces the pitch with the question.
   */
  intro?: ReactNode;
  /**
   * For a MODAL host only (#2656). `InvitationLetterPopup`'s confirm step is
   * taller than its pitch and both steps live in one scrolling scrim, so
   * focusing the freshly-mounted affirmative is what scrolls it into view on a
   * short viewport (#2130). Off by default: the eight faction bodies draw this
   * pair inline on a long page, where grabbing focus would yank the page down.
   */
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
  autoFocus = false,
}: {
  membership: JoinTarget;
  name: string;
  skin: JoinControlSkin;
  joiningLabel: ReactNode;
  onCancel: () => void;
  /** See {@link JoinControl}. The AFFIRMATIVE takes it, never the cancel. */
  autoFocus?: boolean;
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
          style={{ ...CARD_CTA, ...skin.cancelStyle, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {t("detail.join.cancel")}
        </button>
        <button
          type="button"
          data-join="confirm"
          autoFocus={autoFocus}
          className={skin.className}
          onClick={() => void membership.join()}
          disabled={busy}
          style={{
            ...CARD_CTA,
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
