import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
// Type-only: the dispatcher imports every tile, and every tile imports this.
import type { SelectState } from "./FactionSelectCard";

/**
 * THE SELECT-CARD CHASSIS (#3130, #3139) — the layout blocks every faction's
 * directory tile is built from. Seven slots in one order, in three zones:
 *
 *     band     1 band (mark · name · seal)
 *     body     2 motto   3 pitch   4 ornament
 *     footer   5 standing   6 headcount   7 call
 *
 * THE BLOCKS OWN STRUCTURE AND NOTHING ELSE: which slots exist, their order,
 * the three zones, the footer pinned to the bottom, the fluid 360x300 box. EACH
 * BLOCK SPREADS ITS OWN STRUCTURE AFTER THE TILE'S `style`, so paint passes
 * through and structure cannot be moved — by accident or on purpose. (What a
 * block spreads BEFORE `style` is a default the tile may replace: a gap, an
 * open call's cursor, the motto's paragraph-margin reset.) A
 * faction keeps its own card file and its own tree and hands in everything
 * that is paint — ground, border, faces, sizes, the mark, the ornament and the
 * seal's drawing — as `style`, `className` or a node. This is a shared chassis,
 * not a skin table (`frontend/CLAUDE.md`, #2992; ADR-0090 §Tree; ADR-0065 for
 * the precedent), so NOTHING IN THIS FILE TAKES A FACTION: no block has a prop
 * that names one, and a seam that takes none cannot grow a branch on one
 * (#2660). `everySelectTileKeepsTheSevenSlots.test.tsx` holds both halves — the
 * order, read off the `data-select-*` attributes below, and the absence.
 *
 * WHY NOT `CardMasthead`. The band wants the same `1fr auto 1fr` grid, and the
 * card masthead cannot be mounted for it: it is a link, its mark slot is one
 * fixed small size, it has no seal slot and no crest form, and another suite
 * hashes its markup. So the band below is the select card's own, on that grid.
 * Like the masthead, it offers no backdrop slot: a band that carries a field
 * behind its name wraps this block in its own positioned box and paints there.
 */

/**
 * The tile's outer box, and the one place its geometry is spelt (#732): fluid
 * up to 360 wide so the same art survives a 375px phone column, a minimum
 * height rather than a fixed one, and a column so the footer can sit at the
 * bottom of whatever height the row hands it.
 *
 * THE BOX IS SPREAD LAST. A tile's `style` is its paint — ground, border,
 * radius, ink, face — and every declaration below outranks it, so no tile can
 * restate the width, fix the height or stop being a column.
 *
 * HOW THE HEIGHT GETS HERE. `flexGrow: 1` takes the spare height of a COLUMN
 * parent, so a mount that wants a row of tiles level makes the row stretch its
 * items and makes each item a flex column (`pages/Factions.tsx`). A wrapper
 * between that item and this frame must be a growing column too, or the chain
 * breaks there (`AlbescentSelectCard`). In a parent that hands down no height —
 * the mobile directory's single column — it grows into nothing and the tile is
 * as tall as its content. A tile NOT built on this frame does not grow, and
 * sits at its own height at the top of its stretched item, exactly as before.
 */
export function SelectCardFrame({ style, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      data-select-frame=""
      style={{
        ...style,
        width: "100%",
        maxWidth: 360,
        minHeight: 300,
        height: "auto",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
      }}
    >
      {children}
    </div>
  );
}

interface SelectCardBandProps {
  /**
   * `row` sets the mark beside the name; `crest` sets it above. The contract
   * allows exactly these two.
   */
  form: "row" | "crest";
  /**
   * Row only. `center` (the default) is the `1fr auto 1fr` grid: two equal
   * gutters, so the name sits on the tile's centreline whatever the mark's
   * width. `start` sets the name hard against the mark instead — #3130 leaves
   * "left or centred" to the faction, and five of the reference's six rows are
   * drawn that way.
   */
  align?: "center" | "start";
  /** The viewer's standing. The seal is drawn for a member and for nobody else. */
  state: SelectState;
  /**
   * The faction's mark. Optional: a band may be its field and its name alone,
   * and a row band then draws no mark cell — the name is its first cell, with
   * no gap in front of it.
   */
  mark?: ReactNode;
  /** The member seal — a drawing, never copy. Required: every faction draws one. */
  seal: ReactNode;
  /**
   * The width of the seal's slot, in px — the width `seal` is drawn at. The
   * band cannot measure a node, so it is told. A row band holds a cell this
   * wide at its right edge in EVERY state, drawn or not, so the name's cell is
   * the same width before and after a viewer becomes a member and its line
   * breaks do not move. A crest band gives the same width to the seal's corner
   * box, and keeps that much (plus the corner's inset) clear on both sides of
   * its name.
   */
  sealSize: number;
  /** The band's own paint: ground, rule, inset. */
  style?: CSSProperties;
  /**
   * The name's face, size and ink. Not its wrapping: see `NAME_FITS`.
   */
  nameStyle?: CSSProperties;
  /** The faction's name. */
  children: ReactNode;
}

/**
 * THE NAME STAYS IN ITS CELL. A display-size name shares the band with the
 * mark, two gaps and the seal's slot, and a faction's name can be one long
 * unbreakable word. So the name's box may shrink below its longest word
 * (`minWidth: 0`), never exceeds the band (`maxWidth: 100%`), and breaks
 * wherever it must (`overflowWrap: anywhere`) — on a 320px phone it wraps onto a
 * second line instead of running under the seal and being clipped by the frame.
 * Spread after `nameStyle`, so a tile cannot switch it off. A name that should
 * rather SHRINK than wrap is a size decision, and that is the tile's: hand a
 * fitted `fontSize` in `nameStyle`.
 */
const NAME_FITS: CSSProperties = { minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" };

/** How far in from the crest band's top right corner its seal is pinned. */
const CREST_SEAL_INSET = "var(--space-md)";

/** Slot 1. Mark, name, and a seal only a member sees. */
export function SelectCardBand({
  form,
  align = "center",
  state,
  mark,
  seal,
  sealSize,
  style,
  nameStyle,
  children,
}: SelectCardBandProps) {
  // Decorative, both of them: the name is in words right beside the mark, and
  // the seal says in a drawing what the standing line says in a sentence.
  const drawnMark = mark != null && (
    <span aria-hidden="true" style={{ display: "inline-flex", lineHeight: 0 }}>
      {mark}
    </span>
  );
  const drawnSeal = state === "member" && (
    <span aria-hidden="true" data-select-seal="" style={{ display: "inline-flex", lineHeight: 0 }}>
      {seal}
    </span>
  );

  if (form === "crest") {
    return (
      <div
        data-select-slot="band"
        style={{
          alignItems: "center",
          gap: "var(--space-sm)",
          textAlign: "center",
          ...style,
          // The seal is pinned to this box's corner, so the box stays the
          // seal's containing block whatever paint is passed.
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {drawnMark}
        {/* THE NAME STAYS CLEAR OF THE SEAL. The seal is out of flow and
            reserves nothing, so the name does: the seal's width plus its
            inset, on BOTH sides so the name stays on the centreline, and in
            every state so its lines do not re-break when a viewer joins.
            Measured from the band's content edge, so a band with its own
            inset clears the seal by that much more. */}
        <span
          style={{
            ...nameStyle,
            ...NAME_FITS,
            boxSizing: "border-box",
            paddingInline: `calc(${sealSize}px + ${CREST_SEAL_INSET})`,
          }}
        >
          {children}
        </span>
        {drawnSeal && (
          <span
            style={{
              position: "absolute",
              top: CREST_SEAL_INSET,
              right: CREST_SEAL_INSET,
              width: sealSize,
              display: "inline-flex",
              justifyContent: "flex-end",
            }}
          >
            {drawnSeal}
          </span>
        )}
      </div>
    );
  }

  const centred = align === "center";
  // NO MARK, NO MARK CELL. An empty `auto` cell is 0 wide and still costs the
  // grid gap, which would set the name that gap in from the band's edge. So on
  // `start` the leading track goes with the cell. On `center` the leading
  // `1fr` is not the mark's track but the counterweight to the seal's cell —
  // it stays, empty, and the name and seal are placed past it by number.
  const marked = mark != null;
  const columns = centred ? "1fr auto 1fr" : marked ? "auto 1fr auto" : "1fr auto";
  const past = (column: number): CSSProperties => (centred && !marked ? { gridColumn: column } : {});
  return (
    <div
      data-select-slot="band"
      style={{
        alignItems: "center",
        gap: "var(--space-md)",
        ...style,
        display: "grid",
        gridTemplateColumns: columns,
      }}
    >
      {marked && <span style={{ justifySelf: "start", display: "inline-flex" }}>{drawnMark}</span>}
      <span style={{ textAlign: centred ? "center" : "start", ...nameStyle, ...NAME_FITS, ...past(2) }}>
        {children}
      </span>
      {/* The seal's cell is always drawn and always `sealSize` wide, seal or
          no seal. An `auto` column alone would be 0 wide for a stranger and
          the seal's width for a member — on `align="start"` that narrows the
          name's `1fr` the moment a viewer joins, and a name near the edge
          re-wraps. With the width held, the band is the same grid in all
          three states; on the centred grid the cell is also the gutter that
          puts the name on the tile's centreline. */}
      <span
        style={{
          justifySelf: "end",
          display: "inline-flex",
          justifyContent: "flex-end",
          width: sealSize,
          ...past(3),
        }}
      >
        {drawnSeal}
      </span>
    </div>
  );
}

interface ZoneProps {
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * The middle zone, and THE ONE THING THAT PINS THE FOOTER: `flex: 1` takes all
 * of the frame's spare height, so the footer after it lands on the frame's
 * bottom edge and footers line up along a row. Spread last — a body that did
 * not grow would let the footer float up.
 */
export function SelectCardBody({ style, children }: ZoneProps) {
  return (
    <div
      data-select-zone="body"
      style={{ ...style, flex: 1, display: "flex", flexDirection: "column" }}
    >
      {children}
    </div>
  );
}

/**
 * The last zone. It sits at the bottom because the body above it grows; it
 * carries no pinning of its own (a `marginTop: auto` here would be a second
 * mechanism with nothing left to push against).
 */
export function SelectCardFooter({ style, children }: ZoneProps) {
  return (
    <div data-select-zone="footer" style={style}>
      {children}
    </div>
  );
}

interface TextSlotProps {
  className?: string;
  style?: CSSProperties;
  /** The catalog string, and only that. */
  children: string;
}

/**
 * Slot 2. The faction's tagline, promoted to the tile's display line.
 *
 * `margin: 0` comes BEFORE `style`, and is the one reset in this file: it
 * clears the paragraph's browser margin, and the space above the motto is the
 * tile's to set. Spread last, the shorthand would wipe a tile's `marginTop`.
 * The slot has no structure of its own to protect.
 */
export function SelectCardMotto({ className, style, children }: TextSlotProps) {
  return (
    <p data-select-slot="motto" className={className} style={{ margin: 0, ...style }}>
      {children}
    </p>
  );
}

/**
 * Slot 3. One to three sentences, and the slot that grows: it takes the body's
 * spare height, which is what pushes the ornament down onto the footer.
 *
 * A blank line in the blurb starts a new paragraph (#3111, owner ruling), the
 * rule the faction-detail bodies apply to a description; a lone newline is
 * whitespace. The slot takes the blurb as a STRING, so the split lands here and
 * no tile changes. The block owns the split and the gap; face, size and ink
 * stay the tile's. A redacted tile passes one redaction string, so it stays one
 * redacted paragraph. The detail bodies split inline (no function to reuse).
 */
export function SelectCardPitch({ className, style, children }: TextSlotProps) {
  return (
    <div data-select-slot="pitch" className={className} style={{ ...style, flex: 1 }}>
      {children
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, i) => (
          <p key={i} style={i ? { margin: "var(--space-sm) 0 0" } : { margin: 0 }}>
            {part}
          </p>
        ))}
    </div>
  );
}

interface SelectCardOrnamentProps {
  className?: string;
  style?: CSSProperties;
  /**
   * The drawing, when it is a node. Omit it when the slot's own box IS the
   * drawing (a rule painted by a class): the slot then renders childless, which
   * an `:empty` selector may be relying on.
   */
  children?: ReactNode;
}

/** Slot 4. One drawn element between pitch and footer. No copy, no catalog key. */
export function SelectCardOrnament({ className, style, children }: SelectCardOrnamentProps) {
  return (
    <div aria-hidden="true" data-select-slot="ornament" className={className} style={style}>
      {children}
    </div>
  );
}

interface SelectCardStandingProps {
  /** The member count, when one is known. Unknown means no headcount at all. */
  members?: number;
  /**
   * Draws the headcount from a KNOWN count — the figure and its noun, as the
   * tile produces them. Called only when `members` is a number, so a tile
   * cannot draw a count nobody gave it. Required: every tile has the slot.
   */
  headcount: (members: number) => ReactNode;
  /**
   * What stands between standing and headcount, if the faction draws anything.
   * It is the headcount's own: it renders inside that slot and leaves with it.
   */
  separator?: ReactNode;
  /** The row's layout and shared type: inline run, or spread to both edges. */
  style?: CSSProperties;
  standingStyle?: CSSProperties;
  headcountStyle?: CSSProperties;
  /** The standing line for the viewer's state. */
  children: string;
}

/**
 * Slots 5 and 6. The standing, and directly after it the headcount — never in
 * the call, and only when a count is known.
 */
export function SelectCardStanding({
  members,
  headcount,
  separator,
  style,
  standingStyle,
  headcountStyle,
  children,
}: SelectCardStandingProps) {
  return (
    <div data-select-row="standing" style={style}>
      <span data-select-slot="standing" style={standingStyle}>
        {children}
      </span>
      {members != null && (
        <span data-select-slot="headcount" style={headcountStyle}>
          {separator}
          {headcount(members)}
        </span>
      )}
    </div>
  );
}

interface SelectCardCallProps {
  onClick?: () => void;
  /**
   * NOT FOR A LOCKED STATE. The house rule is "hide unusable controls; don't
   * show them disabled" (`frontend/CLAUDE.md`), and a locked or ineligible
   * viewer's call stays a live call — it visits the faction's page. This prop
   * exists for the ONE ruled exception: the redacted Albescent tile, whose door
   * is shut but stays on the tile rather than being dropped (ADR-0082 §3,
   * #2409). A tile converting to these blocks does not pass it.
   */
  disabled?: boolean;
  className?: string;
  /** The button's shape and paint. */
  style?: CSSProperties;
  /** The label, and nothing else: a string, so no count can ride in beside it. */
  children: string;
}

/** Slot 7. The call: full width, last, holding its label and nothing else. */
export function SelectCardCall({ onClick, disabled, className, style, children }: SelectCardCallProps) {
  return (
    <button
      type="button"
      data-select-slot="call"
      onClick={onClick}
      disabled={disabled}
      className={className}
      // Full width is the slot's, and so is a shut door's cursor: both are
      // spread last and no paint can undo them. An open call's pointer is only
      // a default.
      style={{ cursor: "pointer", ...style, width: "100%", ...(disabled && { cursor: "default" }) }}
    >
      {children}
    </button>
  );
}
