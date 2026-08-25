import { SnideBand } from "../../cardMasthead/factionBands";
import { WALL, WALL_PLAIN } from "../../factionMarks/snideAtoms";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import { factionRoleVars } from "../../../utils/factionRoles";

/**
 * S.N.I.D.E. — THE EVIDENCE SLAB (#842), REPOSTED ON THE WALL (#2177).
 *
 * The slab is guillotined — square corners, unbroken acid rule — with the case
 * title struck in Anton and skewed -3deg, printed onto its ground with a hard
 * 6px/8px drop shadow (no blur: it is stuck down, not floating).
 *
 * ## The ground, and its one exception
 *
 * The owner's ruling on #2177 is that S.N.I.D.E. wears ONE ground, and it is the
 * flyposted wall ({@link WALL}) the task card already wore — so the plate this
 * card printed on, `--faction-snide-card-bg`, is gone from here and the 3px
 * `-slab-tooth` dot texture goes with it: the wall carries its own raster and
 * scanline, and stacking both is noise rather than xerox.
 *
 * THE INKS COME WITH THE GROUND, and that is the whole of the work. The wall
 * FLIPS — cream by day, pitch black by night — while `-card-*` is pinned
 * near-black in BOTH themes for the slabs pasted ON that wall (#2066). Left as
 * they were, every reading ink on this card would have been cream type on a
 * cream wall in light. So the card reads the `-note-*` family, which flips with
 * the wall, and the wall's own alarm/notice/credit for the marks the shared
 * slots paint. All of it is measured on the ramp's two stops AND its two washed
 * corners, in both themes, in `factionContrast.test.ts` (SNIDE_WALL_PAIRS).
 *
 * IT ALTERNATES (#2395). On a page that already paints a pattern — one route,
 * a character profile of a player whose faction is a patterned one — the four
 * printed layers come off and the card grounds on the bare ramp
 * ({@link WALL_PLAIN}): "either burst, or plain", bare stock and never a
 * substitute texture. Faction pages are EXEMPT (owner, 2026-08-18) and claim it
 * through `useFactionBackdrop`, so S.N.I.D.E.'s own page is unchanged.
 *
 * ON TASK DETAIL IT IS BLACK. That page's column already wears the wall, and a
 * wall inside a wall stops reading as a thing pasted ON something. The switch is
 * the container's to make, so it arrives the way `--praxis-card-basis` does
 * (#1137): the detail row sets `--snd-praxis-*`, this file supplies the wall
 * half as each fallback, and `.snd-praxis-frame` / `.snd-detail-praxis` in
 * index.css carry the rest. Nothing here branches on the THEME — that is still
 * the `[data-theme]` cascade's job, and every value below is a token.
 *
 * TEXT ON THE BLACK CARD READS AS REDACTION and that is the intent, not a
 * side-effect (owner, #2177): the black IS the censor bar S.N.I.D.E. already
 * paints in `--faction-snide-note-bar`, and the card's copy is knocked out of
 * it. What it does not license is a bar over anything the reader needs, or
 * "redacted-looking" as an excuse for 2:1 type — every ink on either dress
 * clears AA in both themes, which is what the manifest above pins.
 *
 * ## What is not here
 *
 * Three pieces of chrome came off in #842, all inventions with no counterpart in
 * the vendored prototype and all pulling the slab toward a different archetype:
 * the TORN-PAPER top/bottom edges (a 25-point clip-path — the design's slab is
 * guillotined, and the tearing read as the Updates feed's aged-paper foe note);
 * the TAPE strip (and there is no strip to reconsider: #1708 retired tape from
 * every SNIDE surface); and the `Special Elite` MASTHEAD block, whose running
 * head was a single Courier eyebrow line in acid inside the text column — passed
 * to {@link PraxisBody} as `eyebrow`, the seam #841 opened for the codex. #1909
 * CUT its string (`card.masthead.snide`, "evidence locker"), so the slot ships
 * empty.
 *
 * ## THE NOTE BAR IS BACK, AS A BAND (#2185)
 *
 * #1909's reasoning is SUPERSEDED by owner ruling: the praxis masthead was
 * removed on the judgement that a card answering a task does not need a band,
 * and the owner has since decided it does. Nothing about #1909 was wrong at the
 * time — the decision changed. What heads the slab is the SAME band
 * `SnideTaskCard` wears, mounted from `cardMasthead/factionBands`, not a
 * revival of the eyebrow line: a band across the head, the brushed A hard left
 * at 24, the wordmark centred in Anton on the censor bar. The `eyebrow` slot
 * stays empty.
 *
 * The dashed acid rule above the vote widget is the design's, and is the one
 * divider the slab carries.
 */
/**
 * The wall, or the bare ramp when the PAGE is already patterned (#2395, epic
 * #2195) — the container's `--snd-praxis-ground` still overrides both, because
 * the task-detail black is a separate ruling and that column themes no backdrop.
 */
const ground = (busy: boolean) =>
  `var(--snd-praxis-ground, ${busy ? WALL_PLAIN : WALL})`;
const INK = "var(--snd-praxis-ink, var(--faction-snide-note-ink))";
const MUTED = "var(--snd-praxis-muted, var(--faction-snide-note-muted))";
/** The pink that is TEXT on the wall; acid is an ink only on a slab (#2066). */
const ACCENT = "var(--snd-praxis-accent, var(--faction-snide-note-pink-ink))";
const PAPER = "var(--snd-praxis-paper, var(--faction-snide-note-paper))";

export function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  // #2395: the ornament alternates — see `ground` above. Only the BODY TEXTURE
  // branches; the band, the acid border, the drop shadow and the dashed rule are
  // chrome and are untouched.
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      className="snd-praxis-frame"
      style={{
        ...frameBase,
        /* THE ROLE MAP UNDER ITS OWN PREFIX, NOT `--snd-praxis-*` (#2676). That
           channel is the HOST's — the task-detail row sets it to repoint this
           card's ground and inks — and declaring it here would overwrite the
           host from inside the child. `--snd-pcard-*` is this card's own name
           for the vocabulary, so the two never meet. */
        ...factionRoleVars("snide", "snd-pcard"),
        // No borderRadius: the evidence slab has hard corners in the prototype.
        position: "relative",
        background: ground(groundIsBusy),
        border: "1.5px solid var(--faction-snide-acid-deep)",
        boxShadow: "6px 8px 0 var(--faction-snide-slab-shadow)",
        /* NO PADDING ON THE FRAME since #2185: the band is full-bleed, and an
           inset frame would have floated it off three edges. The slab's inset
           moved to the body box below. */
        fontFamily: "var(--faction-snide-font-type)",
        color: INK,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* THE NOTE BAR (#2185) — the same band `SnideTaskCard` wears, mounted
          from the shared module. Its ground is `--faction-snide-note-bar`, the
          censor bar, which is a PAINTED band rather than the wall showing
          through: the bar does not read `--snd-praxis-*`, so it is the same
          strip on the feed's wall and on task detail's black. The brushed A
          rides at 24 there and here. */}
      <SnideBand />

      <div style={{ padding: "var(--space-xl) var(--space-xl) var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={ACCENT}
          muted={MUTED}
          paper={PAPER}
          showCrown={showCrown}
          // The split earning its keep (#888): Permanent Marker is S.N.I.D.E.'s
          // declared card font and it finally reaches the card — but only where
          // identity belongs. A two-line excerpt set in it is unreadable, so the
          // body stays on the slab's Special Elite.
          fonts={{
            display: "var(--snd-pcard-face, var(--faction-snide-card-font))",
            body: "var(--faction-snide-font-type)",
          }}
          titleStyle={{
            fontFamily: "var(--faction-snide-font-impact)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1,
            transform: "skewX(-3deg)",
            color: INK,
          }}
          /* The eyebrow read "evidence locker" (`card.masthead.snide`). #1909
             cut the slot, and #2185 answered it a different way: the running
             head is a BAND across the head of the slab now, not a line inside
             the text column, so the shared eyebrow stays unfilled. */
          voteRule={
            <div
              aria-hidden
              style={{
                height: 2,
                opacity: 0.7,
                background:
                  "repeating-linear-gradient(90deg, var(--faction-snide-acid-deep) 0 6px, transparent 6px 11px)",
                margin: "var(--space-lg) 0 var(--space-md)",
              }}
            />
          }
        />
      </div>
    </div>
  );
}

export default SnidePraxisCard;
