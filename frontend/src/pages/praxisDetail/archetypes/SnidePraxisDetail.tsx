/**
 * S.N.I.D.E. — THE PASTE-UP (praxis detail v2, #1118, epic #1085).
 *
 * The shared praxis-detail anatomy (`DefaultPraxisDetail`, ADR-0061) in
 * S.N.I.D.E.'s dress: somebody's proof flyposted on the faction's xerox wall.
 * Receipts pasted up under a censor rule, a headline cut word by word from four
 * faces, and every block on the rail — proof, write-up, score, duel, meter,
 * tallies — bolted to the same black slab (#2066). Anton, Archivo Black, Special
 * Elite and Permanent Marker all appear, because a ransom note mixes faces by
 * definition; the grain is the wall's own raster, and the slabs are unscreened.
 *
 * ## The layout is the contract, not this file's invention
 *
 * Taken whole from the reference build and NOT re-derived (#1129 verified each
 * against the eight faction designs):
 *
 * - Desktop — breadcrumb, then main column + a **330px** aside, then a comments
 *   region beneath both. Mobile — one stacked column, back link instead of the
 *   breadcrumb, score and duel moved above the proof.
 * - Main: banners · byline · title · owner actions · task reference · proof ·
 *   write-up · crew · metatasks. Aside: score · duel · vote · voters · flag.
 * - **The crown renders at both form factors.** It is never form-factor gated —
 *   `ScoreStamp` draws it in the score block's corner off `is_top_for_task`,
 *   and that block is in both layouts (#1710 retired the hero banner).
 * - **ONE responsive component** (ADR-0063 — this surface's own; ADR-0056/0058
 *   are the same collapse on task cards and task detail): `useFormFactor()`
 *   picks the size set and collapses the split. The score and duel blocks are
 *   built once and MOVED by where they are mounted, never drawn twice and
 *   hidden.
 * - **The duel panel and the comment thread are LAYOUT SLOTS this archetype
 *   mounts** (ADR-0064), not dispatcher chrome. Nothing is mounted around the
 *   page any more, so forgetting either drops it entirely.
 *
 * ## No voice — dress only (ADR-0061)
 *
 * EVERY string on this page reads the shared neutral `detail.*` block. This
 * faction's words — "Receipts" over the proof, "Posted together by" over the
 * crew, "Extras taken" over the seals, "Your call" / "Who called it" on the
 * vote pair — are **recorded on #1119, not built**: the amendment that would
 * have voiced them was written and withdrawn the same day (2026-07-28), and
 * this skin was corrected back. S.N.I.D.E. brings the paste-up, the type, the
 * tape and the tilt; not a word.
 *
 * **Nothing takes the costume's words, and moderation does not take its dress
 * either.** The crown, flagged and failed banners, the steward bar, the report
 * card and the errors wear neutral `--color-*` tokens — the platform speaking,
 * which has to read identically on all nine pages. `PraxisFlagBlock` and
 * `PraxisAdminBar` are mounted BARE for that reason: they take `state` and
 * nothing else, so there is no seam to dress them through, and the design draws
 * them outside the costume exactly as the other seven do. The design's own
 * moderation words ("Pulled for review", "Kicked back", "Ratchet") are dress
 * notes, not authority — see the owner's caveat on #1118.
 *
 * ## Reused, not rebuilt
 *
 * `ScoreStamp` — which since #1091 carries the WHOLE score rail (the struck tag,
 * the ruled rows, the votes tally), so this file only mounts it and never
 * re-derives a term; `scoreBreakdown()` is the single authority (ADR-0053) and
 * the design's own arithmetic is not built · `VoteUI`, dispatching to
 * `SnideVote`'s amp meter · `CollabRoster` · `MediaGallery` · `MetataskSeal`,
 * READ-ONLY (`apply_metatask` requires `in_progress`, so an add chip would 422)
 * · `DuelCard`, which already implements three readings — live / won by default
 * / final — and draws nothing at all on `declined`; it is mounted, not
 * re-narrated, and no copy near it mentions stakes (S.N.I.D.E.'s duel loss
 * modifier is 0.0, ADR-0053, so any "you keep at least…" line would be a lie) ·
 * `PraxisDetailComments` with the heading handed in, which suppresses the
 * thread's own `{n} comments` `<h3>` (the #1029 two-headings trap). Comment ROWS
 * stay dispatched on `comment.author.faction_slug` — a Coven player's comment
 * reads Coven on this page, and ADR-0061 protects that explicitly.
 *
 * ## ONE ground on the wall, and it is the slab (#2066)
 *
 * The wall (`.snd-detail-sheet`, shared with the task-detail column so the two
 * pages cannot drift) FLIPS under `[data-theme="dark"]`. Everything pasted on it
 * is the same theme-INVARIANT black slab, `--faction-snide-card-*` — the
 * photocopier ink S.N.I.D.E.'s praxis card already prints its evidence on. This
 * page used to carry two grounds, the flipping xerox clipping
 * (`--faction-snide-note-*`) and that plate; the owner collapsed them, because a
 * clipping cut from the same stock as the wall stops reading as a thing pasted
 * ON something.
 *
 * **The collapse is a PAIRING move, not a repaint.** `-note-ink` is `#14110b` by
 * day and `#f4f1e8` by night, so pinning the ground black and leaving that ink
 * on it is black type on a black slab in light mode — the WOW-masthead failure
 * shape at 1.08:1. `-card-text` is cream in BOTH themes on a ground that is
 * black in both, measured as a pair. So a block that moved onto the slab took
 * the whole `-card-*` family with it, and nothing on a slab reads a token that
 * flips. What the slab also buys: S.N.I.D.E.'s own always-dark widgets no longer
 * need a ground of their own — the evidence tag (`SnideScoreStamp`) and the amp
 * face paint acid captions that fall to 2.6:1 on cream paper and measure 15.7:1
 * here, and the vote summary's `--color-text-secondary` is the one ink this file
 * does not own, which is why the vote block was already on the plate.
 *
 * Two consequences worth knowing before editing:
 *
 * - **`.snd-censor` cannot rule a head that sits ON the slab.** Its blocks are
 *   photocopier ink, invisible on black, so such a head takes the broken acid
 *   rule instead — `sectionHead(..., { onPlate: true })`. The heads on the WALL
 *   (proof, write-up, crew, metatasks, discussion) still rule with the censor
 *   and still ink with the wall's own flipping `-note-*`.
 * - **The crew keeps its invariant xerox insert** (`--faction-snide-paper`), and
 *   that is not an exception to the rule above but the same rule: `CollabRoster`
 *   fills a cast row with `--faction-snide-card-muted`, a LIGHT grey in both
 *   themes, so the roster needs a light ground of its own. Printed black on
 *   invariant stock measures 13:1 against that fill in either theme.
 *
 * The faction's standing rule survives intact: **acid and pink are held as a
 * ring, a rule or a bar on paper, never as an ink.** On the slab acid IS an ink —
 * that is exactly what a black ground buys — and it is spelt
 * `--faction-snide-card-accent` when it carries type; `--faction-snide-pink`
 * stays the drawn line and fill (the voter tallies).
 *
 * The ground belongs to the COLUMN, not the viewport (§5, the #1028 ruling): the
 * site background still shows around the page, which is why `.snide-backdrop`'s
 * `position: fixed` mount is not the one used here.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import MetataskSeal from "../../../components/metataskSeal/MetataskSeal";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { DuelCard } from "../DuelCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisDetailComments,
  MemberByline,
  bylineFaces,
  orderedMembers,
  scoreWasBanked,
  taskRefMeta,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionRoleVars } from "../../../utils/factionRoles";

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARK = "var(--faction-snide-font-marker)"; /* Permanent Marker */

/**
 * The WALL's inks — the flyposted xerox column, which FLIPS under the dark
 * cascade, so these do too. They belong to type printed straight onto the wall:
 * the headline cuts, the byline, the section heads, the task reference.
 * NOTHING ON THE SLAB READS THEM (#2066).
 */
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const RULE = "var(--faction-snide-note-rule)";
/** The pink that is TEXT (AA-walked on the wall's stock, both themes). */
const PINK_INK = "var(--faction-snide-note-pink-ink)";
/** The pink that is a DRAWN LINE or FILL — pen circle, tally bar. Invariant. */
const PINK = "var(--faction-snide-pink)";
/** Photocopier black that does NOT flip: borders printed on invariant stock. */
const HARD = "var(--faction-snide-ink)";
/** Warm xerox stock that does NOT flip — the notebook insert taped on. */
const STOCK = "var(--faction-snide-paper)";
/**
 * The SLAB — the page's one ground, black in both themes, with the ink family it
 * was measured against. Everything pasted on the wall is one of these.
 */
const PLATE = "var(--snd-read-paper)";
const PLATE_TEXT = "var(--snd-read-ink)";
const PLATE_MUTED = "var(--snd-read-quiet)";
/** Acid as the plate's INK, which is the one ground that admits it as type. */
const PLATE_ACCENT = "var(--snd-read-accent)";
/** Acid as a drawn RULE or ring. Same pigment, and never type on paper. */
const ACID = "var(--faction-snide-acid)";

/**
 * The four sources a headline is cut from — the same four `SnideTaskCard` and
 * `SnideTaskDetail` use, so one string cuts identically wherever it appears. A
 * word takes its cut by index off the praxis's own id, so no two neighbours
 * share a face. Cut 2 is a knockout and names its own pair rather than reusing
 * paper/ink: those two swap under the dark cascade, and a knockout that swaps
 * with its ground is an invisible word.
 *
 * IT RESTYLES WORDS, IT NEVER EATS THEM. The design's redaction bars belong on
 * the `.snd-censor` rule, never over a string a player wrote (#1023's ruling,
 * restated on `SnideTaskDetail`).
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: ACID,
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.8em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.7em",
    textTransform: "uppercase",
    borderBottom: `3px solid ${PINK}`,
    transform: "rotate(1.2deg)",
  },
];

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments (#1023). */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/** Initials fallback for a poster with no uploaded avatar. */
function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/**
 * One poster's photo corner: a square of invariant xerox stock, printed black
 * initials, tacked on at an angle. Squares, not discs — nothing on this wall is
 * rounded. Both pigments are theme-invariant, so the chip measures 16.8:1 in
 * either theme without the cascade having to agree with the wall behind it.
 */
function PosterChip({
  name,
  avatarUrl,
  size,
  tilt,
}: {
  name: string;
  avatarUrl: string;
  size: number;
  tilt: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: "border-box",
        background: STOCK,
        border: `2px solid ${HARD}`,
        color: HARD,
        fontFamily: IMPACT,
        fontSize: "var(--text-xl)",
        lineHeight: 1,
        transform: `rotate(${tilt}deg)`,
        boxShadow: `3px 3px 0 ${PINK}`,
      }}
    >
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

export default function SnidePraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);
  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1` under a note that it "only gates the head", because
  // `CollabRoster` then returned null below two members and drew nothing inside
  // the stock insert. Both halves are gone: the roster gates on TYPE now, so
  // this gates the head AND a section with an `awaiting` roster in it. Tested
  // POSITIVELY — a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === "collab";

  /** Special Elite, uppercase, wide — every micro-label on the wall. */
  const eyebrow: CSSProperties = {
    fontFamily: TYPE,
    fontSize: "var(--text-md)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: MUTED,
  };

  /** The same micro-label once it is pasted ON a slab, where the ink flips. */
  const plateEyebrow: CSSProperties = { ...eyebrow, color: PLATE_MUTED };

  /**
   * THE PAGE'S ONE GROUND (#2066): a black slab pasted on the wall, ruled in
   * acid, printed with the same hard shadow the clippings wore. Every block this
   * file mounts takes it — score, duel, vote, voters, proof, write-up. The
   * clipping's flipping xerox stock is gone; see the header for why.
   */
  const plate: CSSProperties = {
    background: PLATE,
    border: `2px solid ${ACID}`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: PLATE_TEXT,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  /**
   * A cut headline with a rule running out of it. The rule differs by ground:
   * `.snd-censor`'s blocks are photocopier ink, which is invisible ON the black
   * slab, so a head INSIDE one takes a broken acid rule and acid type instead.
   * `onPlate` is therefore not dress — it is which ground the head sits on.
   */
  const sectionHead = (
    label: ReactNode,
    options: { onPlate?: boolean; big?: boolean; trailing?: ReactNode } = {},
  ) => {
    const { onPlate = false, big = false, trailing } = options;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: IMPACT,
            fontSize: big
              ? desktop
                ? "var(--text-heading)"
                : "var(--text-title)"
              : "var(--text-title)",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: onPlate ? PLATE_ACCENT : INK,
          }}
        >
          {label}
        </span>
        {onPlate ? (
          <span
            aria-hidden="true"
            style={{
              flex: "1 1 20%",
              minWidth: 24,
              height: 3,
              background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            }}
          />
        ) : (
          <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
        )}
        {trailing}
      </div>
    );
  };

  // Navigation is not this skin's any more (#2102). A bespoke trail and a
  // bespoke `mobileBar` that replaced it below 768px both lived here; the
  // shared breadcrumb sits ABOVE this column at every width, on the SITE's
  // ground, where the site's own tertiary is the measured ink.

  // ── Moderation chrome — NEUTRAL, outside the costume ──────────────────────
  // The failed note comes from the shared banners — the crown hero went with
  // #1710 and the mark is the score stamp's corner fleur now. The flagged
  // notice comes from there too since #2718; it was drawn here for want of a
  // slot, and this page names no ink for it, so it keeps the same neutral
  // warning tokens and the same shared `detail.banners.*` copy every other skin
  // reads. `PraxisAdminBar` is the steward bar, mounted bare.
  const banners = (
    <>
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />
    </>
  );

  // ── Byline · title · owner actions · task reference ───────────────────────
  const header = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        {/* One photo corner per poster — a collab reads as shared before a
            single name is parsed. A payload with no member rows still credits
            its creator, so the author is always reachable from the byline. */}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          {bylineFaces(praxis).map((author, index) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <PosterChip
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={desktop ? 44 : 38}
                tilt={index % 2 === 0 ? -3 : 2.5}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {members.length > 0 ? (
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
              separatorStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: MUTED,
              }}
            />
          ) : (
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
            >
              {praxis.created_by_display_name}
            </Link>
          )}
          <div style={{ ...eyebrow, marginTop: "var(--space-xs)" }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      {/* The headline, cut from four sources word by word.
          IT MUST STAY ONE READABLE STRING: a flex row discards whitespace-only
          children, so the cuts sit in ordinary inline flow separated by REAL
          spaces (the fix #1023 made on the task card and #1035 on task detail). */}
      <h1
        style={{
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.3,
          margin: "0 0 var(--space-md)",
        }}
      >
        {(praxis.title || praxis.task_title).split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`}>
            {index > 0 ? " " : ""}
            <span
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...CUTS[(index + praxis.id) % CUTS.length],
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this praxis is a doing OF. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `2px solid ${RULE}`,
          borderBottom: `2px solid ${RULE}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span style={eyebrow}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: TYPE, color: INK, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...eyebrow, marginLeft: "auto", color: PINK_INK }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // struck tag, the ruled rows and the votes tally — dispatched on the TASK's
  // faction, so a S.N.I.D.E. task gets `SnideScoreStamp`'s evidence tag and a
  // foreign task keeps its own mark on this page. No term is restated here and
  // no arithmetic is invented: `scoreBreakdown()` is the only resolver
  // (ADR-0014/0047/0053).
  const scoreBlock = !scoreWasBanked(praxis) ? null : (
    <section style={plate}>
      {sectionHead(t("detail.score.heading"), { onPlate: true })}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* THE PAGE'S ONE MARK, IN THE CORNER (#1710). The stamp's crown was off
            here because a bordered hero panel above already drew one. The panel
            is gone (owner ruling: "just a fleur in the corner"), so the mark
            comes back to the stamp -- still one per page, still ADR-0054's. */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  );

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // Mounted, not re-narrated. It self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer owns (#1071/ADR-0059).
  //
  // On the slab, and the `ink` seam is why that is safe. The card used to arrive
  // painting `--faction-default-*`, so it needed a ground that flipped the way
  // those inks do; since #1153 it takes THIS file's inks, so the ground is now a
  // free choice and the pairing is the only constraint — every field here is
  // `-card-*`, measured on `-card-bg` in both themes. `line` draws the two
  // hairlines and the rival disc's outline, which is the "plate edge" the
  // faction rule already grants (12:1 newsprint grey on the slab), and `plate`
  // sits behind the viewer's own disc, so it is the slab itself.
  //
  // The rival's own faction hue still never reaches the card — the foreign side
  // is a disc and an outline.
  const duelBlock: ReactNode = (
    <DuelCard
      state={state}
      style={plate}
      heading={sectionHead(t("duelCrossLink.label"), { onPlate: true })}
      ink={{
        name: PLATE_TEXT,
        total: PLATE_TEXT,
        muted: PLATE_MUTED,
        line: PLATE_MUTED,
        plate: PLATE,
      }}
    />
  );

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  );

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  //
  // The amp meter is bolted to the plate: `SnideVote` paints acid and vote-off
  // captions that measure 2.6:1 on cream and 15.7:1 on ink.
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={plate}>
      {sectionHead(t("detail.vote.heading"), { onPlate: true })}
      <p
        className="content-text"
        style={{ fontFamily: MARK, margin: "0 0 var(--space-md)", color: PLATE_MUTED }}
      >
        {t("detail.vote.prompt")}
      </p>
      {/* Dispatched on the TASK's faction, so a foreign task read on this page
          still votes in its own voice (ADR-0039). Props match the reference
          build exactly — no `points`/`totalVotes`, because the score rail above
          already carries the tally (#888/#1091). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already fetched
  // by `usePraxisDetail`. Each rung is marked in pen — pink as a FILL, never as
  // ink. NO AVERAGE anywhere (ADR-0014): the standing is the sum and the count.
  const votersBlock = voters.length > 0 && (
    <section style={plate}>
      {sectionHead(
        t("detail.voters.heading"),
        {
          onPlate: true,
          trailing: (
            <span style={plateEyebrow}>
              {t("detail.voters.count", { count: voters.length })}
            </span>
          ),
        },
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="content-text"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: TYPE,
                color: PLATE_TEXT,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden="true"
              style={{
                width: 84,
                height: 10,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                // The empty part of the track is the slab's own xerox tooth —
                // `-note-rule` was a translucent BLACK here, which the black
                // ground swallowed whole in light mode.
                background: "var(--faction-snide-slab-tooth)",
                border: `1px solid ${PLATE_MUTED}`,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: PINK,
                }}
              />
            </span>
            <span
              style={{
                width: 22,
                textAlign: "right",
                fontFamily: IMPACT,
                fontSize: "var(--text-title)",
                lineHeight: 1,
                color: PLATE_TEXT,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const asideRest = (
    <>
      {voteBlock}
      {votersBlock}
      {/* NEUTRAL, and deliberately bare — no clipping, no plate (ADR-0061). */}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · write-up · crew · metatasks ───────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.proof"), { big: true })}
      <div style={plate}>
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.writeUp"), { big: true })}
      {/* The one block whose ink this file does not fully own: `.markdown-preview
          a` reads the `--link-ink` SEAM, and unset that seam is a light-cascade
          neutral which measures 2.19:1 on this slab (the figure the seam was
          built for, factionContrast.test.ts). The clipping used to flip with the
          theme and carry it; the slab does not, so the seam is repointed at the
          pair the slab was measured with — acid 15.6:1, cream 16.7:1. Shape
          taken from the Ephemerists plate, the other dark-in-light sheet. */}
      <div
        style={{
          ...plate,
          ["--link-ink" as string]: PLATE_ACCENT,
          ["--link-ink-hover" as string]: PLATE_TEXT,
        }}
      >
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: TYPE, lineHeight: 1.6, color: PLATE_TEXT }}
        />
      </div>
    </section>
  );

  // THE ONE BLOCK THAT IS NOT THE SLAB, and it is the slab's own rule that keeps
  // it off: `CollabRoster` fills a cast member's row with
  // `--faction-snide-card-muted`, a LIGHT grey in both themes, so it needs a
  // light ground under it — on the black slab that pill would sit pale-on-pale
  // with the slab's cream ink inside it. Printed black on the INVARIANT xerox
  // stock measures 13:1 against that fill in either theme (#2066 left it alone
  // deliberately; the ruling moved the clipping, not this insert).
  const crew = isCollab && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.members"), { big: true })}
      <div
        style={{
          background: STOCK,
          border: `2px solid ${HARD}`,
          boxShadow: "var(--faction-snide-note-shadow)",
          color: HARD,
          padding: "var(--space-lg)",
          boxSizing: "border-box",
        }}
      >
        <CollabRoster
          praxisType={praxis.type}
          invites={praxis.invites}
          members={praxis.members}
          currentCharacterId={state.user?.character?.id ?? null}
          factionSlug={praxis.task_faction_slug}
          taskPointValue={praxis.task_point_value}
          onKick={state.handleKickMember}
        />
      </div>
    </section>
  );

  // READ-ONLY, by construction (#1093). `MetataskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933). The design's add chips are
  // deliberately absent: `apply_metatask` requires `status == in_progress`, so
  // every chip would 422 on tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.metatasks.heading"), { big: true })}
      <MetataskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div
      className="py-8"
      style={{
        ...factionRoleVars("snide", "snd-read"),
        position: "relative",
        fontFamily: TYPE,
        color: INK,
      }}
    >
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail at every width - see components/nav/Breadcrumb. */}
      <Breadcrumb
        taskId={praxis.task_id}
        taskTitle={praxis.task_title}
        praxisId={praxis.id}
      />

      <div
        className="snd-detail-sheet"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {banners}

        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: "stretch",
            gap: desktop ? "var(--space-2xl)" : "var(--space-xl)",
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            {header}
            {/* Mobile stacks the rail above the proof — one block each, MOVED,
                never a second copy hidden at the other breakpoint. */}
            {!desktop && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-lg)",
                  marginBottom: "var(--space-xl)",
                }}
              >
                {rail}
              </div>
            )}
            {proof}
            {writeUp}
            {crew}
            {metatasks}
            {!desktop && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                {asideRest}
              </div>
            )}
          </div>

          {desktop && (
            <aside
              style={{
                flex: "0 0 330px",
                width: 330,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-lg)",
              }}
            >
              {rail}
              {asideRest}
            </aside>
          )}
        </div>

        {/* The third layout region (ADR-0064, amending ADR-0006): comments sit
            beneath both columns, inside the page's own sheet, and the layout
            draws the heading so the thread does not draw a second one. The ROWS
            stay dispatched on each author's own faction. */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(t("detail.sections.comments"), { big: true })}
          style={{ marginTop: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
        />
      </div>
    </div>
  );
}
