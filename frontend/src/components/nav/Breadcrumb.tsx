/**
 * THE SITE'S ONE BREADCRUMB (#2102).
 *
 * A breadcrumb is neutral SITE CHROME, not part of the faction surface. It is
 * the one thing on the page that is not about the faction: a player moving
 * between a Coven task and a Singularity task should find the trail in the same
 * place, looking the same, reading the same words. So this is ONE component
 * with no skin, no dispatch and no `--faction-*` token — the site's own tertiary
 * ink on the site's own ground, which is also the only ground it is ever
 * measured on.
 *
 * It replaces eighteen hand-rolled copies. `taskDetail` and `praxisDetail` each
 * had nine, and because nobody owned them they had drifted apart on every axis
 * the issue named: position (above the sheet / inside it / inside a window
 * title bar), separator (`·` / `/` / `›` / none), colour (eight faction accents)
 * and link behaviour (the task-detail crumb was a lone `Tasks` link with no
 * trail; the praxis-detail one turned into a bespoke `mobileBar` below 768px).
 * The basis is the composer's `Breadcrumb`, which was the one implementation
 * that already behaved correctly, promoted out of
 * `pages/editPraxis/archetypes/shared.tsx` to a shared home.
 *
 * AND IT HAS TO BE ABLE TO SAY EVERY TRAIL, or the rules below are unkeepable
 * (#2973). The trail was built from a `taskId` + `taskTitle`, so `Propose a
 * Task` — the one page under `Tasks` where no task exists yet — could not be
 * expressed here at all. Eight propose surfaces each hit that wall separately
 * and hand-rolled a `<nav>` apiece, drifting back onto the same axes within
 * weeks: one inside the sheet, two on `--label-ink`, one on a `--faction-*`
 * token. A rule a caller cannot obey is a rule that gets broken, so
 * {@link CurrentTrailProps} closes it.
 *
 * ### Three rules it enforces rather than offers
 *
 * 1. **Every level is a real link except the current page.** "Clicking Tasks
 *    does nothing" was the report's first complaint and it is a bug in any
 *    design. The last crumb is the only non-link, and it carries
 *    `aria-current="page"` — that, plus the `<nav>` landmark's accessible name,
 *    is the whole a11y contract.
 * 2. **It sits ABOVE the faction surface**, outside the card/column. Callers
 *    mount it as the first child of the page root, never inside the sheet.
 * 3. **ONE component for both form factors.** There is no `useFormFactor()` call
 *    here and no breakpoint: a navigation control that becomes a different
 *    control at 768px is the same defect this issue is about. The narrow case is
 *    handled by {@link shrinkIndex} + flexbox instead, which degrades
 *    continuously rather than at a threshold.
 *
 * ### Why the column width lives here
 *
 * `maxWidth: 1200` is every detail page's own column, restated once so that
 * seventeen call sites need no wrapper `<div>`. The composer nests this inside
 * `ComposerPage`'s narrower 720 column, where the cap is simply inert.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface Crumb {
  /** What the crumb reads — and, always, its full accessible name. */
  label: string;
  /** Absent on the LAST crumb: you are already there. */
  to?: string;
}

/**
 * WHICH CRUMB GIVES WAY WHEN THE TRAIL IS WIDER THAN THE BAR.
 *
 * On a 375px phone the full trail fits only for short names; a long task title
 * will not, and truncation is therefore the common case on mobile rather than
 * the exception. The rule is: keep the first crumb and the last, and ellipsise
 * the middle one — the longest middle one, since that is the crumb actually
 * costing the width. Only ONE crumb ever shrinks, so a short `Praxis` sitting
 * next to a long title never reads as `Prax…`.
 *
 * Two crumbs is the degenerate case: `Tasks › <task title>` has no middle, and
 * the last crumb is the only thing that can give. Dropping it instead is not
 * available — that would leave a trail with no destination.
 *
 * The crumb is CLIPPED, not rewritten: the full label stays in the DOM, so a
 * screen reader still reads the whole title and the accessible name survives the
 * truncation. Nothing here measures a box; the ellipsis is `text-overflow` and
 * fires only when flexbox has actually had to shrink the crumb.
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
  /** The task all three of these surfaces hang off. */
  taskId: number;
  taskTitle: string;
  /** Present on the two praxis surfaces; absent on a task detail. */
  praxisId?: number | string;
  /** The composer: the trail runs one step past the praxis. */
  editing?: boolean;
  current?: never;
}

/**
 * A PAGE UNDER `Tasks` THAT IS NOT A TASK (#2973).
 *
 * `Propose a Task` is one: the task does not exist yet — proposing it is the
 * point — so there is no id to hang the second crumb on and no title to read.
 * That is the whole reason eight propose surfaces hand-rolled a `<nav>` apiece
 * and drifted straight back onto #2102's axes. The trail is `Tasks › <current>`,
 * two crumbs, and the second is the page you are already on, so it is never a
 * link and needs no destination.
 *
 * A UNION RATHER THAN THREE OPTIONAL PROPS: a caller supplies a task or a
 * current label, never both and never neither, and `taskTitle` stays required on
 * the seventeen surfaces that do have a task.
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
