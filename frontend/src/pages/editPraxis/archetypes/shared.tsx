/**
 * The composer's shared presentational layer: the layout contract (#1181,
 * ADR-0065) every skin assembles, plus {@link ComposerDress} (#1189).
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { collabCopy } from "../../../components/collab/collabCopy";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisOut } from "../../../api/praxis";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import { useStrayFileDropGuard } from "../strayFileDrop";

interface ErrorBannerProps {
  message: string;
  /**
   * The skin's alarm INK for its sheet (#1231). Danger hues stay neutral
   * (ADR-0061); only the ink varies, because `--color-danger` misses AA on every
   * composer sheet in light.
   */
  style?: CSSProperties;
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      // No `<form>`, so no native validation message; announce it (#2179).
      role="alert"
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
 * The status row's stage word: `Draft` or `Submitted`. Shared because SNIDE's
 * masthead draws it too. Completed uses the collab word (not "by you"): a
 * lapsed window publishes over a holdout (ADR-0012).
 */
export function composerStageWord(
  state: Pick<EditPraxisState, "phase" | "praxis">,
): string {
  if (!isWaitingStage(state.phase)) {
    return i18n.t("forms:editPraxis.composer.statusDraft");
  }
  if (state.phase === "completed") {
    return collabCopy(state.praxis?.task_faction_slug, "completedStatusMeta");
  }
  return i18n.t("forms:editPraxis.composer.statusSubmitted");
}

/* THE COMPOSER LAYOUT CONTRACT (#1181, ADR-0065). Layout and API are shared;
 * skins change only dress, never region order or presence:
 *
 *   masthead → status row → the task slip → title → how it was done →
 *   mode block (roster or duel pair) → write-up → proof → footer
 *
 * Prefer adding an optional style prop over forking a block. Motion is by
 * class (`ep-*` in index.css, behind reduced-motion); never inline `animation:`. */

interface ComposerSizes {
  /** Column width. Desktop pins the design's 720; mobile fills the phone. */
  maxWidth: number | string;
  /** Sheet padding, from the --space-* scale. */
  padding: string;
  /** Side inset, split out so the full-bleed band can negate it (#1828). */
  padX: string;
  /** The sheet's bottom inset — the other half the band negates. */
  padBottom: string;
  /** Vertical rhythm between the layout's regions. */
  gap: string;
  /** The composer's own heading tier. */
  titleSize: string;
  /**
   * Masthead floor for `reserveHead` surfaces (#2995): one number so live-reskin
   * pickers don't jump under the pointer. The TALLEST kit head (Ephemerists' band
   * + cornice); a min, so a taller kit raises the ceiling. Raw geometry (§4a).
   */
  headHeight: number;
  /**
   * Heading floor, the second term of the same offset (#2995 part 2), spent by
   * {@link ComposerHeading}. Desktop: WOW's balloon row (47.5). Phone: WOW's row
   * wraps (32 + 12 gap + 37.5 = 81.5); also covers a two-line h1 beside a 44px
   * mark. A three-line heading would exceed it (eyeball item).
   */
  headingHeight: number;
  /** True on a phone — for conditional ornament, never for a second layout. */
  isMobile: boolean;
}

/**
 * Reserved heights per form factor (#2995). Head: Ephemerists' sky band
 * (84/68) + 12 cornice. Heading: see `headingHeight`. Always round UP.
 */
const RESERVED_HEAD = { desktop: 96, mobile: 80 };
const RESERVED_HEADING = { desktop: 48, mobile: 82 };

/**
 * The design's SIZES table (ADR-0065 §2): one tree at two sizes, no mobile twin.
 * Mobile fills the phone rather than a fixed 360 (SPEC-faction-ui-profile §1a).
 */
export function useComposerSizes(): ComposerSizes {
  const isMobile = useFormFactor() === "mobile";
  return isMobile
    ? {
        maxWidth: "100%",
        padding: "var(--space-lg) var(--space-lg) var(--space-xl)",
        padX: "var(--space-lg)",
        padBottom: "var(--space-xl)",
        gap: "var(--space-lg)",
        // design 23px → the 24px rung.
        titleSize: "var(--text-title)",
        headHeight: RESERVED_HEAD.mobile,
        headingHeight: RESERVED_HEADING.mobile,
        isMobile: true,
      }
    : {
        maxWidth: 720,
        padding: "var(--space-xl) var(--space-2xl) var(--space-2xl)",
        padX: "var(--space-2xl)",
        padBottom: "var(--space-2xl)",
        gap: "var(--space-xl)",
        // design 29px → the 32px rung (same tier as every page heading).
        titleSize: "var(--text-heading)",
        headHeight: RESERVED_HEAD.desktop,
        headingHeight: RESERVED_HEADING.desktop,
        isMobile: false,
      };
}

/**
 * The composer's LABEL tier (§4): uppercase, 0.14em, --text-lg. Face and ink are
 * the skin's. Every value is a default; `overrides` wins (#1828).
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

/**
 * Right-hand cluster of a label row (`saved … · [Write|Preview]`, #1828). It
 * wraps: faction label metrics don't fit a phone header on one line.
 */
export const composerMetaCluster: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "var(--space-md)",
  rowGap: "var(--space-sm)",
  flexWrap: "wrap",
  flex: "1 1 auto",
  minWidth: 0,
};

/** Proof drop zone ground: the skin's field at 42%, so ornament reads through (#1828). */
export function composerDropGround(field: string): string {
  return `color-mix(in srgb, ${field} 42%, transparent)`;
}

interface ComposerBand {
  /**
   * CTA fill, or CAST paint once filed (the archetype decides). Omit only when a
   * class on the button supplies it (Ephemerists, #2146): inline would beat it.
   */
  background?: string;
  /** The ink on that fill. See {@link ComposerBand.background} on omitting it. */
  color?: string;
  /** The SHEET's frame (not the fields'), for the 1.5px top rule. */
  frame: string;
  /** The band's face. Several skins speak their TITLE face here, not the label one. */
  fontFamily?: string;
  /** The band's tier on the --text-* ramp. Defaults to the label rung. */
  fontSize?: string;
  fontWeight?: number;
  letterSpacing?: string;
  /** A skin whose CTA carries a glow (the Singularity's, in dark). */
  boxShadow?: string;
  /**
   * Weld to the sheet's bottom edge too (default true). `false` when something
   * follows the band (Everymen's stub, #2991), else it is dragged up over it.
   */
  weldBottom?: boolean;
}

/**
 * The FULL-BLEED SUBMIT BAND (#1828), negating {@link ComposerSizes}'s insets.
 * Pass as `PublishButton`'s `style`, mount via `<ComposerFooter band>`. na and
 * Albescent keep the inline button (owner ruling on #1828).
 */
export function composerBandStyle(
  sizes: ComposerSizes,
  band: ComposerBand,
): CSSProperties {
  return composerLabelStyle({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    // No top margin: the footer's gap spaces it.
    margin:
      band.weldBottom === false
        ? `0 calc(-1 * ${sizes.padX})`
        : `0 calc(-1 * ${sizes.padX}) calc(-1 * ${sizes.padBottom})`,
    padding: "var(--space-lg) var(--space-xl)",
    border: "none",
    borderRadius: 0,
    borderTop: `1.5px solid ${band.frame}`,
    background: band.background,
    color: band.color,
    boxShadow: band.boxShadow,
    // `??`: an undefined key in `overrides` would erase the label default.
    fontFamily: band.fontFamily ?? "var(--font-body)",
    fontSize: band.fontSize ?? "var(--text-lg)",
    fontWeight: band.fontWeight,
    letterSpacing: band.letterSpacing ?? "0.14em",
  });
}

interface ComposerSheetProps {
  /** Full-bleed top chrome. Drawn flush to the sheet's edges, above the ground. */
  masthead?: ReactNode;
  /**
   * Reserve `sizes.headHeight` for the masthead (#2995). Opt-in: only the
   * live-reskin surfaces (Propose a Task, Create Character) need it. Off renders
   * no wrapper.
   */
  reserveHead?: boolean;
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
 * The composer's frame: a centred column holding one sheet. `overflow: clip`
 * keeps the ground and masthead inside the sheet (#1028 ruling). `clip`, not
 * `hidden` (#3078): `hidden` makes a scroll container and a drag-select scrolls
 * the ground's overhang; `flow-root` restores the formatting context. Pinned by
 * `__tests__/composerSheetClip.test.tsx`. The column's `gap` owns rhythm.
 */
export function ComposerSheet({
  masthead,
  reserveHead = false,
  ground,
  children,
  pageStyle,
  style,
  contentStyle,
  sizes,
}: ComposerSheetProps) {
  // A missed file drop must not navigate away from the form (#3135).
  useStrayFileDropGuard();
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
            display: "flow-root",
            overflow: "clip",
            borderRadius: 10,
            ...style,
          }}
        >
          {ground}
          {/* Reserved head (#2995): only the floor. Stays unpositioned so it
              doesn't trap the masthead's z-indexes. The data handle is for
              DOM-less tests. */}
          {reserveHead ? (
            <div data-composer-head="" style={{ minHeight: sizes.headHeight }}>
              {masthead}
            </div>
          ) : (
            masthead
          )}
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

/**
 * The heading block's floor (#2995), companion to `reserveHead`. Top-aligned, so
 * it pins where the block ENDS (and the row below lands), not where each kit's
 * centred row puts its title; that wobble is dress.
 */
export function ComposerHeading({
  sizes,
  style,
  children,
}: {
  sizes: ComposerSizes;
  /** The kit's own box, if its heading needs one — paint, never the floor. */
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div data-composer-heading="" style={{ minHeight: sizes.headingHeight, ...style }}>
      {children}
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
 * The top chrome band, full-bleed via the sheet's clip. `aria-hidden` unless it
 * has `children` to say something.
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
  /** `string` so a theme-flipping `var()` fits; React's keyword union rejects it. */
  mixBlendMode?: string;
  /** Negative overhang so a drifting layer never exposes corners. */
  inset?: number | string;
  /** Run epDrift — the slow 46s wander the spectrum ground takes. */
  animated?: boolean;
  style?: CSSProperties;
  /** SVG, tiles, glyphs — whatever a faction's ground is made of. */
  children?: ReactNode;
}

/** The ambient backdrop: clipped by the sheet, click-through, under the content. */
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
  /** Second line; only the waiting surface passes one (#1828). */
  meta?: ReactNode;
  /** Status mark at the row's end; waiting surface only (#1828). */
  mark?: ReactNode;
  style?: CSSProperties;
  statusStyle?: CSSProperties;
  metaStyle?: CSSProperties;
}

/** The stage word, with the waiting surface's second line and mark beside it. */
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
  /** Omit when the control names itself (the collab roster, #1416). */
  label?: ReactNode;
  /** The right-hand end of the label row — a counter, a hint, a tab pair. */
  meta?: ReactNode;
  /** Make the label a real <label> for the control with this `id`. */
  htmlFor?: string;
  /** Drawn above the label. Pass `false` for the first section on the sheet. */
  rule?: ReactNode | false;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  metaStyle?: CSSProperties;
  children: ReactNode;
}

/** One labelled region: its own rule, then a label row, then the control. */
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
  // Unheaded sections still draw the rule, plus a spacer (the rule has no margin).
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
          {/* Meta-only rows get no <label>: an empty one names the control "". */}
          {label != null &&
            (htmlFor ? (
              // The id serves contenteditable editors via aria-labelledby.
              <label id={`${htmlFor}-label`} htmlFor={htmlFor} style={heading}>
                {label}
              </label>
            ) : (
              <span style={heading}>{label}</span>
            ))}
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

/** A ring with its middle punched out and content centred: shared geometry, skin paint. */
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

/**
 * Flex-basis WRAP THRESHOLD for the slip's copy (#1961; WORLD_ZERO_STYLE §1.2),
 * on both rows so they wrap together. Must sit in (145, 490]: above a phone
 * slip's leftover width, at or below desktop's (624 − 118 mark − 16 gap).
 */
const COPY_MEASURE = 260;

interface TaskSlipProps {
  praxis: PraxisOut;
  task: TaskOut | null;
  /**
   * Defaults to the per-faction {@link ScoreStamp} (#1828, ADR-0049), the same
   * mark the waiting surface shows. Drafts render it too (base points).
   */
  mark?: ReactNode;
  /** Eyebrow; defaults to `The task` (the waiting surface passes `The duel`). */
  label?: ReactNode;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  descriptionStyle?: CSSProperties;
  pillStyle?: CSSProperties;
}

/**
 * The read-only task slip. Task copy reads at the content floor (§4); skins
 * bring frame and mark, no words (ADR-0065 §3).
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
        // See COPY_MEASURE (#1961).
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div style={{ flex: `1 1 ${COPY_MEASURE}px`, minWidth: 0 }}>
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
          {/* Links to the task (#1705), inheriting `titleStyle`. Autosave makes
              leaving safe, so no confirm. */}
          <Link
            to={`/tasks/${praxis.task_id}`}
            className="hover:underline"
            style={{ color: "inherit" }}
          >
            {praxis.task_title}
          </Link>
        </div>
        {task != null && (
          // Level pill beside the description (#1706). A length basis so it
          // wraps instead of shaving the copy; shared with the outer row (#1961).
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              alignItems: "baseline",
              flexWrap: "wrap",
              marginTop: "var(--space-sm)",
            }}
          >
            <div
              style={composerLabelStyle({
                padding: "var(--space-xs) var(--space-sm)",
                border: "1px solid currentColor",
                borderRadius: 999,
                flexShrink: 0,
                ...pillStyle,
              })}
            >
              {t("editPraxis.composer.levelLabel", {
                level: task.level_required,
              })}
            </div>
            {task.description && (
              <p
                style={{
                  // The task's own prose: content, so the floor governs it (§4).
                  fontSize: "var(--text-content)",
                  lineHeight: 1.55,
                  margin: 0,
                  flex: `1 1 ${COPY_MEASURE}px`,
                  minWidth: 0,
                  ...descriptionStyle,
                }}
              >
                {task.description}
              </p>
            )}
          </div>
        )}
      </div>
      {mark ?? <ScoreStamp praxis={praxis} />}
    </div>
  );
}

interface ComposerFooterProps {
  /** Exits. [Cancel] … [Submit] is the global order (#646); the cast is `end`. */
  start?: ReactNode;
  end: ReactNode;
  /** Cast as a full-bleed band under the exits row (#1828); see {@link composerBandStyle}. */
  band?: boolean;
  style?: CSSProperties;
}

/** The footer bar: exits at the start, the cast at the end (#646). */
export function ComposerFooter({
  start,
  end,
  band = false,
  style,
}: ComposerFooterProps) {
  if (band) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // Stretch so the band's negative margins reach both edges.
          alignItems: "stretch",
          gap: "var(--space-lg)",
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-lg)",
            flexWrap: "wrap",
          }}
        >
          {start}
        </div>
        {end}
      </div>
    );
  }
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
  /** The site's shared `<Breadcrumb>` only (#2102), above the sheet; untinted. */
  breadcrumb?: ReactNode;
  children: ReactNode;
}

/**
 * The page around the sheet: skin face and ink, breadcrumb in the sheet's
 * column. Owned by the page, not a stage, so exactly one draws (#567).
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

/* THE DRESS (#1189, ADR-0065): the mounted archetype hands its ornament to the
 * shared `PraxisWaitingSurface` (ADR-0059). Deliberately not a slug registry:
 * that would be an eager barrel over lazy archetypes (#1045). Masthead, ground
 * and rule are the SAME elements the composer mounts, so nothing changes on
 * Submit. Only `accent` is required. */

export interface ComposerDress {
  /** The one colour the surface leans on for marks, rings and headings. */
  accent: string;
  /** Alarm ink for {@link ErrorBanner} on this sheet (#1231). */
  alarm?: string;
  /** The skin's root style — its body face and ink. */
  pageStyle?: CSSProperties;
  /** The sheet's paint, border, radius and shadow. */
  sheetStyle?: CSSProperties;
  /** The sheet's content column, where a skin overrides its inset. */
  contentStyle?: CSSProperties;
  /** The masthead ELEMENT the composer mounts, not a copy of it. */
  masthead?: ReactNode;
  /** The ground ELEMENT the composer mounts, not a copy of it. */
  ground?: ReactNode;
  /** Divider factory: SVG defs need per-instance ids (WOW's zigzag); `key` names one. */
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
