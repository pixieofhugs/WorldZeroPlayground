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
 * the three zones, the footer pinned to the bottom, the fluid 360x300 box. A
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
 */
export function SelectCardFrame({ style, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        width: "100%",
        maxWidth: 360,
        minHeight: 300,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
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
  /** The faction's mark. Optional: a band may be its field and its name alone. */
  mark?: ReactNode;
  /** The member seal — a drawing, never copy. Required: every faction draws one. */
  seal: ReactNode;
  /** The band's own paint: ground, rule, inset. */
  style?: CSSProperties;
  /** The name's face, size and ink. */
  nameStyle?: CSSProperties;
  /** The faction's name. */
  children: ReactNode;
}

/** Slot 1. Mark, name, and a seal only a member sees. */
export function SelectCardBand({
  form,
  align = "center",
  state,
  mark,
  seal,
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
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-sm)",
          textAlign: "center",
          ...style,
        }}
      >
        {drawnMark}
        <span style={{ minWidth: 0, ...nameStyle }}>{children}</span>
        {drawnSeal && (
          <span style={{ position: "absolute", top: "var(--space-md)", right: "var(--space-md)" }}>
            {drawnSeal}
          </span>
        )}
      </div>
    );
  }

  const centred = align === "center";
  return (
    <div
      data-select-slot="band"
      style={{
        display: "grid",
        gridTemplateColumns: centred ? "1fr auto 1fr" : "auto 1fr auto",
        alignItems: "center",
        gap: "var(--space-md)",
        ...style,
      }}
    >
      <span style={{ justifySelf: "start", display: "inline-flex" }}>{drawnMark}</span>
      <span style={{ minWidth: 0, textAlign: centred ? "center" : "start", ...nameStyle }}>
        {children}
      </span>
      {/* The right gutter is always drawn, seal or no seal: on the centred grid
          it is what puts the name on the tile's centreline, and on either grid
          it keeps the name from moving the moment a viewer becomes a member. */}
      <span style={{ justifySelf: "end", display: "inline-flex" }}>{drawnSeal}</span>
    </div>
  );
}

interface ZoneProps {
  style?: CSSProperties;
  children: ReactNode;
}

/** The middle zone. It takes the tile's spare height, so footers line up along a row. */
export function SelectCardBody({ style, children }: ZoneProps) {
  return (
    <div
      data-select-zone="body"
      style={{ flex: 1, display: "flex", flexDirection: "column", ...style }}
    >
      {children}
    </div>
  );
}

/** The last zone, pinned to the bottom of the tile. */
export function SelectCardFooter({ style, children }: ZoneProps) {
  return (
    <div data-select-zone="footer" style={{ marginTop: "auto", ...style }}>
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

/** Slot 2. The faction's tagline, promoted to the tile's display line. */
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
 * THE SEAM FOR #3111. The owner ruled that a blank line in a blurb starts a new
 * paragraph, and that the rule is this slot's. It is built there, not here: the
 * slot is a box holding its paragraph(s), and it takes the blurb as a STRING,
 * so the split lands inside this function and no tile changes. Until then it
 * is one paragraph.
 */
export function SelectCardPitch({ className, style, children }: TextSlotProps) {
  return (
    <div data-select-slot="pitch" className={className} style={{ flex: 1, ...style }}>
      <p style={{ margin: 0 }}>{children}</p>
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
    <div style={style}>
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
  /** A shut door stays on the tile; it is never dropped (ADR-0082 §3). */
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
      // Full width is the slot's, so it is spread last and no paint can undo it.
      style={{ cursor: disabled ? "default" : "pointer", ...style, width: "100%" }}
    >
      {children}
    </button>
  );
}
