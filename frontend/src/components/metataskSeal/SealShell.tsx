import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * THE ONE SEAL ANATOMY (#2562) — a painted band, a condition, a points mark.
 *
 * Nine skins painted nine stickers and placed the same three fields in nine
 * different places, so a stack of applied metatasks read as nine unrelated
 * objects. The owner's ruling is one anatomy for all nine:
 *
 * ```
 * ┌──────────────────────────────────────────────────┐
 * │  ◐        <FACTION> METATASK                  ×  │  the shared masthead
 * ├──────────────────────────────────────────────────┤
 * │  Do the task in space                    ╭────╮  │
 * │                                          │ +10│  │  the faction's points
 * │                                          │PTS │  │  mark, right-aligned
 * └──────────────────────────────────────────╰────╯──┘
 * ```
 *
 * THIS COMPONENT CARRIES NONE OF THE PAINT, which is the same relationship
 * `CardMasthead` has with `factionBands` and `ComposerMasthead` has with the
 * composer archetypes — and it exists for the reason `CardMasthead`'s docstring
 * gives: nine agents each inventing this shape yields nine slightly different
 * seals, every branch green and `main` red. What it owns is the anatomy: which
 * slot sits where, the body's inset, and the peel control's corner. Ground,
 * border, radius, shadow, tilt and reading face all arrive as `style` from the
 * skin.
 *
 * THE BAND IS FULL-BLEED, so the body's inset lives on the body box rather than
 * on the root — the same move the two praxis frames had to make when they grew a
 * masthead (#2185). A skin that pads its root instead pushes the band inboard
 * and the anatomy is gone.
 *
 * THE PEEL CONTROL IS A SIBLING OF THE BAND, NOT A CHILD. It moved onto the
 * band's top-right here, where it no longer collides with the mark — and the
 * band is an ANCHOR since #2167, so a `<button>` nested inside it would be
 * invalid HTML and a control inside a link's hit box. It is rendered after the
 * band and positioned over the band's own right gutter, which `CardMasthead`
 * leaves empty by construction. `sealAnatomy.test.tsx` holds the sibling
 * relationship for all nine.
 *
 * ITS INK IS THE BAND'S, NOT THE STICKER'S, and that is a pairing rather than a
 * preference: the `×` used to sit on the seal's own ground and now sits on the
 * faction's painted band, so every skin passes the ink its band already measures
 * against that ground (`factionContrast.test.ts`). A skin that omits it inherits
 * the sticker's ink onto a band it was never measured on — which is how a gilt
 * `×` lands on plum at 3.47:1.
 */
/**
 * THE MARK'S DRAWN SIZE ON A SEAL — one number, shared by all nine.
 *
 * "The points marks line up in one column down the right" is the ruling, and
 * right-alignment alone does not give it: nine marks at nine sizes make nine
 * columns with one edge in common. Ornament geometry (§4a), and SHARED for the
 * same reason `CardMasthead`'s `MARK` is — the kit has one place to say how much
 * room a seal gives its faction's device.
 *
 * It is smaller than every card mount of the same drawings (92, 96, 128): a seal
 * is a sticker on somebody else's praxis and its bonus is an ADDEND, not that
 * praxis's total. The figure inside rides `--text-title` rather than the marks'
 * own `--text-heading` default for the same reason.
 *
 * ponytail: the ceiling is the Ephemerists' rose, which clears its four needles
 * at 48 of its 100 units — 34px of clear field here, enough for four glyphs at
 * 24px and no more. A bigger figure wants a bigger mark, and all nine move
 * together or the column is gone.
 */
export const SEAL_MARK = 72;

/** The bonus figure's tier inside the mark. Type, so a token (§4a). */
export const SEAL_FIGURE = "var(--text-title)";

export interface SealShellProps {
  /** The faction's painted band, from `cardMasthead/factionBands`. Full-bleed. */
  band: ReactNode;
  /** The condition line, in the issuing faction's reading face. */
  condition: ReactNode;
  /** The faction's points mark, holding the bonus figure over its caption. */
  mark: ReactNode;
  /** Show the `×` peel control (the compose surface, #933). */
  removable?: boolean;
  /** Fired by the `×`. The skin binds the metatask's id. */
  onRemove?: () => void;
  /** The `×`'s ink ON THE BAND — see the docblock. A token, always. */
  removeColor: string;
  /** The `×`'s face, where a skin letters its chrome in its own hand. */
  removeStyle?: CSSProperties;
  /** The sticker's own paint: ground, border, radius, shadow, tilt, face. */
  style?: CSSProperties;
  /** The body row's own paint or inset, where a skin needs more than the kit's. */
  bodyStyle?: CSSProperties;
  className?: string;
}

export default function SealShell({
  band,
  condition,
  mark,
  removable,
  onRemove,
  removeColor,
  removeStyle,
  style,
  bodyStyle,
  className,
}: SealShellProps) {
  const { t } = useTranslation("praxis");

  return (
    <div
      className={className ? `relative ${className}` : "relative"}
      style={{
        /* `overflow: hidden` is the band's, not decoration: the band is
           full-bleed and the sticker is rounded, so without it a painted band
           squares off the two top corners of every skin that has any. */
        overflow: "hidden",
        ...style,
      }}
    >
      {band}

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("detail.seal.remove")}
          className="absolute font-body leading-none"
          style={{
            top: "var(--space-sm)",
            right: "var(--space-sm)",
            /* Over the band, which sets `z-index: 2` on itself. */
            zIndex: 3,
            background: "transparent",
            border: "none",
            color: removeColor,
            fontSize: "var(--text-xl)",
            cursor: "pointer",
            ...removeStyle,
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          padding: "var(--space-md) var(--space-lg)",
          ...bodyStyle,
        }}
      >
        {/* `minWidth: 0` so a long condition wraps instead of shouldering the
            mark off the right edge — the mark's column is what lines the nine
            seals up, so it is the one thing that may not move. */}
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>{condition}</div>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center" }}>{mark}</div>
      </div>
    </div>
  );
}
