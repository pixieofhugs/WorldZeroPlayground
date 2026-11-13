/**
 * A faction-keyed catalog block is complete, or says why not (#2814).
 * Blocks are discovered by walking the catalogs, so new ones are covered. A
 * block with a `default` sibling is an OVERRIDE block (absence is by design);
 * one without must be COMPLETE. Deliberate absences go in EXEMPT with a reason.
 */
import { describe, expect, it } from "vitest";
import factions from "../en/factions.json";
import feed from "../en/feed.json";
import praxis from "../en/praxis.json";
import taunts from "../en/taunts.json";
import votes from "../en/votes.json";
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER } from "../../utils/factions";

/** The nine kits: `na` and Albescent sit outside FACTION_RAINBOW_ORDER. */
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
    "Revisited when #2805 landed, and it stays: the hole this exemption was hiding is " +
    "closed rather than papered over. The motto — the one slot na was missing — is gone " +
    "from the block entirely and every hero reads factionSelect.{F}.tagline, which na has. " +
    "What is left under factionHero is each faction's own eyebrow and members noun, and " +
    "na's hero draws neither: DefaultFactionHero takes the SHARED factions:detail.eyebrow " +
    "and factionHero.stats.members. So there is no na entry to write.",
  "feed:factionHero|albescent.eyebrow":
    "Albescent's hero is a wrapper over DefaultFactionHero, which reads the SHARED " +
    "factions:detail.eyebrow rather than a per-faction one.",
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

/** Keys one level in (`status.locked`) too: top-level alone missed #3138. */
function keysOf(entry: unknown): Set<string> {
  const keys = new Set<string>();
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return keys;
  for (const [k, v] of Object.entries(entry)) {
    keys.add(k);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      for (const sub of Object.keys(v)) keys.add(`${k}.${sub}`);
    }
  }
  return keys;
}

describe("faction-keyed catalog blocks are complete, or exempt with a reason", () => {
  // Tripwire: a walker that stops matching would pass by scanning nothing.
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
   * A key held by more than half but not all siblings must be exempt with a
   * reason; universal and bespoke (1-2) keys never trip it. (All-but-one alone
   * missed `factionSelect.blurb` at 7 of 9.)
   */
  it.each(COMPLETE.map((b) => [b.id, b] as const))(
    "%s gives every faction the keys its siblings share",
    (id, block) => {
      const keysets = new Map<string, Set<string>>();
      for (const slug of block.slugs) {
        const entry = block.entries[slug];
        if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
          keysets.set(slug, keysOf(entry));
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
          // Exempting a whole object covers its keys.
          const parent = key.split(".")[0];
          if (!keys.has(key) && !(`${id}|${slug}.${key}` in EXEMPT) && !(`${id}|${slug}.${parent}` in EXEMPT)) {
            holes.push(`${slug} lacks '${key}' (${count}/${keysets.size} siblings have it)`);
          }
        }
      }
      expect(holes, `${id}: add the key, or exempt it in EXEMPT with a reason`).toEqual([]);
    },
  );

  /**
   * The select card's contract (#3130 / #3138): tagline, blurb, status.*, cta.
   * Exact, because the more-than-half rule lets bespoke keys through.
   */
  it("feed:factionSelect holds the select card's keys for every faction, and nothing else", () => {
    const want = ["blurb", "cta", "status", "status.eligible", "status.locked", "status.member", "tagline"];
    const block = feed.factionSelect as Record<string, unknown>;
    expect(Object.keys(block).sort()).toEqual([...SLUGS].sort());
    for (const slug of SLUGS) {
      expect([...keysOf(block[slug])].sort(), `feed:factionSelect.${slug}`).toEqual(want);
    }
  });

  it("keeps no exemption for a block or slug that no longer exists", () => {
    const live = new Set<string>();
    for (const b of BLOCKS) {
      for (const s of SLUGS) live.add(`${b.id}|${s}`);
      for (const s of b.slugs) {
        const entry = b.entries[s];
        if (typeof entry === "object" && entry !== null) {
          for (const k of keysOf(entry)) live.add(`${b.id}|${s}.${k}`);
        }
      }
    }
    const stale = Object.keys(EXEMPT).filter((e) => {
      const [blockId] = e.split("|");
      return !BLOCKS.some((b) => b.id === blockId);
    });
    expect(stale, "these exemptions name a block that no longer exists — delete them").toEqual([]);

    // An exemption whose hole was filled is stale too (#2997): the loops
    // stop looking once EXEMPT names it, so its reason would silently go false.
    const filled = Object.keys(EXEMPT).filter((e) => {
      const [blockId, target] = e.split("|");
      const block = BLOCKS.find((b) => b.id === blockId);
      if (!block || !target) return false;
      const dot = target.indexOf(".");
      // `block|slug` excuses a missing slug; `block|slug.key` a missing key.
      if (dot === -1) return block.slugs.includes(target);
      return keysOf(block.entries[target.slice(0, dot)]).has(target.slice(dot + 1));
    });
    expect(
      filled,
      "these exemptions excuse something that is now PRESENT — the hole is filled, so delete the exemption rather than leave a reason that reads false",
    ).toEqual([]);
  });
});
