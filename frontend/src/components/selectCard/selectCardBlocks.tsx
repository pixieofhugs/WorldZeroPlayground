import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
// Type-only: the dispatcher imports every tile, and every tile imports this.
import type { SelectState } from "./FactionSelectCard";

/**
 * The select-card chassis (#3130, #3139): seven slots, three zones.
 *
 *     band     1 band (mark · name · seal)
 *     body     2 motto   3 pitch   4 ornament
 *     footer   5 standing   6 headcount   7 call
 *
 * Blocks own structure only and spread it AFTER the tile's `style`, so paint
 * passes through and structure can't move (anything spread before is a
 * replaceable default). Shared chassis, not a skin table (ADR-0090 §Tree):
 * nothing here takes a faction (#2660). `everySelectTileKeepsTheSevenSlots`
 * holds both halves. Not `CardMasthead`: that is a link with no seal slot or
 * crest form, and another suite hashes its markup.
 */

/**
 * The tile's box, the one place its geometry is spelt (#732); spread last so
 * no tile can move it. `flexGrow: 1` needs a COLUMN parent: a row that wants
 * level tiles stretches flex-column items (`pages/Factions.tsx`), and any
 * wrapper between must also be a growing column (`AlbescentSelectCard`).
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
  /** `row`: mark beside the name; `crest`: mark above. */
  form: "row" | "crest";
  /** Row only. `center`: `1fr auto 1fr`, name on the centreline; `start`: name against the mark. */
  align?: "center" | "start";
  /** The seal is drawn for a member only. */
  state: SelectState;
  /** Optional; without it a row band draws no mark cell. */
  mark?: ReactNode;
  /** The member seal — a drawing, never copy. */
  seal: ReactNode;
  /**
   * Seal slot width in px (a node can't be measured). Reserved in EVERY state
   * so the name doesn't re-wrap when a viewer joins.
   */
  sealSize: number;
  /** The band's own paint: ground, rule, inset. */
  style?: CSSProperties;
  /** Face, size and ink; not wrapping (see `NAME_FITS`). */
  nameStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * A long unbreakable name wraps instead of running under the seal (320px
 * phone). Spread after `nameStyle`; a tile wanting it to shrink passes a fitted `fontSize`.
 */
const NAME_FITS: CSSProperties = { minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" };

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
  // Both decorative: the name and the standing line say it in words.
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
          // Containing block for the pinned seal.
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {drawnMark}
        {/* The out-of-flow seal reserves nothing, so the name pads both sides
            (centreline) in every state (no re-break on join). */}
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
  // No mark, no cell (an empty cell still costs a gap). On `center` the
  // leading `1fr` balances the seal's cell, so it stays and we place past it.
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
      {/* Always `sealSize` wide, seal or not, so the grid is identical in
          all states and the name never re-wraps on join. */}
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

/** The middle zone; its `flex: 1` (spread last) is what pins the footer down. */
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

/** The last zone; no pinning of its own — the body grows. */
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
  children: string;
}

/**
 * Slot 2, the tagline. `margin: 0` goes BEFORE `style`: spread last, the
 * shorthand would wipe a tile's `marginTop`.
 */
export function SelectCardMotto({ className, style, children }: TextSlotProps) {
  return (
    <p data-select-slot="motto" className={className} style={{ margin: 0, ...style }}>
      {children}
    </p>
  );
}

/**
 * Slot 3; grows, pushing the ornament onto the footer. A blank line starts a
 * new paragraph (#3111, as the faction-detail bodies do); a lone newline is whitespace.
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
  /** Omit when a class paints the box itself; an `:empty` selector may rely on it. */
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
  /** Unknown means no headcount at all. */
  members?: number;
  /** Called only with a known `members`. */
  headcount: (members: number) => ReactNode;
  /** Renders inside the headcount slot and leaves with it. */
  separator?: ReactNode;
  style?: CSSProperties;
  standingStyle?: CSSProperties;
  headcountStyle?: CSSProperties;
  children: string;
}

/** Slots 5 and 6: standing, then headcount — never in the call. */
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
   * NOT for a locked state (a locked call still visits the page). Only the
   * redacted Albescent tile's shut door uses it (ADR-0082 §3).
   */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** A string, so no count can ride in beside the label. */
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
      // Width and a shut door's cursor are spread last; pointer is a default.
      style={{ cursor: "pointer", ...style, width: "100%", ...(disabled && { cursor: "default" }) }}
    >
      {children}
    </button>
  );
}
