import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TaskCardSignupCta } from "./signupAffordance";

/**
 * The ELEMENT under a card's action slot, chosen from the slot itself (#2359).
 *
 * All nine skins used to hand-write the same opening tag — `<button
 * type="button" onClick={cta.onPress} aria-disabled={cta.denied || undefined}>`
 * — nine times, and that was fine while there were only two states to draw: a
 * sign-up you can press, and a refusal you cannot.
 *
 * `already_active_member` is a third. It is a refusal that names a draft, so
 * the useful control is a LINK to that draft's editor, not a button and not a
 * label. Nine hand-written elements would have meant nine chances to get the
 * new one wrong, and `signupAffordance.ts` already carries the doctrine this
 * enforces: what a skin CANNOT do is reattach an affordance the server shut,
 * "and this is the one place a card can honour it for all nine skins at once".
 * That place is now here, where it can be a component instead of a convention.
 *
 * A SKIN STILL OWNS ITS PAINT. Everything visual — ground, ink, type,
 * enclosure, the 44px floor out of `CARD_CTA`, the cursor — arrives as `style`
 * and `className` and is spread LAST, so nothing below changes a pixel of any
 * card. The one base the anchor needs is `textDecoration: "none"`, because an
 * `<a>` underlines and a `<button>` does not; every skin sets its own `color`,
 * `background`, `border`, `padding` and `fontFamily` explicitly (the
 * Ephemerists' come from `.eph-cta`, a class, which still beats the bare `a`
 * selector), so no other UA default can leak in through the swapped tag.
 *
 * The slot is always a SIBLING of the card-wide `<Link>`, never inside it — see
 * `DefaultTaskCard`'s note on why the full-card target stops short of the CTA.
 * That is what keeps this valid HTML in the link branch as well as the button
 * one.
 *
 * `testId` exists because the TASK DETAIL page mounts this too (#2554), and its
 * slot has carried `data-testid="task-signup-cta"` since before the component
 * did — `e2e/collaboration.spec.ts` clicks it by that handle. It rides the
 * element rather than a wrapper for the same reason the handle exists: the
 * element is what gets clicked, and in the `href` branch it is an `<a>`. Cards
 * pass nothing and render nothing extra.
 */
export function CardCtaControl({
  cta,
  className,
  style,
  testId,
  children,
}: {
  cta: TaskCardSignupCta;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  children: ReactNode;
}) {
  if (cta.href) {
    return (
      <Link
        to={cta.href}
        className={className}
        data-testid={testId}
        style={{ textDecoration: "none", ...style }}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      data-testid={testId}
      onClick={cta.onPress}
      aria-disabled={cta.denied || undefined}
      style={style}
    >
      {children}
    </button>
  );
}
