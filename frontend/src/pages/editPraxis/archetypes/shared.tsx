/**
 * The composer's shared presentational layer.
 *
 * One generation now. A pre-v2 set (`RainbowTitle`, `RainbowUnderline`,
 * `TaskMetaInline`, `ArchetypeFrame`, `formatClock`) lived above the banner
 * comment for as long as an un-rebuilt archetype still read it; the last reader
 * was the undressed waiting surface, and #1189 dressed it. They are deleted
 * rather than kept warm — a helper with no caller is paid for by every sweep
 * that has to decide whether it is load-bearing.
 *
 * What is left is THE COMPOSER LAYOUT CONTRACT (#1181, ADR-0065) — the blocks
 * every v2 skin assembles, plus the {@link ComposerDress} that hands a skin's
 * ornament to the one surface that is shared rather than per-faction (#1189).
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { collabCopy } from "../../../components/collab/collabCopy";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisOut } from "../../../api/praxis";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface BreadcrumbProps {
  praxisId: number | string;
  taskId: number;
  taskTitle: string;
  style?: CSSProperties;
  inkColor?: string;
}

export function Breadcrumb({
  praxisId,
  taskId,
  taskTitle,
  style,
  inkColor,
}: BreadcrumbProps) {
  const { t } = useTranslation("forms");
  const tone = inkColor ?? "var(--color-text-tertiary)";
  return (
    <nav
      className="font-body"
      style={{
        fontSize: "var(--text-sm)",
        letterSpacing: "0.1em",
        color: tone,
        marginBottom: "var(--space-md)",
        ...style,
      }}
    >
      <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
        {t("breadcrumb.tasks")}
      </Link>
      <span> &rsaquo; </span>
      <Link
        to={`/tasks/${taskId}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {taskTitle}
      </Link>
      <span> &rsaquo; </span>
      <Link
        to={`/praxis/${praxisId}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {t("breadcrumb.praxis")}
      </Link>
      <span> &rsaquo; </span>
      <span style={{ color: "inherit", fontWeight: 700 }}>
        {t("breadcrumb.edit")}
      </span>
    </nav>
  );
}

interface TitleCounterProps {
  length: number;
  color?: string;
}

export function TitleCounter({ length, color }: TitleCounterProps) {
  const isDanger = length >= 180;
  return (
    <span
      className="label-caption"
      // The neutral fallback went with `.eyebrow`: `.label-caption` paints
      // `--label-ink`, which IS the tertiary unset, so restating it here would
      // only stop a frame that repoints the seam from reaching this counter.
      style={{ color: isDanger ? "var(--color-danger)" : color }}
    >
      {length}/200
    </span>
  );
}

interface ErrorBannerProps {
  message: string;
  /**
   * The skin's dress for the banner — in practice its alarm INK (#1231).
   *
   * The danger hues themselves stay neutral: ADR-0061 says danger is the
   * platform speaking, not a faction, so the `-veil` wash and the `-edge` rule
   * are #1169's global rungs on every skin. What is faction-aware is the GROUND
   * the banner is drawn against — this banner sits in the composer's content
   * column, i.e. straight on the skin's sheet — and therefore which ink clears
   * on it. That is §3's "same ink, second ground", not a faction danger colour.
   *
   * It matters because the neutral ink misses AA on ALL EIGHT composer sheets
   * in light: `--color-danger` under its own veil measures 3.31:1 (Ephemerists)
   * to 4.41:1 (na). Dark was never the miss (4.80–5.97). Seven skins pass their
   * existing `--faction-{key}-card-alarm` (#1449) and mint nothing; S.N.I.D.E.
   * is the one exception and the reason is §6 — its CARD is photocopier-black
   * in both themes, so `--faction-snide-card-alarm` is pinned bright and reads
   * 1.56:1 on the composer's light xerox stock, while the composer's sheet
   * flips. It passes `--faction-snide-composer-alarm` instead.
   *
   * Optional, and a skin that passes nothing renders byte-identically to what
   * this banner painted before (#1153's rule).
   */
  style?: CSSProperties;
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className="font-body"
      style={{
        fontSize: "var(--text-md)",
        color: "var(--color-danger)",
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-danger-veil)",
        border: "1px solid var(--color-danger-edge)",
        ...style,
      }}
    >
      {message}
    </div>
  );
}

export function formatAutosave(date: Date | null): string {
  if (!date) return "";
  const now = Date.now();
  const ago = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (ago < 5) return i18n.t("forms:autosaveAgo.justNow");
  if (ago < 60) return i18n.t("forms:autosaveAgo.seconds", { seconds: ago });
  const minutes = Math.round(ago / 60);
  return i18n.t("forms:autosaveAgo.minutes", { minutes });
}

/**
 * The stage word in the status row's first slot.
 *
 * `Draft` while you are writing; `Sealed` on a duel side you have filed;
 * `Submitted` on anything else that is in. Shared rather than inlined at the one
 * call site because SNIDE draws the same word in its MASTHEAD, and a masthead
 * still shouting DRAFT over a submitted praxis would be the page contradicting
 * itself — the exact failure the dress exists to prevent.
 *
 * The completed reading takes the collab block's own word, which says
 * `Submitted` rather than `Submitted by you`: a lapsed window publishes over a
 * holdout (ADR-0012), and that holdout reads this same line.
 */
export function composerStageWord(state: EditPraxisState): string {
  if (!isWaitingStage(state.phase)) {
    return i18n.t("forms:editPraxis.composer.statusDraft");
  }
  if (state.phase === "completed") {
    return collabCopy(state.praxis?.task_faction_slug, "completedStatusMeta");
  }
  // A duel side is `type='solo'` + a duel_id (ADR-0011) — never `type`.
  const isDuel = state.praxis?.duel_id != null && state.duel != null;
  return i18n.t(
    isDuel
      ? "forms:editPraxis.composer.statusSealed"
      : "forms:editPraxis.composer.statusSubmitted",
  );
}

/* ========================================================================== *
 * THE COMPOSER LAYOUT CONTRACT (#1181, epic #1179, ADR-0065)
 *
 * The shared layout the v2 designs draw, factored out ONCE so the seven skin
 * issues (#1182-#1188) inherit it instead of each re-deriving it — and so a
 * change to the layout is one edit rather than eight.
 *
 * The split of responsibilities is ADR-0065's: the LAYOUT and the API are
 * shared; only DRESS changes. A skin brings frame, type, ornament and motion. It
 * does not fork a control, does not change what the composer submits, and does
 * not vary the order or presence of the layout's regions:
 *
 *   masthead → status row → the task slip → title → how it was done →
 *   mode block (roster or duel pair) → write-up → proof → footer
 *
 * Every block below takes an optional `style` (and, where there is more than one
 * painted part, one optional style per part). That is deliberately generous:
 * seven agents build on this in parallel, and a hook that is missing here
 * becomes seven conflicting edits to this file. Prefer adding an optional prop
 * over forking a block.
 *
 * MOTION. The seven ep* keyframes live in `index.css` behind the shared
 * `prefers-reduced-motion` guard and are reached by CLASS (`ep-edge`,
 * `ep-drift`, `ep-spin`, …). Nothing here writes an inline `animation:` — that
 * bypasses the guard, which is what #1003 retired.
 * ========================================================================== */

export interface ComposerSizes {
  /** Column width. Desktop pins the design's 720; mobile fills the phone. */
  maxWidth: number | string;
  /** Sheet padding, from the --space-* scale. */
  padding: string;
  /** Vertical rhythm between the layout's regions. */
  gap: string;
  /** The composer's own heading tier. */
  titleSize: string;
  /** True on a phone — for conditional ornament, never for a second layout. */
  isMobile: boolean;
}

/**
 * The design's SIZES table, as one responsive hook (ADR-0065 §2).
 *
 * There is no mobile twin: an archetype calls this and lays out ONE tree at two
 * sizes. Mobile stacks with flow and never a fixed-px grid
 * (SPEC-faction-ui-profile §1a), so the design's 360 canvas width becomes "as
 * wide as the phone" rather than a hard 360 — a fixed width there would be the
 * mobile-twin thinking the ADR retired, wearing a number instead of a file.
 */
export function useComposerSizes(): ComposerSizes {
  const isMobile = useFormFactor() === "mobile";
  return isMobile
    ? {
        maxWidth: "100%",
        padding: "var(--space-lg) var(--space-lg) var(--space-xl)",
        gap: "var(--space-lg)",
        // design 23px → the 24px rung.
        titleSize: "var(--text-title)",
        isMobile: true,
      }
    : {
        maxWidth: 720,
        padding: "var(--space-xl) var(--space-2xl) var(--space-2xl)",
        gap: "var(--space-xl)",
        // design 29px → the 32px rung. A --text-* token names a TIER, and the
        // composer's heading is the same tier as every other page heading.
        titleSize: "var(--text-heading)",
        isMobile: false,
      };
}

/**
 * The composer's LABEL tier: uppercase, letter-spaced, scanned not read (§4).
 *
 * The design pins the geometry (uppercase, 0.14em, 12px) and leaves the face and
 * colour to the skin, which is exactly the split this helper makes — pass your
 * own font and ink, inherit the tracking. 12px is the --text-lg rung; a label is
 * chrome, so the content floor does not apply to it (§4a).
 */
export function composerLabelStyle(
  overrides: CSSProperties = {},
): CSSProperties {
  return {
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-lg)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    lineHeight: 1.2,
    ...overrides,
  };
}

interface ComposerSheetProps {
  /** Full-bleed top chrome. Drawn flush to the sheet's edges, above the ground. */
  masthead?: ReactNode;
  /** Ambient backdrop. Clipped to the SHEET — see the overflow note below. */
  ground?: ReactNode;
  children: ReactNode;
  /** The page wrapper around the centred column. */
  pageStyle?: CSSProperties;
  /** The sheet itself: ground, border, radius, shadow. */
  style?: CSSProperties;
  /** The padded content column inside the sheet. */
  contentStyle?: CSSProperties;
  sizes: ComposerSizes;
}

/**
 * The composer's frame: a centred column holding one sheet.
 *
 * The sheet is `position: relative; overflow: hidden`, which is load-bearing
 * twice over. It clips the masthead's full-bleed band to the sheet's rounded
 * corners, and it clips the GROUND to the component — the site background still
 * shows around the column, and an ornament layer at a negative inset can never
 * paint the viewport. That is the owner ruling from #1028, which six of eight
 * task-detail skins got wrong by painting their faction ground full-bleed; the
 * clip lives here so no composer skin can repeat it.
 *
 * The content column owns the vertical rhythm (`gap`), so a region never sets
 * its own bottom margin and the spacing cannot drift between skins.
 */
export function ComposerSheet({
  masthead,
  ground,
  children,
  pageStyle,
  style,
  contentStyle,
  sizes,
}: ComposerSheetProps) {
  return (
    <div
      style={{
        padding: sizes.isMobile
          ? "var(--space-lg) var(--space-md) var(--space-3xl)"
          : "var(--space-2xl) var(--space-lg) var(--space-4xl)",
        ...pageStyle,
      }}
    >
      <div style={{ maxWidth: sizes.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 10,
            ...style,
          }}
        >
          {ground}
          {masthead}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: sizes.gap,
              padding: sizes.padding,
              ...contentStyle,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComposerMastheadProps {
  /** The band's paint — a gradient token, a colour, whatever the skin brings. */
  background?: string;
  /** Design default is a 3px hairline band. */
  height?: number;
  /**
   * Run epEdge on the band: the paint walks one full width and loops. The caller
   * must give a background cut to tile (the spectrum's *-loop ramp); this sets
   * the 300% size the keyframe travels.
   */
  animated?: boolean;
  style?: CSSProperties;
  /** Anything the skin draws ON the band — dots, a caption, a cornice. */
  children?: ReactNode;
}

/**
 * The top chrome band. Full-bleed by construction: it is the sheet's first
 * child and the sheet clips it, so a skin never positions it.
 *
 * Purely decorative — `aria-hidden`, because a masthead that announced itself
 * would put a faction's ornament ahead of the page's first real content in every
 * screen reader. A skin that needs the band to SAY something puts that in
 * `children`, which un-hides it.
 */
export function ComposerMasthead({
  background,
  height = 3,
  animated = false,
  style,
  children,
}: ComposerMastheadProps) {
  return (
    <div
      aria-hidden={children ? undefined : true}
      className={animated ? "ep-edge" : undefined}
      style={{
        position: "relative",
        zIndex: 2,
        height,
        background,
        backgroundSize: animated ? "300% 100%" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface ComposerGroundProps {
  /** The wash itself — a gradient token. */
  background?: string;
  opacity?: number | string;
  filter?: string;
  /**
   * Typed `string`, not CSSProperties["mixBlendMode"], on purpose: the blend
   * mode flips with the theme, so it arrives as a `var()` and React's union of
   * literal keywords rejects one. Applied through a cast below — the value still
   * comes from a token, which is the rule that matters (WORLD_ZERO_STYLE §2).
   */
  mixBlendMode?: string;
  /**
   * How far the layer overhangs the sheet. Negative by design: a drifting layer
   * that stopped at the sheet's edge would expose unpainted corners mid-cycle.
   */
  inset?: number | string;
  /** Run epDrift — the slow 46s wander the spectrum ground takes. */
  animated?: boolean;
  style?: CSSProperties;
  /** SVG, tiles, glyphs — whatever a faction's ground is made of. */
  children?: ReactNode;
}

/**
 * The ambient backdrop, mounted inside the sheet and clipped by it.
 *
 * `pointer-events: none` so the wash never eats a click meant for a field, and
 * `aria-hidden` because it is texture. It sits at zIndex 0, under the content
 * column's zIndex 1.
 */
export function ComposerGround({
  background,
  opacity,
  filter,
  mixBlendMode,
  inset = "-30%",
  animated = false,
  style,
  children,
}: ComposerGroundProps) {
  return (
    <div
      aria-hidden
      className={animated ? "ep-drift" : undefined}
      style={{
        position: "absolute",
        inset,
        zIndex: 0,
        pointerEvents: "none",
        background,
        opacity,
        filter,
        ...({ mixBlendMode } as CSSProperties),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface ComposerRuleProps {
  style?: CSSProperties;
  /** A skin whose divider is a drawn thing (a braid, a zigzag) passes it here. */
  children?: ReactNode;
}

/**
 * The section divider. A 1px hairline by default; a skin either restyles it or
 * replaces it wholesale with `children`.
 */
export function ComposerRule({ style, children }: ComposerRuleProps) {
  if (children) return <div aria-hidden>{children}</div>;
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: "var(--faction-default-composer-hair)",
        ...style,
      }}
    />
  );
}

interface ComposerStatusRowProps {
  /** The stage word — Draft, and later Submitted. */
  status: ReactNode;
  /** The autosave line beside it. */
  meta?: ReactNode;
  /** The faction's status mark, drawn at the end of the row. */
  mark?: ReactNode;
  style?: CSSProperties;
  statusStyle?: CSSProperties;
  metaStyle?: CSSProperties;
}

/** Draft · Saved just now, with the skin's status mark at the end. */
export function ComposerStatusRow({
  status,
  meta,
  mark,
  style,
  statusStyle,
  metaStyle,
}: ComposerStatusRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        flexWrap: "wrap",
        ...style,
      }}
    >
      <span style={composerLabelStyle(statusStyle)}>{status}</span>
      {meta != null && <span style={composerLabelStyle(metaStyle)}>{meta}</span>}
      {mark != null && <span style={{ marginLeft: "auto" }}>{mark}</span>}
    </div>
  );
}

interface ComposerSectionProps {
  /**
   * Optional since #1416: a region whose control names itself draws no heading
   * row at all, rather than an empty one that still spends its margins. The
   * collab roster is the live case — it grew its own `Collaborators · N` header
   * beside the tally, so nine mounts stopped passing a label rather than
   * printing the count twice and letting the two disagree.
   */
  label?: ReactNode;
  /** The right-hand end of the label row — a counter, a word count, a hint. */
  meta?: ReactNode;
  /**
   * Make the label a real <label> for the control this section holds. Pass the
   * same string as the control's `id` and the field gets an accessible name
   * without a second visually-hidden node.
   */
  htmlFor?: string;
  /** Drawn above the label. Pass `false` for the first section on the sheet. */
  rule?: ReactNode | false;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  metaStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * One labelled region: rule, then a label row, then the control.
 *
 * The rule is the section's OWN, not the previous one's, so a skin can drop the
 * first section's rule (`rule={false}`) without every following section shifting
 * — which is what a borderBottom on the region above would have done.
 */
export function ComposerSection({
  label,
  meta,
  htmlFor,
  rule,
  style,
  labelStyle,
  metaStyle,
  children,
}: ComposerSectionProps) {
  const heading = composerLabelStyle(labelStyle);
  // No label and no meta means no heading row. The rule above it still draws:
  // it separates the regions, and that is not the label's job — but the rule
  // carries no margin of its own (the heading row was supplying the whole gap),
  // so an unheaded section stands the control off the hairline itself.
  const headed = label != null || meta != null;
  return (
    <section style={style}>
      {rule === false ? null : (rule ?? <ComposerRule />)}
      {!headed && rule !== false && (
        <div aria-hidden style={{ height: "var(--space-lg)" }} />
      )}
      {headed && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-md)",
            margin:
              rule === false
                ? "0 0 var(--space-md)"
                : "var(--space-lg) 0 var(--space-md)",
          }}
        >
          {htmlFor ? (
            <label htmlFor={htmlFor} style={heading}>
              {label}
            </label>
          ) : (
            <span style={heading}>{label}</span>
          )}
          {meta != null && (
            <span
              style={composerLabelStyle({ letterSpacing: "0.06em", ...metaStyle })}
            >
              {meta}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

interface RingMarkProps {
  /** Outer diameter. The design draws 84 for points and 44 for status. */
  size: number;
  /** How far the punched-out centre sits inside the ring. */
  inset: number;
  /** The ring's paint — a conic gradient token. */
  ring: string;
  /** The centre's paint. Usually the sheet or the field, so a ring reads as a ring. */
  inner: string;
  /** Turn the ring on epSpin. */
  spin?: boolean;
  /** Re-time the spin without a second keyframe (the --ep-spin-dur hook). */
  spinDuration?: string;
  /** Ring opacity — the design draws the spectrum ring at .9. */
  ringOpacity?: number;
  style?: CSSProperties;
  innerStyle?: CSSProperties;
  /** What sits over the punched centre — the number, a glyph, a status word. */
  children?: ReactNode;
}

/**
 * A ring with its middle punched out and content centred over it — the geometry
 * behind BOTH the points mark and the status mark.
 *
 * Shared because the geometry is the layout's, not the faction's: every design
 * draws a mark of this shape at these two sizes and changes only what the ring
 * is made of. A skin passes its own `ring` and `inner`; the sizes, the punch and
 * the centring are the same everywhere.
 */
export function RingMark({
  size,
  inset,
  ring,
  inner,
  spin = false,
  spinDuration,
  ringOpacity,
  style,
  innerStyle,
  children,
}: RingMarkProps) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        aria-hidden
        className={spin ? "ep-spin" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: ring,
          opacity: ringOpacity,
          ...(spinDuration
            ? ({ "--ep-spin-dur": spinDuration } as CSSProperties)
            : {}),
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset,
          borderRadius: "50%",
          background: inner,
          ...innerStyle,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface TaskSlipProps {
  praxis: PraxisOut;
  task: TaskOut | null;
  /** The faction's points mark, drawn at the slip's end. */
  mark?: ReactNode;
  /**
   * The slip's eyebrow. Defaults to the composer's neutral `The task`; the
   * waiting surface passes `The duel` when the slip is fronting a duel, which
   * is the one place the same slip refers to something other than a task.
   */
  label?: ReactNode;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  descriptionStyle?: CSSProperties;
  pillStyle?: CSSProperties;
}

/**
 * The task reference slip: what you are filing against.
 *
 * Read-only, and the composer's only piece of borrowed content — the title and
 * description belong to the TASK, so they read at the content floor (§4) rather
 * than at whatever size the slip's chrome uses. Copy is the neutral composer.*
 * set; a skin brings the frame and the mark and no words (ADR-0065 §3).
 */
export function TaskSlip({
  praxis,
  task,
  mark,
  label,
  style,
  labelStyle,
  titleStyle,
  descriptionStyle,
  pillStyle,
}: TaskSlipProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-lg)",
        alignItems: "flex-start",
        ...style,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={composerLabelStyle(labelStyle)}>
          {label ?? t("editPraxis.composer.taskLabel")}
        </div>
        <div
          style={{
            fontSize: "var(--text-content)",
            lineHeight: 1.25,
            marginTop: "var(--space-sm)",
            overflowWrap: "anywhere",
            ...titleStyle,
          }}
        >
          {/* The title is the task, so it goes where the breadcrumb already
              goes (#1705) — it is the line a player actually reads and tries
              to click. The link sits INSIDE the styled box rather than
              replacing it: `titleStyle` is the skin's dress (ADR-0065) and
              every one of the eight sets a face and an ink, so the anchor
              inherits it whole instead of racing it. Leaving the page is safe
              — the composer autosaves, so no confirm belongs here. The
              affordance is the hover underline, the same one the praxis card's
              task link uses; a colour would be the skin's to give, not this
              component's. */}
          <Link
            to={`/tasks/${praxis.task_id}`}
            className="hover:underline"
            style={{ color: "inherit" }}
          >
            {praxis.task_title}
          </Link>
        </div>
        {task != null && (
          <div
            style={composerLabelStyle({
              display: "inline-block",
              marginTop: "var(--space-sm)",
              padding: "var(--space-xs) var(--space-sm)",
              border: "1px solid currentColor",
              borderRadius: 999,
              ...pillStyle,
            })}
          >
            {t("editPraxis.composer.levelLabel", { level: task.level_required })}
          </div>
        )}
        {task?.description && (
          <p
            style={{
              // The task's own prose: content, so the floor governs it (§4).
              fontSize: "var(--text-content)",
              lineHeight: 1.55,
              margin: "var(--space-sm) 0 0",
              ...descriptionStyle,
            }}
          >
            {task.description}
          </p>
        )}
      </div>
      {mark}
    </div>
  );
}

interface ComposerFooterProps {
  /**
   * The leaving end. [Cancel] … [Submit] is the global order settled in #646, so
   * save-draft / drop / leave go here and the cast goes in `end` — never the
   * other way round, on any skin.
   */
  start?: ReactNode;
  end: ReactNode;
  style?: CSSProperties;
}

/** The footer bar: exits at the start, the cast at the end (#646). */
export function ComposerFooter({ start, end, style }: ComposerFooterProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-lg)",
        flexWrap: "wrap",
        ...style,
      }}
    >
      {start}
      <div style={{ flex: 1 }} />
      {end}
    </div>
  );
}

interface ComposerPageProps {
  sizes: ComposerSizes;
  /** The skin's root: its body face and its ink. */
  style?: CSSProperties;
  /** Drawn in a column of the sheet's own width, above the sheet. */
  breadcrumb?: ReactNode;
  children: ReactNode;
}

/**
 * The page around the sheet: the skin's face and ink, and a breadcrumb sitting
 * in the sheet's own column above it.
 *
 * All eight archetypes had spelled this block out identically, and #1189 needed
 * a ninth copy for the waiting surface — so it is one block now. The geometry is
 * shared and the paint is the skin's, which is the same split every other block
 * on this page makes.
 *
 * The breadcrumb belongs to the PAGE rather than to a stage: the composer and
 * the waiting surface each draw exactly one, which is what keeps the dispatcher
 * out of the business of drawing a second (#567, #1181).
 */
export function ComposerPage({
  sizes,
  style,
  breadcrumb,
  children,
}: ComposerPageProps) {
  return (
    <div style={style}>
      {breadcrumb != null && (
        <div
          style={{
            maxWidth: sizes.maxWidth,
            margin: "0 auto",
            padding: "var(--space-lg) var(--space-lg) 0",
          }}
        >
          {breadcrumb}
        </div>
      )}
      {children}
    </div>
  );
}

/* ========================================================================== *
 * THE DRESS (#1189, epic #1179, ADR-0065)
 *
 * The composer holds after you submit (ADR-0059), and what it becomes is
 * `PraxisWaitingSurface` — ONE shared surface holding all of the post-cast
 * logic. #1071 shipped it faction-neutral and deferred the frames by name; this
 * is the seam that closes that.
 *
 * A dress is the faction's own ornament, handed to that shared surface by the
 * archetype that is already mounted. It is deliberately NOT a registry:
 *
 *  - Nothing new dispatches. `EditPraxis.tsx` resolves ONE component per slug
 *    (`surfaceMap('editPraxis')`), and that component decides which stage it is
 *    drawing — which is exactly how the design is authored, as one component
 *    taking a `stage` prop.
 *  - Nothing new is imported eagerly. Archetypes are lazy (#1045); a slug-keyed
 *    map of eight dresses would be a barrel, and a barrel over the archetypes is
 *    the 420 KB entry chunk that issue existed to delete.
 *  - Nothing can drift. The `masthead`, `ground` and `rule` a dress carries are
 *    the SAME ELEMENTS the archetype mounts in its composer — named once and
 *    passed to both — so the page cannot change dress the moment you submit.
 *
 * Every field is optional except the accent, and the surface degrades to the
 * page's own tokens for anything a skin leaves out.
 * ========================================================================== */

export interface ComposerDress {
  /** The one colour the surface leans on for marks, rings and headings. */
  accent: string;
  /**
   * The skin's alarm ink, measured on ITS OWN sheet under `--color-danger-veil`
   * (#1231). Carried on the dress for the same reason the masthead and the
   * ground are: the waiting surface mounts the same {@link ErrorBanner} on the
   * same stock, so the pairing must not change the moment you press Submit.
   * Omit it and the banner keeps the neutral `--color-danger`.
   */
  alarm?: string;
  /** The skin's root style — its body face and ink. */
  pageStyle?: CSSProperties;
  /** The breadcrumb's ink, where the skin tints it. */
  breadcrumbInk?: string;
  /** The sheet's paint, border, radius and shadow. */
  sheetStyle?: CSSProperties;
  /** The sheet's content column, where a skin overrides its inset. */
  contentStyle?: CSSProperties;
  /** The masthead ELEMENT the composer mounts, not a copy of it. */
  masthead?: ReactNode;
  /** The ground ELEMENT the composer mounts, not a copy of it. */
  ground?: ReactNode;
  /**
   * The section divider, as this skin draws it.
   *
   * A factory rather than an element because a divider can be a drawn thing
   * with its own SVG defs — WOW's zigzag carries a per-instance gradient id —
   * and the surface draws three of them. The `key` is that instance name.
   */
  rule?: (key: string) => ReactNode;
  /** The status mark, exactly as the composer draws it in its status row. */
  mark?: ReactNode;
  /** The status row's stage word. */
  statusStyle?: CSSProperties;
  /** The status row's second line. */
  metaStyle?: CSSProperties;
  /** Section labels. */
  labelStyle?: CSSProperties;
  /** The task slip's dress, minus what the slip is about. */
  slip?: Omit<TaskSlipProps, "praxis" | "task" | "mark" | "label">;
  /** An inset panel: the skin's field ground, border and radius. */
  panelStyle?: CSSProperties;
  /** The confirmation beat's heading. */
  headingStyle?: CSSProperties;
  /** The surface's own sentences. */
  bodyStyle?: CSSProperties;
  /** Captions and the quieter half of a line. */
  quietStyle?: CSSProperties;
  /** The affirmative control — the way back into your own text. */
  primaryStyle?: CSSProperties;
  /** A quiet text button: leave, and the nudge. */
  quietButtonStyle?: CSSProperties;
}
