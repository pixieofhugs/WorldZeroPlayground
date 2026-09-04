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
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisOut } from "../../../api/praxis";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

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
      // Announced, not merely present (#2179). Publish is an onClick with no
      // `<form>` around it, so a failed submit fires no native validation
      // message; and the banner sits at the foot of a long sheet, far from
      // whichever field was refused. Without a live region a screen-reader user
      // presses Submit and is told nothing at all. `alert` rather than `status`
      // because every message this renders is a failure.
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
 * The stage word in the status row's first slot.
 *
 * `Draft` while you are writing; `Submitted` on anything that is in. Shared
 * rather than inlined at the one call site because SNIDE draws the same word in
 * its MASTHEAD, and a masthead still shouting DRAFT over a submitted praxis
 * would be the page contradicting itself — the exact failure the dress exists to
 * prevent.
 *
 * #1863 retired "sealed": a duel side used to read `statusSealed` and everything
 * else `statusSubmitted`, chosen on `isDuel`. Both held the same word, so the
 * branch chose between two identical strings and went with the sweep. #1910
 * deleted the orphaned key behind it — one stage word, one key, no ternary that
 * reads like a distinction the app does not make.
 *
 * The completed reading takes the collab block's own word, which says
 * `Submitted` rather than `Submitted by you`: a lapsed window publishes over a
 * holdout (ADR-0012), and that holdout reads this same line.
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

interface ComposerSizes {
  /** Column width. Desktop pins the design's 720; mobile fills the phone. */
  maxWidth: number | string;
  /** Sheet padding, from the --space-* scale. */
  padding: string;
  /**
   * The sheet's side inset, as its own token (#1828).
   *
   * Split out of `padding` because the full-bleed submit band has to NEGATE it:
   * a child of a padded column reaches its parent's edge only by running the
   * same token the other way. Three skins had each re-derived this pair from the
   * form factor by hand, which is three chances to disagree with the column they
   * are bleeding out of.
   */
  padX: string;
  /** The sheet's bottom inset — the other half the band negates. */
  padBottom: string;
  /** Vertical rhythm between the layout's regions. */
  gap: string;
  /** The composer's own heading tier. */
  titleSize: string;
  /**
   * THE RESERVED HEAD (#2995) — the floor under {@link ComposerSheet}'s masthead
   * slot, for the surfaces that opt in with `reserveHead`.
   *
   * ONE NUMBER, because the whole point is that nine kits read the same one.
   * Propose a Task and Create Character both dispatch on the pick IN PROGRESS,
   * so every click on a chip renders a different archetype — and each archetype
   * started its content column wherever its own masthead ended. Measured on the
   * propose kits at this width: na and UA passed no masthead at all (0), WOW's
   * ribbon plus its bunting is 29, Singularity's window bar 31, S.N.I.D.E.'s
   * 36, Everymen's nameplate 45, Coven's sigil-and-braid band 78, and the
   * Ephemerists' sky band plus its cornice 96. The chip row moved by up to 96px
   * under the pointer.
   *
   * So the number is the TALLEST head any kit draws, and it cannot be smaller:
   * a floor that a kit overflows leaves that kit starting lower, which is the
   * defect again at reduced amplitude. Everything under it pads out; the
   * Ephemerists' band meets it exactly. It is geometry, not spacing, so it is a
   * raw number (WORLD_ZERO_STYLE §4a) — and it is a MIN, so a kit that grows a
   * taller ornament is not clipped, it is the new ceiling and this number
   * follows it.
   */
  headHeight: number;
  /**
   * THE HEADING FLOOR (#2995 part 2) — the second term in that same offset.
   *
   * Reserving the head equalizes what sits ABOVE the content column; on Propose
   * a Task the chips are the column's first section, so the only thing left
   * between them and the sheet's edge is the page heading. That block is
   * archetype-authored and does not agree. Measured on the propose kits, tall
   * ornament included, on desktop: five kits draw a bare `h1` at `titleSize`
   * and 1.1 line-height (35.2px), Singularity's is 1.2 (38.4) and Everymen's
   * 0.96 beside a 40px cog (40), the Ephemerists' is a flex row with a 44px
   * stage mark (44), and WOW's is a row ending in a balloon bunch drawn 38 wide
   * and 1.25× as tall (47.5). On the phone the bunch drops to 37.5 and the mark
   * does not move, so the ceiling swaps kits: 44.
   *
   * THE FLOOR WAS MEASURED, NOT ASSUMED. The issue asked for it only if the
   * Ephemerists' mark does NOT fit inside the h1's line box — 32px × 1.2 =
   * 38.4px on desktop, 24px × 1.2 = 28.8 on mobile, against a mark that is 44px
   * at both. It does not fit, so the heading term is real: 12.3px of spread on
   * desktop and 21 on the phone, on a page whose chips sit directly under it.
   *
   * THE PHONE NUMBER IS NOT THE TALLEST ORNAMENT, IT IS THE TALLEST ROW. WOW's
   * heading is a `flex-wrap: wrap` row — spark · h1 · rule · balloon bunch — and
   * its own comment says it stacks on a phone rather than crushing the heading.
   * It does: in a 319px column (375 − the page's 12px and the column's 16px, both
   * sides) the bunch does not fit beside a heading of the length these two
   * surfaces use, so it takes a second line. That row is 32 (the ✦ span's line
   * box at `--text-heading`/1) + 12 (the wrapped row-gap) + 37.5 (the bunch at
   * 30 × 1.25) = 81.5. So the phone floor is 82, and it also covers the other
   * phone-width case a min-height has to survive — an h1 that wraps to two lines
   * (2 × 28.8 = 57.6) beside a 44px mark.
   *
   * WHAT IS NOT KNOWABLE FROM THE SOURCE. Whether a given kit's title wraps at
   * 319px is a function of the rendered text width in that kit's own face, which
   * no node-side harness can measure — 82 is chosen to cover both the wrapped
   * and the unwrapped case rather than derived from one of them. A THREE-line
   * heading would exceed it, and that is an eyeball item.
   *
   * The floor is spent by {@link ComposerHeading}, which top-aligns the kit's
   * row inside it. Read that block for what the floor does and does not
   * equalize — it pins where the heading block ENDS, not where a kit's own
   * centred row puts its title.
   */
  headingHeight: number;
  /** True on a phone — for conditional ornament, never for a second layout. */
  isMobile: boolean;
}

/**
 * The two reserved heights, declared once per form factor (#2995).
 *
 * Both differ by width because the tallest thing they cover does. The
 * Ephemerists' sky band is 84px on desktop and 68 on the phone and its cornice
 * is 12 either way (96 / 80).
 *
 * `headingHeight` is WOW's heading row at both widths, for two different
 * reasons. On desktop the row fits on one line and the balloon bunch sets its
 * height at 38 × 1.25 = 47.5 → 48. On the phone the same row WRAPS — that is
 * what its `flex-wrap` is there for — so the height is the ✦ span's 32px line
 * box plus the 12px row-gap plus the bunch's 37.5 = 81.5 → 82. 82 also clears
 * the other phone-width case: an h1 wrapped to two lines (57.6) beside the
 * Ephemerists' 44px mark.
 *
 * Rounded UP to a whole pixel, never down: down is the defect back at half a
 * pixel.
 */
const RESERVED_HEAD = { desktop: 96, mobile: 80 };
const RESERVED_HEADING = { desktop: 48, mobile: 82 };

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
        // design 29px → the 32px rung. A --text-* token names a TIER, and the
        // composer's heading is the same tier as every other page heading.
        titleSize: "var(--text-heading)",
        headHeight: RESERVED_HEAD.desktop,
        headingHeight: RESERVED_HEADING.desktop,
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
 *
 * Every value here is a DEFAULT and not a pin: `overrides` is spread last, so a
 * skin whose design asks for its own size, tracking or weight says so at the
 * call site and wins. #1828 was filed reading this as a ceiling — eight skins
 * landing on 12px is what the CALLERS pass, not what this helper allows — so the
 * line is written down rather than left to be re-derived by the next reader.
 * {@link composerBandStyle} is the same shape one tier up.
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
 * The right-hand cluster of a section's label row — the write-up header's
 * `saved a moment ago · [Write|Preview]` (#1828; #2086 took the word count out
 * of it, and #2085 the `Write-up` heading it used to sit beside).
 *
 * It WRAPS, and that is the whole reason it is a shared style rather than two
 * spans: the design's note says so in as many words — *"at the faction's real
 * label metrics (Cinzel 0.24em, Bebas 13px) three nowrap children don't fit a
 * phone's header row."* One of those three has since gone, but the metrics have
 * not, and the autosave string is the one that grows with a translation.
 *
 * `flex: 1 1 auto` + `minWidth: 0` so the cluster gives the label its intrinsic
 * width first and then takes what is left; `justifyContent: flex-end` keeps it
 * ranged right as it wraps. Design gaps 10/6 → the --space-md / --space-sm
 * rungs.
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

/**
 * The proof drop zone's ground: the skin's field, at 42% (#1828).
 *
 * Translucent on purpose — the design's note is *"so the sheet's own ornament
 * reads through the drop zone"* — and every faction takes it, which is why the
 * 42% is stated once here instead of eight times.
 */
export function composerDropGround(field: string): string {
  return `color-mix(in srgb, ${field} 42%, transparent)`;
}

interface ComposerBand {
  /**
   * The band's fill. The skin's CTA while there is something to file, and its
   * CAST paint once the viewer has — the confirmation signal the design says the
   * bleed exists for. The archetype decides which, because only it knows what
   * "filed" means for its own gate (Coven's `hasCast`).
   *
   * OPTIONAL SINCE #2146, for the one case where the paint is not the skin's to
   * decide here: the Ephemerists' band is the faction's single CTA definition,
   * a class in `index.css`, because its enclosure changes width between the
   * cascades. Omitting these two lets that class through — an inline value
   * would beat it and pin one theme's half in both. Omit them ONLY when a class
   * on the same button supplies them; a band that names neither and wears
   * nothing is a transparent button.
   */
  background?: string;
  /** The ink on that fill. See {@link ComposerBand.background} on omitting it. */
  color?: string;
  /**
   * The sheet's own frame, for the band's 1.5px top rule.
   *
   * The SHEET's frame, not the fields' — for Everymen that is
   * `--faction-everymen-composer-frame` (gold in light, red-deep in dark) and
   * not `--everymen-frame`, which is the ink the panels are ruled in.
   */
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
   * Whether the band is welded to the sheet's BOTTOM edge as well as its sides.
   * Defaults true, which is what "full-bleed submit band" has meant since #1828.
   *
   * Pass `false` when the band is no longer the sheet's last row — the Everymen
   * edit kit's stub sits below it since #2991 (the destructive action follows
   * the primary one), and a negative bottom margin under a row that something
   * else follows drags that something up over the band by a whole inset. The
   * side negation is kept either way: the bleed is what makes it a band.
   *
   * A key rather than a `margin` override at the call site, because an override
   * is a second copy of this function's own inset formula — the exact
   * re-derivation {@link composerBandStyle} exists to stop.
   */
  weldBottom?: boolean;
}

/**
 * The FULL-BLEED SUBMIT BAND (#1828): the composer's one irreversible act,
 * drawn flush to the sheet's bottom edge.
 *
 * Seven skins draw it and three had hand-rolled it, in three different shapes —
 * S.N.I.D.E. with negative side margins plus a `paddingBottom: 0` on the content
 * column, Coven with a negative margin on three sides, and the Everymen with a
 * plain `width: 100%` that stopped at the sheet's inset on all three. So the
 * bleed is one affordance now: it negates {@link ComposerSizes}'s own insets, so
 * a band cannot disagree with the column it is bleeding out of, and the sheet's
 * `overflow: hidden` rounds the corners for it.
 *
 * Pass the result as the `PublishButton`'s `style` and mount it through
 * `<ComposerFooter band>`, which is what stretches it across the column.
 *
 * na and Albescent do NOT take it — the unaffiliated kit keeps the inline
 * button, which is the owner ruling on #1828 and the reason this is a per-skin
 * style rather than something the footer does on its own.
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
    // No top margin: the footer's own column gap already stands the band off
    // the exits row (design 18px → the --space-lg rung the footer spends).
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
    // Spelled with `??` rather than left undefined: `overrides` is spread LAST,
    // so an absent key here would erase the label tier's own default instead of
    // inheriting it.
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
   * Reserve `sizes.headHeight` for the masthead slot, so the content column
   * starts at the same offset whatever the kit draws up there (#2995).
   *
   * OPT-IN, AND DEFAULTING TO OFF ON PURPOSE. Roughly thirty archetypes across
   * four surfaces mount this sheet. The two that RESKIN LIVE — Propose a Task
   * dispatches on the target faction and Create Character on the calling being
   * chosen — are the two where a per-kit masthead height is a bug: the control
   * you are using re-renders as a different kit's tree and walks out from under
   * the pointer. On editPraxis and editCharacter the kit is fixed for the life
   * of the page, nothing re-skins, and a reserved head would only move every
   * surface in the app for a defect they do not have. Widening it there is a
   * separate, visually-reviewed pass.
   *
   * Off, the masthead renders exactly as before — no wrapper, byte-identical
   * markup — so the surfaces that do not opt in are untouched.
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
  reserveHead = false,
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
          {/* The reserved head (#2995). A wrapper only when it is asked for, and
              it carries NOTHING BUT THE FLOOR.

              It used to restate `position: relative; zIndex: 2`, which is what
              `ComposerMasthead` and `CardMasthead` each already set on
              themselves — two stacking contexts where one will do, and the outer
              one would have trapped the inner z-indexes (the Ephemerists' cornice
              sits at 3). Unpositioned, this box is a plain block and the band
              inside it goes on stacking against the sheet exactly as it did
              before the wrapper existed.

              The slot is a MIN, so a taller ornament is never clipped. The
              handle is in the markup because a DOM-less suite has nothing else
              to read — the same reason `Bunting` carries `data-wow-bunting`. */}
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
 * The heading block's floor — the second half of the reserved offset (#2995).
 *
 * A kit passes its own heading row as `children`; this box only says how far
 * that block reaches before the next region starts. It is the companion to
 * `ComposerSheet`'s `reserveHead` and is mounted by the same surfaces: on
 * Propose a Task the chips are the section directly under it, so head + heading
 * IS the whole offset the chip row sits at.
 *
 * WHY A BLOCK AND NOT A PROP. The floor was sixteen hand-spelled
 * `minHeight: sizes.headingHeight`s before this existed — sixteen chances for a
 * kit to forget one, spell it on the wrong box, or drift, with nothing to catch
 * it. As a block there is one implementation, one `data-composer-heading`
 * handle, and the derived guards on both surfaces read it the same way they read
 * the head.
 *
 * WHAT IT DOES AND DOES NOT EQUALIZE. The content is TOP-ALIGNED inside the
 * floor, so every kit's heading block starts and ENDS at the same y and so does
 * the region under it. It does NOT equalize where the title sits inside that
 * block: six kits draw their heading as a flex row with `alignItems: center`
 * around an ornament of their own (the Ephemerists' 44px stage mark, Everymen's
 * 40px cog, WOW's balloon bunch), and a centred row puts its own h1 a few
 * pixels down — 2.8px on the Ephemerists' desktop row, more where the ornament
 * is taller. That wobble is each kit's own row, it is dress, and flattening it
 * would mean telling every kit how to align its ornament. What #2995 was filed
 * on is where the ROW BELOW lands, and that is what this pins.
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
  /**
   * The second line beside the stage word.
   *
   * The COMPOSER passes nothing since #1828: its row reads `Draft` alone, and
   * the autosave string it used to carry sits in the write-up header beside the
   * Write/Preview tabs (see {@link composerMetaCluster}). What still passes one is the
   * waiting surface, whose second line is a fact about the wait — when you
   * filed, what the crew is still waiting on — and not a save state.
   */
  meta?: ReactNode;
  /**
   * The faction's status mark, drawn at the end of the row.
   *
   * Also the waiting surface's alone since #1828. On a row that says `Draft` the
   * mark is decoration, and for Coven it was a second pentacle competing with
   * the sigil in the masthead directly above it; it is not discarded but
   * DEFERRED — the same element reappears as the awaiting surface's `heroMark`
   * beside "Your part is submitted", which #1189 called the strongest
   * per-faction beat on the page.
   */
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
  /**
   * Optional since #1416: a region whose control names itself draws no heading
   * row at all, rather than an empty one that still spends its margins. The
   * collab roster is the live case — it grew its own `Collaborators · N` header
   * beside the tally, so nine mounts stopped passing a label rather than
   * printing the count twice and letting the two disagree.
   */
  label?: ReactNode;
  /** The right-hand end of the label row — a counter, a hint, a tab pair. */
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
          {/* A row may be headed by its META alone — the write-up's has been
              since #2085 removed the `Write-up` heading — and an empty <label>
              is worse than none: it is an accessible name that computes to the
              empty string for whatever `htmlFor` points at. */}
          {label != null &&
            (htmlFor ? (
              // The id is what a control that is NOT a labelable element reaches
              // for: since #1742 the body is a CodeMirror editor, and `for` does
              // nothing for a contenteditable div — it names itself with
              // `aria-labelledby="<htmlFor>-label"` instead.
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

/**
 * The measure below which the slip's borrowed copy takes the whole line (#1961).
 *
 * The slip is two rows, and each is [something fixed] beside [the task's own
 * copy]: the score mark against the text column, the level pill against the
 * description. Both fixed halves hold their width whatever the sheet does — the
 * mark is `flexShrink: 0` over a 118px floor, the pill is `flexShrink: 0` — so
 * the copy was the only thing left to give, and on a phone it gave down to
 * about 145px: three words to a line, twenty lines tall, with the mark's column
 * standing empty beside all but the first of them.
 *
 * As a flex-basis this is a WRAP THRESHOLD, not a width (WORLD_ZERO_STYLE §1.2
 * — pick it by where the row wraps). Both rows run it, so both wrap together:
 * a basis on the outer row alone widens the column enough that the description
 * stops dropping under the level pill, and the gutter reappears on the other
 * side of it. The two thresholds it has to sit between, on today's sheets:
 *
 *  - the desktop slip's 624px inner width, less the mark's 118 and the row's
 *    16px gap, leaves 490 — anything at or under that keeps the desktop slip
 *    on one line, and keeps #1706's pill-beside-description with it;
 *  - a 402px phone's slip is 279px inside its padding, so anything over 145
 *    wraps there.
 *
 * 260 sits mid-range in both directions and is a readable measure in its own
 * right. It is geometry, so a raw px number (§4a).
 */
const COPY_MEASURE = 260;

interface TaskSlipProps {
  praxis: PraxisOut;
  task: TaskOut | null;
  /**
   * The mark at the slip's end. Defaults to the shared {@link ScoreStamp}
   * (#1828) — pass one only to say something OTHER than the praxis's total.
   *
   * It used to be required in practice: every archetype passed a composer-only
   * points mark of its own while the waiting surface mounted the stamp, so the
   * mark changed shape the instant you pressed Submit, on the same page. The
   * ornament seam survives the swap — `ScoreStamp` dispatches per faction
   * through `surfaceMap("scoreStamp")` (ADR-0049), so each faction still brings
   * its own device — and the site stops maintaining two parallel per-faction
   * points marks.
   *
   * A draft renders it: the gate is `moderation_status` (`hidden`/`failed`) and
   * never `status`, and the backend scores every praxis unconditionally, so a
   * draft's total is its base points.
   */
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
        // The mark drops UNDER the copy on a narrow sheet rather than holding
        // its column beside it (#1961) — see COPY_MEASURE.
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
          // One row for the slip's second line (#1706): the level pill and the
          // task's own prose beside each other, rather than the description
          // stacked under the pill on a third. The row carries the top margin
          // both parts used to set for themselves, so a skin that repaints
          // either cannot shift the spacing.
          //
          // A LENGTH basis rather than `1 1 auto`: a basis of zero-or-auto
          // never wraps, so a slip squeezed narrow (the phone, a long level
          // word, a wide points mark) would go on shaving the description's
          // column instead of letting it drop below the pill.
          //
          // It was `1 1 50%`, which wraps when the pill takes half the column —
          // a threshold set by the PILL's width and not by the copy's, and one
          // that therefore moves whenever a skin redresses the pill or a level
          // word gets longer. `COPY_MEASURE` is the same threshold stated as
          // what it is about, and it is the outer row's, so the two wrap
          // together (#1961).
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
  /**
   * The leaving end. [Cancel] … [Submit] is the global order settled in #646, so
   * save-draft / drop / leave go here and the cast goes in `end` — never the
   * other way round, on any skin.
   */
  start?: ReactNode;
  end: ReactNode;
  /**
   * The cast is a full-bleed BAND rather than an inline button (#1828).
   *
   * The exits keep a text row of their own and the band closes the sheet under
   * it, stretched across the column so {@link composerBandStyle}'s negative side
   * margins reach both edges. Seven skins pass this; na and Albescent do not,
   * and the unaffiliated kit keeping the inline button is the point of the
   * distinction rather than an omission.
   */
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
          // Stretch, so the band's `calc(100% + 2 × padX)` is arrived at by the
          // column rather than written down as a width.
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
  /**
   * The site's shared `<Breadcrumb>`, drawn in a column of the sheet's own
   * width, above the sheet. A slot rather than props because the waiting
   * surface mounts this same page and hands its own — but there is exactly one
   * component that may go in it (#2102).
   */
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
 *
 * WHAT IT DRAWS IS NO LONGER THIS FILE'S (#2102). A `Breadcrumb` lived here
 * until the whole site collapsed onto one, and it was the version that already
 * behaved correctly — so it was promoted to `components/nav/Breadcrumb` rather
 * than rewritten, and `taskDetail`'s and `praxisDetail`'s eighteen hand-rolled
 * copies were deleted onto it. The skin no longer tints it: a breadcrumb is
 * neutral site chrome measured on the site's own ground, which is what the page
 * under this sheet actually is. `ComposerDress.breadcrumbInk` went with that.
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
