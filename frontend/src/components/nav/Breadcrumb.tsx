/**
 * THE SITE'S ONE BREADCRUMB (#2102). Neutral site chrome: no skin, no dispatch,
 * no `--faction-*` token. Replaced eighteen drifted copies; must express every
 * trail (#2973), or callers hand-roll their own again.
 *
 * Rules it enforces:
 * 1. Every level is a link except the current page (`aria-current="page"`).
 * 2. It sits ABOVE the faction surface, first child of the page root.
 * 3. One component for both form factors: no breakpoint; {@link shrinkIndex}
 *    + flexbox degrade continuously.
 *
 * `maxWidth: 1200` is every detail page's column, so call sites need no wrapper.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface Crumb {
  /** Also its full accessible name. */
  label: string;
  /** Absent on the LAST crumb: you are already there. */
  to?: string;
}

/**
 * Which crumb ellipsises when the trail overflows: the longest middle crumb
 * (first and last stay whole), or the last when there are only two. Only one
 * ever shrinks. Clipped via `text-overflow`, so the full label stays in the DOM.
 *
 * @returns the index of the crumb that ellipsises, or -1 when none can.
 */
export function shrinkIndex(crumbs: readonly Crumb[]): number {
  if (crumbs.length < 2) return -1;
  const last = crumbs.length > 2 ? crumbs.length - 2 : crumbs.length - 1;
  let widest = 1;
  for (let i = 2; i <= last; i++) {
    if (crumbs[i].label.length > crumbs[widest].label.length) widest = i;
  }
  return widest;
}

/** The three surfaces that hang off an existing task. */
interface TaskTrailProps {
  taskId: number;
  taskTitle: string;
  /** Present on the two praxis surfaces; absent on a task detail. */
  praxisId?: number | string;
  /** The composer: the trail runs one step past the praxis. */
  editing?: boolean;
  current?: never;
}

/**
 * #2973 — a page under `Tasks` that is not a task (e.g. Propose a Task):
 * `Tasks › <current>`. A union so a caller supplies a task or a label, never both.
 */
interface CurrentTrailProps {
  /** What this page is called — the last crumb, and the only one after `Tasks`. */
  current: string;
  taskId?: never;
  taskTitle?: never;
  praxisId?: never;
  editing?: never;
}

type BreadcrumbProps = TaskTrailProps | CurrentTrailProps;

/** Nothing in the trail may wrap — a wrapped breadcrumb never truncates. */
const LIST_STYLE = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "nowrap",
  gap: "var(--space-sm)",
  minWidth: 0,
} as const;

const CLIPPED = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

export default function Breadcrumb(props: BreadcrumbProps) {
  const { t } = useTranslation("common");

  const trail: Crumb[] = [{ label: t("breadcrumb.tasks"), to: "/tasks" }];
  if (props.current !== undefined) {
    trail.push({ label: props.current });
  } else {
    const { taskId, taskTitle, praxisId, editing } = props;
    trail.push({ label: taskTitle, to: `/tasks/${taskId}` });
    if (praxisId !== undefined) {
      trail.push({ label: t("breadcrumb.praxis"), to: `/praxis/${praxisId}` });
    }
    if (editing) trail.push({ label: t("breadcrumb.edit") });
  }
  // The page you are on is not a link to itself.
  const crumbs = trail.map((crumb, index) =>
    index === trail.length - 1 ? { label: crumb.label } : crumb,
  );

  const shrink = shrinkIndex(crumbs);

  return (
    <nav
      aria-label={t("breadcrumb.label")}
      className="font-body"
      style={{
        maxWidth: 1200,
        marginInline: "auto",
        marginBottom: "var(--space-md)",
        fontSize: "var(--text-md)",
        letterSpacing: "0.1em",
        color: "var(--color-text-tertiary)",
      }}
    >
      <ol style={LIST_STYLE}>
        {crumbs.map((crumb, index) => {
          const clip = index === shrink ? CLIPPED : { whiteSpace: "nowrap" as const };
          return (
            <li
              key={crumb.to ?? "current"}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--space-sm)",
                minWidth: 0,
                flex: index === shrink ? "0 1 auto" : "0 0 auto",
              }}
            >
              {index > 0 && <span aria-hidden="true">&rsaquo;</span>}
              {crumb.to === undefined ? (
                <span
                  aria-current="page"
                  style={{ color: "inherit", fontWeight: 700, ...clip }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  style={{ color: "inherit", textDecoration: "none", ...clip }}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
