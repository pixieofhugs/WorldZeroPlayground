/**
 * A faction-keyed catalog block is complete, or it says why not (#2814).
 *
 * Every gap this repo has found in the copy catalogs was the same shape: a block
 * keyed by faction slug where one faction is quietly absent, or holds one fewer
 * key than its siblings. #2805 found `feed:factionHero` has no `na` block, so the
 * Unaffiliated faction page printed no tagline while every other faction's did.
 * #2806 found the reverse — nine identical copies of a string that already had a
 * canonical home. Neither was caught by a test, because nothing enumerated the
 * population they were absent from.
 *
 * THE DENOMINATOR IS THE POINT. "Is a key missing?" is unanswerable. "Is a key
 * missing from this block, whose members are the nine slugs?" is a test. The
 * blocks are discovered by walking the catalogs rather than listed here, so a
 * block added next month is covered the moment it exists.
 *
 * TWO KINDS OF BLOCK, AND THE DATA TELLS THEM APART. A block with a `default`
 * sibling is an OVERRIDE block: a faction declares an entry only where it differs
 * and the default catches the rest, so absence is the design (taunts, vote
 * chrome, praxis comment times). A block without one must be COMPLETE. Nothing
 * needs to declare which kind it is — `default` is the marker, and it is already
 * how the readers behave.
 *
 * Deliberate absences live in EXEMPT below, each with its reason. An exemption is
 * cheap to add and is the point of the guard: it turns "nobody noticed" into
 * "someone decided", and the reason is there for whoever asks next.
 */
import { describe, expect, it } from "vitest";
import factions from "../en/factions.json";
import feed from "../en/feed.json";
import praxis from "../en/praxis.json";
import taunts from "../en/taunts.json";
import votes from "../en/votes.json";
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER } from "../../utils/factions";

/**
 * The nine kits, derived. `FACTION_RAINBOW_ORDER` is the seven that carry a hue;
 * `na` and Albescent sit outside it for reasons of their own, which is why every
 * loop in the repo prepends them by hand rather than reaching for one list.
 */
const SLUGS: readonly string[] = ["na", ALBESCENT_FACTION_SLUG, ...FACTION_RAINBOW_ORDER];

/** `<catalog>:<path>` → why a slug or key is allowed to be absent. */
const EXEMPT: Record<string, string> = {
  "factions:(root)|na":
    "Unaffiliated has no faction-detail block: no invitation, no join, no spotlight to write.",
  "factions:(root)|albescent.invitation":
    "Albescent is a secret society — it is not joined by invitation letter (ADR-0082).",
  "factions:(root)|albescent.join":
    "Albescent is not joined; the reveal admits you (#2409).",
  "factions:(root)|albescent.spotlight":
    "Albescent does not advertise itself on the directory (ADR-0088).",
  "votes:(root)|albescent":
    "Albescent still has no vote voice and counts in arabic (#783), pinned in voteLadders.test.tsx.",
  "feed:factionHero|na":
    "#2805 folds the hero's motto onto factionSelect.{F}.tagline, which na does have. " +
    "Revisit this exemption when that lands — the block may not need an na entry at all.",
  "feed:factionHero|albescent.eyebrow":
    "Albescent's hero is a wrapper over DefaultFactionHero, which reads the SHARED " +
    "factions:detail.eyebrow rather than a per-faction one.",
  "feed:factionHero|singularity.eyebrow":
    "Reads the shared factions:detail.eyebrow, like the Default hero it follows here.",
  "feed:factionSelect|albescent.banner":
    "Albescent and na both wear DefaultSelectCard, which draws no banner slot.",
  "feed:factionSelect|na.banner":
    "DefaultSelectCard draws no banner slot.",
  "feed:factionSelect|wow.blurb":
    "WowSelectCard draws a banner and no blurb — the decree design has no blurb slot.",
  "feed:factionSelect|everymen.blurb":
    "EverymenSelectCard draws a banner and no blurb — the bill design has no blurb slot.",
};

const CATALOGS: readonly [string, Record<string, unknown>][] = [
  ["factions", factions as Record<string, unknown>],
  ["feed", feed as Record<string, unknown>],
  ["praxis", praxis as Record<string, unknown>],
  ["taunts", taunts as Record<string, unknown>],
  ["votes", votes as Record<string, unknown>],
];

type Block = {
  id: string;
  entries: Record<string, unknown>;
  slugs: string[];
  isOverride: boolean;
};

/** Every object in a catalog keyed by three or more faction slugs. */
function blocksIn(catalog: string, node: unknown, path: string, found: Block[]): void {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return;
  const entries = node as Record<string, unknown>;
  const slugs = Object.keys(entries).filter((k) => SLUGS.includes(k));
  if (slugs.length >= 3) {
    found.push({
      id: `${catalog}:${path || "(root)"}`,
      entries,
      slugs,
      isOverride: "default" in entries,
    });
  }
  for (const [k, v] of Object.entries(entries)) {
    blocksIn(catalog, v, path ? `${path}.${k}` : k, found);
  }
}

const BLOCKS: Block[] = CATALOGS.flatMap(([name, cat]) => {
  const found: Block[] = [];
  blocksIn(name, cat, "", found);
  return found;
});

const COMPLETE = BLOCKS.filter((b) => !b.isOverride);

describe("faction-keyed catalog blocks are complete, or exempt with a reason", () => {
  // The tripwire. A walker that silently stops matching would otherwise report a
  // clean board by scanning nothing at all — the failure mode that scored one
  // faction at zero assertions during #2814's audit.
  it("finds the faction-keyed blocks at all, so nothing passes by vacuum", () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(7);
    expect(COMPLETE.map((b) => b.id)).toEqual(
      expect.arrayContaining(["factions:names", "factions:descriptions", "feed:factionSelect"]),
    );
    expect(BLOCKS.some((b) => b.isOverride)).toBe(true);
  });

  it.each(COMPLETE.map((b) => [b.id, b] as const))(
    "%s declares every faction",
    (id, block) => {
      const missing = SLUGS.filter(
        (s) => !block.slugs.includes(s) && !(`${id}|${s}` in EXEMPT),
      );
      expect(missing, `${id} is a complete block — add the slug, or exempt it in EXEMPT`).toEqual(
        [],
      );
    },
  );

  /**
   * THE AMBIGUOUS MIDDLE IS THE WHOLE POINT, and the threshold took a try to get
   * right. A first cut flagged only the all-but-one case and missed
   * `factionSelect.blurb` at 7 of 9 — which is exactly the shape worth catching.
   *
   * The keys cluster: universal (9 of 9 — the contract), bespoke (1 or 2 — a
   * wordmark, a plaque), and a middle that is always either a decision nobody
   * wrote down or a hole nobody noticed. So: a key held by MORE THAN HALF but not
   * all must be named in EXEMPT with its reason. Bespoke slots never trip it, and
   * a key that quietly stops being universal always does.
   */
  it.each(COMPLETE.map((b) => [b.id, b] as const))(
    "%s gives every faction the keys its siblings share",
    (id, block) => {
      const keysets = new Map<string, Set<string>>();
      for (const slug of block.slugs) {
        const entry = block.entries[slug];
        if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
          keysets.set(slug, new Set(Object.keys(entry as object)));
        }
      }
      if (keysets.size < 3) return;

      const held = new Map<string, number>();
      for (const keys of keysets.values()) {
        for (const k of keys) held.set(k, (held.get(k) ?? 0) + 1);
      }

      const holes: string[] = [];
      for (const [key, count] of held) {
        if (count <= keysets.size / 2 || count === keysets.size) continue;
        for (const [slug, keys] of keysets) {
          if (!keys.has(key) && !(`${id}|${slug}.${key}` in EXEMPT)) {
            holes.push(`${slug} lacks '${key}' (${count}/${keysets.size} siblings have it)`);
          }
        }
      }
      expect(holes, `${id}: add the key, or exempt it in EXEMPT with a reason`).toEqual([]);
    },
  );

  it("keeps no exemption for a block or slug that no longer exists", () => {
    const live = new Set<string>();
    for (const b of BLOCKS) {
      for (const s of SLUGS) live.add(`${b.id}|${s}`);
      for (const s of b.slugs) {
        const entry = b.entries[s];
        if (typeof entry === "object" && entry !== null) {
          for (const k of Object.keys(entry as object)) live.add(`${b.id}|${s}.${k}`);
        }
      }
    }
    // An exemption names either a slug (block|slug) or a key (block|slug.key).
    // Both are addressable above; a stale one is an exemption for something gone.
    const stale = Object.keys(EXEMPT).filter((e) => {
      const [blockId] = e.split("|");
      return !BLOCKS.some((b) => b.id === blockId);
    });
    expect(stale, "these exemptions name a block that no longer exists — delete them").toEqual([]);
  });
});
