import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { CTA_DETAIL_SIZE } from "./cardCta";
import type { TaskCardSignupCta } from "./signupAffordance";

/**
 * The element under a card's action slot, chosen from the slot (#2359): a
 * button, or a LINK to the draft's editor for `already_active_member` — the one
 * place a card honours a server-shut affordance for all skins.
 *
 * The skin owns paint (`style`/`className`, spread after `cursor`); the anchor
 * adds only `textDecoration: "none"`. Always a SIBLING of the card-wide `<Link>`
 * (valid HTML). `testId` is for the task detail page (`e2e/collaboration.spec.ts`).
 *
 * `cursor` is affordance, a function of `cta.denied` (#2642), spread FIRST.
 * `size` is geometry only and spread LAST, so a card's narrow-column padding
 * can't survive into a panel.
 */
export function CardCtaControl({
  cta,
  className,
  size = "card",
  style,
  testId,
  children,
}: {
  cta: TaskCardSignupCta;
  className?: string;
  /** Geometry only — never paint. */
  size?: "card" | "detail";
  style?: CSSProperties;
  testId?: string;
  children: ReactNode;
}) {
  const cursor = { cursor: cta.denied ? "not-allowed" : "pointer" } as const;
  const sized = size === "detail" ? CTA_DETAIL_SIZE : null;
  if (cta.href) {
    return (
      <Link
        to={cta.href}
        className={className}
        data-testid={testId}
        style={{ textDecoration: "none", ...cursor, ...style, ...sized }}
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
      style={{ ...cursor, ...style, ...sized }}
    >
      {children}
    </button>
  );
}
