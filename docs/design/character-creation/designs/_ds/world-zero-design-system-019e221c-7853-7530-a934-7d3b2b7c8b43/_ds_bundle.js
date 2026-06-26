/* @ds-bundle: {"format":3,"namespace":"WorldZeroDesignSystem_019e22","components":[{"name":"FactionPraxisCard","sourcePath":"components/cards/FactionPraxisCard.jsx"},{"name":"FactionTaskCard","sourcePath":"components/cards/FactionTaskCard.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"LevelPill","sourcePath":"components/core/LevelPill.jsx"},{"name":"PageTitle","sourcePath":"components/core/PageTitle.jsx"},{"name":"SLUG_ALIAS","sourcePath":"components/core/factions.js"},{"name":"FACTIONS","sourcePath":"components/core/factions.js"},{"name":"FACTION_ORDER","sourcePath":"components/core/factions.js"},{"name":"FactionCommentBox","sourcePath":"components/feedback/FactionCommentBox.jsx"},{"name":"FactionVoteStamps","sourcePath":"components/feedback/FactionVoteStamps.jsx"},{"name":"FactionPennant","sourcePath":"components/filters/FactionPennant.jsx"},{"name":"FilterStamp","sourcePath":"components/filters/FilterStamp.jsx"},{"name":"LevelNodes","sourcePath":"components/filters/LevelNodes.jsx"},{"name":"WatercolorBackground","sourcePath":"components/layout/WatercolorBackground.jsx"}],"sourceHashes":{"components/cards/FactionPraxisCard.jsx":"f81be4dd4d3e","components/cards/FactionTaskCard.jsx":"40b19bfe124d","components/core/Button.jsx":"6d6a3045496f","components/core/LevelPill.jsx":"9d1b9a30b9ce","components/core/PageTitle.jsx":"cbcaddc0b157","components/core/factions.js":"86b53063d7c5","components/feedback/FactionCommentBox.jsx":"c0aa4d752126","components/feedback/FactionVoteStamps.jsx":"e10241887b6e","components/filters/FactionPennant.jsx":"6b08a2d8d7c4","components/filters/FilterStamp.jsx":"6647e5f56bf1","components/filters/LevelNodes.jsx":"9b1a782d21c6","components/layout/WatercolorBackground.jsx":"96242fe017ed"},"inlinedExternals":[],"unexposedExports":[{"name":"canonicalSlug","sourcePath":"components/core/factions.js"},{"name":"factionColor","sourcePath":"components/core/factions.js"},{"name":"factionCssVar","sourcePath":"components/core/factions.js"},{"name":"factionName","sourcePath":"components/core/factions.js"}]} */

(() => {

const __ds_ns = (window.WorldZeroDesignSystem_019e22 = window.WorldZeroDesignSystem_019e22 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — World Zero's core action control.
 *
 * Two variants drawn straight from index.css: `primary` (solid ink fill,
 * inverts in dark mode via the cascade) and `outline` (frosted surface +
 * strong border). All-uppercase Courier Prime, wide tracking, no rounding.
 * Hover is a flat opacity drop to 0.85 — never a color shift or shadow.
 *
 * Per World Zero rule: never render a disabled button for a permission gate —
 * hide the control instead. `disabled` is only for in-flight async / form
 * validity.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: 7,
      padding: "2px 8px",
      letterSpacing: "0.1em"
    },
    md: {
      fontSize: 9,
      padding: "0.5rem 1rem",
      letterSpacing: "0.12em"
    },
    lg: {
      fontSize: 11,
      padding: "0.6rem 1.4rem",
      letterSpacing: "0.12em"
    }
  };
  const base = {
    fontFamily: "var(--font-body)",
    textTransform: "uppercase",
    border: variant === "outline" ? "1px solid var(--color-border-strong)" : "none",
    background: variant === "outline" ? "var(--color-bg-surface)" : "var(--color-text-primary)",
    color: variant === "outline" ? "var(--color-text-primary)" : "var(--color-bg-page)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "opacity 150ms",
    ...sizes[size],
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: base,
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.opacity = "0.85";
    },
    onMouseLeave: e => {
      if (!disabled) e.currentTarget.style.opacity = "1";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/PageTitle.jsx
try { (() => {
const UNDERLINE_COLORS = ["var(--underline-1)", "var(--underline-2)", "var(--underline-3)", "var(--underline-4)", "var(--underline-5)", "var(--underline-6)"];

/**
 * PageTitle — Lora italic heading where every letter gets its own colored
 * underline bar, cycling through the six-color title palette. Spaces render
 * as gaps with no bar. This is World Zero's signature page header.
 */
function PageTitle({
  title,
  eyebrow
}) {
  let colorIndex = 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, eyebrow && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      color: "var(--color-text-tertiary)",
      marginBottom: 4
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 500,
      lineHeight: 1.15,
      fontSize: "var(--text-4xl)",
      color: "var(--color-text-primary)",
      margin: 0
    }
  }, title.split("").map((char, index) => {
    if (char === " ") {
      return /*#__PURE__*/React.createElement("span", {
        key: index,
        style: {
          display: "inline-block",
          width: "0.3em"
        }
      });
    }
    const color = UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length];
    colorIndex++;
    return /*#__PURE__*/React.createElement("span", {
      key: index,
      style: {
        borderBottom: `4px solid ${color}`,
        paddingBottom: 2
      }
    }, char);
  })));
}
Object.assign(__ds_scope, { PageTitle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PageTitle.jsx", error: String((e && e.message) || e) }); }

// components/core/factions.js
try { (() => {
/**
 * Faction config + CSS-variable helpers for World Zero components.
 * Mirrors frontend/src/utils/factions.ts. The CSS custom properties in
 * tokens/colors.css are the parallel source of truth — these two must stay
 * in sync. Use factionCssVar() in inline styles so dark mode resolves
 * automatically through the cascade.
 *
 * The roster is SEVEN factions — the six-faction rainbow spine plus
 * Albescent, an always-light "vellum correspondence" faction that sits
 * outside the rainbow (no hue — near-black ink on white). (Analog and UA
 * Masters were retired; the Journeymen were rebranded as the Ephemerists;
 * Gestalt was renamed the Warriors of Whimsy (slug `wow`); the Everymen
 * were added to claim the rainbow's missing red; Albescent was added as
 * the unranked secret society.)
 */

/**
 * Renamed / legacy slugs → their live canonical slug. Old data, old links,
 * and component switches resolve through this first.
 *   gestalt    → wow         (Gestalt renamed the Warriors of Whimsy)
 *   journeymen → ephemerists (Journeymen rebranded the Ephemerists)
 *   aged_out   → ua
 */
const SLUG_ALIAS = {
  gestalt: "wow",
  journeymen: "ephemerists",
  aged_out: "ua"
};

/** Resolve any slug (including a renamed/legacy alias) to its canonical slug. */
function canonicalSlug(slug) {
  return SLUG_ALIAS[slug ?? ""] ?? slug ?? "";
}

/**
 * Canonical slug → CSS key. The CSS custom-property prefix can differ from
 * the slug when a faction is renamed but keeps its existing token names —
 * e.g. `wow` still draws on the historical `--faction-gestalt-*` / `--gestalt-*`
 * palette, so its CSS key stays "gestalt".
 */
const CSS_KEY = {
  ua: "ua",
  wow: "gestalt",
  snide: "snide",
  ephemerists: "ephemerists",
  singularity: "singularity",
  everymen: "everymen",
  albescent: "albescent"
};

/** Display registry — name + light-mode hex (for canvas/SVG only; prefer CSS vars). */
const FACTIONS = {
  ua: {
    slug: "ua",
    name: "UA",
    color: "#c2541f",
    archetype: "Gilt Salon"
  },
  wow: {
    slug: "wow",
    name: "Warriors of Whimsy",
    color: "#be185d",
    archetype: "Whimsy.exe Desktop"
  },
  snide: {
    slug: "snide",
    name: "S.N.I.D.E.",
    color: "#16a34a",
    archetype: "Ransom Dispatch"
  },
  ephemerists: {
    slug: "ephemerists",
    name: "The Ephemerists",
    color: "#1d6e72",
    archetype: "Discordant Map"
  },
  singularity: {
    slug: "singularity",
    name: "Singularity",
    color: "#2563eb",
    archetype: "Terminal Printout"
  },
  everymen: {
    slug: "everymen",
    name: "The Everymen",
    color: "#c1272d",
    archetype: "Union Poster"
  },
  albescent: {
    slug: "albescent",
    name: "Albescent",
    color: "#1c1c1a",
    archetype: "Vellum Correspondence"
  }
};

/** Ordered list of the seven selectable/displayed factions. */
const FACTION_ORDER = ["ua", "wow", "snide", "ephemerists", "singularity", "everymen", "albescent"];

/**
 * CSS variable reference for a faction property.
 * Suffixes: (none)=primary, 'light', 'border', 'card-bg', 'card-text',
 * 'card-accent', 'card-muted', 'card-font'.
 */
function factionCssVar(slug, suffix) {
  const key = CSS_KEY[canonicalSlug(slug)] ?? "ua";
  const prop = suffix ? `--faction-${key}-${suffix}` : `--faction-${key}`;
  return `var(${prop})`;
}

/** Raw light-mode hex by slug (canvas/SVG use only). */
function factionColor(slug) {
  return FACTIONS[canonicalSlug(slug)]?.color ?? "#6b6a7a";
}

/** Display name by slug. */
function factionName(slug) {
  return FACTIONS[canonicalSlug(slug)]?.name ?? "Unaffiliated";
}
Object.assign(__ds_scope, { SLUG_ALIAS, canonicalSlug, FACTIONS, FACTION_ORDER, factionCssVar, factionColor, factionName });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/factions.js", error: String((e && e.message) || e) }); }

// components/core/LevelPill.jsx
try { (() => {
/**
 * LevelPill — the small dark capsule showing a task's level requirement.
 * Shared by every faction card. Pass `factionSlug` to tint it with that
 * faction's card accent; omit for the neutral ink/paper pill.
 */
function LevelPill({
  level,
  factionSlug
}) {
  const bg = factionSlug ? __ds_scope.factionCssVar(factionSlug, "card-accent") : "var(--color-text-primary)";
  const fg = factionSlug ? __ds_scope.factionCssVar(factionSlug, "card-bg") : "var(--color-bg-page)";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: bg,
      color: fg,
      fontSize: 7,
      padding: "1px 6px",
      borderRadius: 6,
      textTransform: "uppercase",
      fontFamily: "var(--font-body)",
      letterSpacing: "0.08em"
    }
  }, "lvl ", level);
}
Object.assign(__ds_scope, { LevelPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/LevelPill.jsx", error: String((e && e.message) || e) }); }

// components/cards/FactionPraxisCard.jsx
try { (() => {
/**
 * FactionPraxisCard — the companion to FactionTaskCard. A *praxis* is a filed
 * submission for a task: a finding/account someone logged, which the faction
 * then votes on. Each faction reframes World Zero's 1–5 vote in its own
 * vocabulary, and renders the praxis as a card in its own physical language:
 *
 *   ua          → gilt salon placard, filed (the Critique: rough sketch → masterwork)
 *   gestalt     → praxis.exe window (heart marks: a start → legendary)
 *   snide       → closed-case file (the mob's stamped marks)
 *   ephemerists → sealed ephemeris leaf (the concordance: apocryphal → canonical)
 *   singularity → terminal praxis log (ascii rating bar)
 *   everymen    → union work report, filed (the crew's star marks)
 *   albescent   → the register, witnessed (the witness ramp: unseeing → inscribed)
 *
 * Props mirror a real praxis: the `task` it answers, the `finding` headline,
 * the `author`, a short `excerpt`, a `rating` (1–5 average, rounded for the
 * meter), the `marks` count (how many voted), plus `points` / `level`.
 */
function FactionPraxisCard({
  faction = "ua",
  task,
  finding,
  author = "Anon",
  excerpt,
  rating = 4,
  marks = 0,
  points = 0,
  level = 1
}) {
  const props = {
    task,
    finding,
    author,
    excerpt,
    rating,
    marks,
    points,
    level
  };
  switch (faction) {
    case "wow":
    case "gestalt":
      return /*#__PURE__*/React.createElement(GestaltPraxis, props);
    case "snide":
      return /*#__PURE__*/React.createElement(SnidePraxis, props);
    case "ephemerists":
    case "journeymen":
      return /*#__PURE__*/React.createElement(EphemeristsPraxis, props);
    case "singularity":
      return /*#__PURE__*/React.createElement(SingularityPraxis, props);
    case "everymen":
      return /*#__PURE__*/React.createElement(EverymenPraxis, props);
    case "albescent":
      return /*#__PURE__*/React.createElement(AlbescentPraxis, props);
    case "ua":
    default:
      return /*#__PURE__*/React.createElement(UAPraxis, props);
  }
}
const clamp = r => Math.max(0, Math.min(5, Math.round(r)));

/* ── UA — Gilt salon placard, filed (the Critique) ── */
const UA_CRITIQUE = ["rough sketch", "study", "fair hand", "fine work", "masterwork"];
function UAPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 232,
      padding: 6,
      background: "var(--ua-gilt)",
      transform: "rotate(-0.5deg)",
      boxShadow: "0 12px 26px rgba(60,40,10,0.24), inset 0 0 0 1px rgba(255,255,255,0.45)",
      fontFamily: "'EB Garamond', Georgia, serif"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid rgba(60,40,10,0.4)",
      background: __ds_scope.factionCssVar("ua", "card-bg"),
      padding: "16px 17px 14px",
      color: __ds_scope.factionCssVar("ua", "card-text"),
      backgroundImage: "radial-gradient(rgba(60,40,10,0.03) 1px, transparent 1px)",
      backgroundSize: "5px 5px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 8,
      letterSpacing: "0.12em",
      color: __ds_scope.factionCssVar("ua", "card-accent")
    }
  }, "Acquisition \xB7 re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: __ds_scope.factionCssVar("ua", "card-font"),
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 21,
      lineHeight: 1.14,
      margin: "5px 0 6px",
      overflowWrap: "anywhere"
    }
  }, finding), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontStyle: "italic",
      fontSize: 12,
      lineHeight: 1.5,
      color: __ds_scope.factionCssVar("ua", "card-muted")
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 9,
      letterSpacing: "0.06em",
      color: __ds_scope.factionCssVar("ua", "card-muted"),
      margin: "8px 0 11px"
    }
  }, "\u2014 ", author), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 4
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 11,
      height: 11,
      transform: "rotate(45deg)",
      background: i < r ? __ds_scope.factionCssVar("ua", "card-accent") : "transparent",
      border: `1.5px solid ${__ds_scope.factionCssVar("ua", "card-accent")}`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: __ds_scope.factionCssVar("ua", "card-font"),
      fontStyle: "italic",
      fontSize: 12,
      color: __ds_scope.factionCssVar("ua", "card-accent"),
      marginLeft: 4
    }
  }, UA_CRITIQUE[r - 1] || "awaiting")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 8,
      letterSpacing: "0.04em",
      color: __ds_scope.factionCssVar("ua", "card-muted"),
      marginBottom: 10
    }
  }, marks, " of the Salon weighed in"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid var(--ua-line-soft)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.LevelPill, {
    level: level,
    factionSlug: "ua"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: __ds_scope.factionCssVar("ua", "card-font"),
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 16,
      color: __ds_scope.factionCssVar("ua", "card-accent")
    }
  }, points, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 8,
      marginLeft: 3,
      color: __ds_scope.factionCssVar("ua", "card-muted")
    }
  }, "pts")))));
}

/* ── Gestalt — praxis.exe window (heart marks) ── */
const G_LABELS = ["a start", "solid", "good", "excellent", "legendary"];
function GHeart({
  on
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 36 36",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z",
    fill: on ? "var(--gestalt-pink)" : "none",
    stroke: on ? "#fff" : "var(--gestalt-border-soft)",
    strokeWidth: on ? 2.2 : 2,
    strokeLinejoin: "round"
  }));
}
function GestaltPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  const dot = c => ({
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: c,
    border: "1.2px solid rgba(255,255,255,0.7)"
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 236,
      borderRadius: 12,
      overflow: "hidden",
      border: "2px solid var(--gestalt-win-border)",
      boxShadow: "0 8px 20px var(--gestalt-glow)",
      fontFamily: "var(--font-body)",
      transform: "rotate(-0.6deg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 11px",
      background: "linear-gradient(180deg, var(--gestalt-title-from), var(--gestalt-title-to))",
      borderBottom: "2px solid var(--gestalt-win-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: dot("#fb7aa8")
  }), /*#__PURE__*/React.createElement("span", {
    style: dot("#f6c75e")
  }), /*#__PURE__*/React.createElement("span", {
    style: dot("#86cfa6")
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 9.5,
      color: "var(--gestalt-title-text)"
    }
  }, "praxis.exe")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 15px 16px",
      background: __ds_scope.factionCssVar("gestalt", "card-bg"),
      backgroundImage: "radial-gradient(var(--gestalt-border-soft) 1.3px, transparent 1.3px)",
      backgroundSize: "13px 13px",
      color: __ds_scope.factionCssVar("gestalt", "card-text")
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "var(--gestalt-label)",
      marginBottom: 4
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: __ds_scope.factionCssVar("gestalt", "card-font"),
      fontSize: 25,
      lineHeight: 1.0,
      color: __ds_scope.factionCssVar("gestalt", "card-text"),
      marginBottom: 6,
      overflowWrap: "anywhere"
    }
  }, finding), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: __ds_scope.factionCssVar("gestalt", "card-muted"),
      marginBottom: 8,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      fontStyle: "italic",
      color: "var(--gestalt-ink-soft)",
      marginBottom: 10
    }
  }, "filed by ", author), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      marginBottom: 4
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement(GHeart, {
    key: i,
    on: i < r
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: __ds_scope.factionCssVar("gestalt", "card-font"),
      fontSize: 16,
      color: "var(--gestalt-pink)",
      marginLeft: 4
    }
  }, G_LABELS[Math.max(0, r - 1)])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 9,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "3px 9px",
      borderRadius: 20,
      background: "var(--gestalt-pink-lt)",
      color: __ds_scope.factionCssVar("gestalt", "card-text"),
      border: "1px solid var(--gestalt-border-soft)"
    }
  }, "lvl ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--gestalt-label)"
    }
  }, marks, " hearts"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--gestalt-pink-deep)"
    }
  }, points, " pts"))));
}

/* ── S.N.I.D.E. — Closed-case file (the mob's marks) ── */
function SnidePraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 252,
      position: "relative",
      background: __ds_scope.factionCssVar("snide", "card-bg"),
      color: "#fff",
      padding: "26px 18px 18px",
      fontFamily: "var(--font-body)",
      overflow: "hidden",
      boxShadow: "6px 8px 0 rgba(0,0,0,0.28)",
      transform: "rotate(-1deg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: "radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)",
      backgroundSize: "5px 5px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -9,
      left: 26,
      width: 54,
      height: 20,
      background: "var(--snide-tape)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      transform: "rotate(-8deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderBottom: "2px solid var(--snide-acid)",
      paddingBottom: 6,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontSize: 14,
      letterSpacing: "0.2em",
      color: "var(--snide-acid)"
    }
  }, "S.N.I.D.E. \xB7 CASE CLOSED")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      fontSize: 8,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#8f9183",
      marginBottom: 5
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-anton)",
      fontSize: 26,
      lineHeight: 0.94,
      letterSpacing: "0.02em",
      transform: "skewX(-4deg)",
      marginBottom: 8,
      overflowWrap: "anywhere"
    }
  }, finding), excerpt && /*#__PURE__*/React.createElement("p", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-typewriter)",
      fontSize: 10,
      lineHeight: 1.5,
      color: "#d8d6c8",
      margin: "0 0 8px"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-marker)",
      fontSize: 13,
      color: "var(--snide-pink)",
      transform: "rotate(-1deg)",
      marginBottom: 12
    }
  }, "confessed by ", author), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 4,
      marginBottom: 11
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 16,
      height: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: i < r ? "var(--snide-acid)" : "transparent",
      color: "var(--snide-ink)",
      border: `1.5px solid ${i < r ? "var(--snide-acid)" : "#6b6d60"}`,
      fontFamily: "var(--font-faction-black)",
      fontSize: 9,
      transform: `rotate(${i % 2 ? 4 : -4}deg)`
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontSize: 11,
      letterSpacing: "0.1em",
      color: "#cfd1c4",
      marginLeft: 5
    }
  }, marks, " MARKS")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-anton)",
      fontSize: 22,
      color: "var(--snide-acid)"
    }
  }, points, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      marginLeft: 2
    }
  }, "PTS")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontSize: 11,
      letterSpacing: "0.1em",
      border: "1.5px dashed #6b6d60",
      color: "#cfd1c4",
      padding: "2px 7px",
      transform: "rotate(2deg)"
    }
  }, "LVL ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      background: "var(--snide-pink)",
      color: "#fff",
      fontFamily: "var(--font-faction-black)",
      fontSize: 10,
      padding: "5px 9px",
      transform: "rotate(-3deg)",
      boxShadow: "2px 3px 0 rgba(0,0,0,0.4)"
    }
  }, "VERDICT \u2197")));
}

/* ── Ephemerists — sealed leaf (the concordance) ── */
const CONCORD = [{
  fill: "var(--eph-gold)",
  label: "apocryphal"
}, {
  fill: "var(--eph-verdigris)",
  label: "disputed"
}, {
  fill: "var(--eph-lapis)",
  label: "plausible"
}, {
  fill: "var(--eph-rubric)",
  label: "corroborated"
}, {
  fill: "var(--eph-ink)",
  label: "canonical"
}];
const ROMAN = ["I", "II", "III", "IV", "V"];
function EphemeristsPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  const tw = (finding || "").trim().split(" ");
  const tlast = tw.pop();
  const st = CONCORD[Math.max(0, r - 1)];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 232,
      position: "relative",
      overflow: "hidden",
      background: __ds_scope.factionCssVar("ephemerists", "card-bg"),
      color: __ds_scope.factionCssVar("ephemerists", "card-text"),
      border: "1.5px solid var(--eph-ink)",
      fontFamily: "var(--font-faction-codex)",
      padding: "11px 14px 13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      color: "var(--eph-rubric)",
      borderBottom: "1px solid var(--eph-gold-deep)",
      paddingBottom: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 600,
      fontSize: 8,
      letterSpacing: "0.18em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--eph-lapis)",
    strokeWidth: "1.4"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "12",
    rx: "11",
    ry: "4.4",
    transform: "rotate(-24 12 12)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2.7"
  })), "Ephemeris entry"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontSize: 8.5,
      color: "var(--eph-muted)"
    }
  }, "\u2726 sealed")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontStyle: "italic",
      fontSize: 9,
      color: "var(--eph-rubric)",
      marginBottom: 3
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 700,
      fontSize: 21,
      lineHeight: 0.98,
      marginBottom: 5,
      color: __ds_scope.factionCssVar("ephemerists", "card-text")
    }
  }, tw.join(" "), tw.length ? " " : "", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-lapis)"
    }
  }, tlast), /*#__PURE__*/React.createElement("sup", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontSize: 9,
      color: "var(--eph-lapis)",
      fontWeight: 400
    }
  }, "\u2020")), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      lineHeight: 1.45,
      fontStyle: "italic",
      color: "var(--eph-muted)",
      marginBottom: 8,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: "var(--eph-muted)",
      marginBottom: 9
    }
  }, "filed by ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: __ds_scope.factionCssVar("ephemerists", "card-text")
    }
  }, author)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 3,
      height: 26
    }
  }, CONCORD.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 7,
      height: 6 + i * 5,
      background: c.fill === "var(--eph-ink)" && i + 1 !== r ? c.fill : c.fill,
      opacity: i + 1 <= r ? 1 : 0.28
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 800,
      fontSize: 17,
      lineHeight: 1,
      color: st.fill === "var(--eph-ink)" ? "var(--eph-vellum-text)" : st.fill
    }
  }, rating.toFixed(1)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontStyle: "italic",
      fontSize: 9,
      color: "var(--eph-muted)"
    }
  }, st.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--eph-muted)"
    }
  }, marks, " marks"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      fontSize: 8,
      borderTop: "1px dashed color-mix(in srgb, var(--eph-vellum-text) 26%, transparent)",
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: __ds_scope.factionCssVar("ephemerists", "card-text")
    }
  }, "\u25A6 grade ", ROMAN[Math.max(0, Math.min(4, level - 1))]), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-gold-deep)"
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 700,
      fontSize: 12,
      color: "var(--eph-rubric)"
    }
  }, points, " pvncta")));
}

/* ── Singularity — terminal praxis log (ascii bar) ── */
function SingularityPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  const bar = "█".repeat(r) + "░".repeat(5 - r);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 232,
      background: "var(--faction-singularity-card-bg)",
      border: "1px solid var(--faction-singularity-border-hard)",
      position: "relative",
      fontFamily: __ds_scope.factionCssVar("singularity", "card-font"),
      color: "var(--faction-singularity-card-text)",
      overflow: "hidden",
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
      pointerEvents: "none",
      zIndex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: "var(--faction-singularity-card-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      marginBottom: 6
    }
  }, "praxis.log \xB7 sealed", /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 5,
      height: 9,
      background: "var(--faction-singularity-card-text)",
      marginLeft: 3,
      verticalAlign: "middle",
      animation: "wz-blink 1s step-end infinite"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      color: "var(--faction-singularity-card-muted)",
      marginBottom: 6
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.25,
      marginBottom: 6,
      overflowWrap: "anywhere"
    }
  }, "> ", finding), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "var(--faction-singularity-card-muted)",
      lineHeight: 1.5,
      marginBottom: 7,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "var(--faction-singularity-card-muted)",
      marginBottom: 8
    }
  }, "filed_by: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--faction-singularity-card-text)"
    }
  }, author)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      letterSpacing: "0.08em",
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--faction-singularity-card-text)"
    }
  }, "[", bar, "]"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--faction-singularity-card-muted)",
      fontSize: 8,
      marginLeft: 6
    }
  }, rating.toFixed(1), "/5 \xB7 ", marks, " votes")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "1px solid var(--faction-singularity-border-hard)",
      paddingTop: 6,
      fontSize: 8,
      color: "var(--faction-singularity-card-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "PTS: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--faction-singularity-card-text)",
      fontSize: 11,
      fontWeight: 700
    }
  }, points)), /*#__PURE__*/React.createElement("span", {
    style: {
      border: "1px solid var(--faction-singularity-card-text)",
      color: "var(--faction-singularity-card-text)",
      padding: "1px 6px",
      borderRadius: 6,
      textTransform: "uppercase"
    }
  }, "lvl ", level))), /*#__PURE__*/React.createElement("style", null, `@keyframes wz-blink { 50% { opacity: 0; } }`));
}

/* ── Albescent — returned account, witnessed (the witness ramp) ── */
const AL_WITNESS = ["unseeing", "glimpsed", "witnessed", "verified", "inscribed"];
function AlPraxisMark({
  size = 16
}) {
  const c = size / 2,
    rO = size * 0.43,
    rI = size * 0.235,
    rD = size * 0.05;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    fill: "none",
    style: {
      display: "block",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rO,
    stroke: "var(--faction-albescent-card-text)",
    strokeWidth: size * 0.05,
    opacity: 0.2
  }), /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rI,
    stroke: "var(--faction-albescent-card-text)",
    strokeWidth: size * 0.07,
    opacity: 0.55
  }), /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rD,
    fill: "var(--faction-albescent-card-text)"
  }));
}
function AlbescentPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  const shades = ["rgba(0,0,0,0.16)", "rgba(0,0,0,0.30)", "rgba(0,0,0,0.48)", "rgba(0,0,0,0.66)", "rgba(0,0,0,0.84)"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 224,
      background: __ds_scope.factionCssVar("albescent", "card-bg"),
      border: "1px solid var(--faction-albescent-border)",
      boxShadow: "var(--al-shadow)",
      padding: "18px 20px 16px",
      fontFamily: __ds_scope.factionCssVar("albescent", "card-font"),
      color: __ds_scope.factionCssVar("albescent", "card-text")
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--al-border-faint)",
      paddingBottom: 9,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-body)",
      fontSize: 6.5,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: __ds_scope.factionCssVar("albescent", "card-muted")
    }
  }, /*#__PURE__*/React.createElement(AlPraxisMark, {
    size: 13
  }), " the register"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontStyle: "italic",
      fontSize: 9,
      color: __ds_scope.factionCssVar("albescent", "card-muted")
    }
  }, "returned")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 7,
      letterSpacing: "0.06em",
      color: __ds_scope.factionCssVar("albescent", "card-muted"),
      marginBottom: 4
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontStyle: "italic",
      fontWeight: 300,
      fontSize: 18,
      lineHeight: 1.22,
      marginBottom: 7,
      overflowWrap: "anywhere"
    }
  }, finding), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 7.5,
      lineHeight: 1.6,
      color: __ds_scope.factionCssVar("albescent", "card-muted"),
      marginBottom: 9,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontStyle: "italic",
      fontSize: 10,
      color: __ds_scope.factionCssVar("albescent", "card-muted"),
      marginBottom: 12
    }
  }, "\u2014 ", author), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      marginBottom: 11
    }
  }, shades.map((sh, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: `1.5px solid ${sh}`,
      background: i < r ? sh : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, i === r - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: "#fff"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontStyle: "italic",
      fontSize: 11,
      color: __ds_scope.factionCssVar("albescent", "card-accent"),
      marginLeft: 4
    }
  }, AL_WITNESS[Math.max(0, r - 1)])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "1px solid var(--al-border-faint)",
      paddingTop: 9,
      fontFamily: "var(--font-body)",
      fontSize: 6.5,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: __ds_scope.factionCssVar("albescent", "card-muted")
    }
  }, /*#__PURE__*/React.createElement("span", null, marks, " keepers \xB7 lvl ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: __ds_scope.factionCssVar("albescent", "card-font"),
      fontStyle: "italic",
      fontSize: 14,
      letterSpacing: 0,
      textTransform: "none",
      color: __ds_scope.factionCssVar("albescent", "card-accent")
    }
  }, points, " pts")));
}

/* ── Everymen — union work report, filed (the crew's star marks) ── */
function Star({
  on
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 1.5l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 8.7l7.1-.6z",
    fill: on ? "var(--everymen-gold)" : "none",
    stroke: on ? "var(--everymen-ink)" : "var(--everymen-muted)",
    strokeWidth: "1.2",
    strokeLinejoin: "round"
  }));
}
function EverymenPraxis({
  task,
  finding,
  author,
  excerpt,
  rating,
  marks,
  points,
  level
}) {
  const r = clamp(rating);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 224,
      background: "var(--everymen-paper)",
      color: "var(--everymen-paper-text)",
      border: "1.5px solid var(--everymen-ink)",
      boxShadow: "0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)",
      position: "relative",
      fontFamily: "var(--font-body)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--everymen-red)",
      color: "var(--everymen-cream)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-poster)",
      fontSize: 14,
      letterSpacing: "0.1em"
    }
  }, "WORK REPORT \xB7 FILED")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "13px 14px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.05,
      backgroundImage: "radial-gradient(var(--everymen-ink) 0.6px, transparent 0.7px)",
      backgroundSize: "4px 4px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--everymen-muted)",
      marginBottom: 3
    }
  }, "re: ", task), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-poster)",
      fontSize: 28,
      lineHeight: 0.96,
      marginBottom: 6,
      overflowWrap: "anywhere"
    }
  }, finding), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      lineHeight: 1.5,
      color: "var(--everymen-muted)",
      marginBottom: 7,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontStyle: "italic",
      color: "var(--everymen-muted)",
      marginBottom: 10
    }
  }, "filed by ", author), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      marginBottom: 11
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement(Star, {
    key: i,
    on: i < r
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 8,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--everymen-muted)",
      marginLeft: 5
    }
  }, marks, " marks")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "stretch",
      borderTop: "2px solid var(--everymen-ink)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--everymen-ink)",
      color: "var(--everymen-gold)",
      textAlign: "center",
      padding: "5px 0",
      fontFamily: "var(--font-faction-poster)",
      fontSize: 14
    }
  }, "LVL ", level), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--everymen-gold)",
      color: "var(--everymen-ink)",
      textAlign: "center",
      padding: "5px 0",
      fontFamily: "var(--font-faction-poster)",
      fontSize: 14
    }
  }, points, " PTS")));
}
Object.assign(__ds_scope, { FactionPraxisCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FactionPraxisCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/FactionTaskCard.jsx
try { (() => {
/**
 * FactionTaskCard — World Zero's signature component. Each faction renders a
 * COMPLETELY different physical card archetype; the card type IS the faction
 * identity. One <FactionTaskCard faction="…"> picks the right archetype.
 *
 *   ua          → gilt salon (heraldic crest in a gold frame, Playfair italic)
 *   gestalt     → gestalt.exe desktop window (title bar, traffic lights, charms)
 *   snide       → ransom dispatch (photocopier ink, cut-out letters, tape, acid spray)
 *   ephemerists → the discordant map (vellum, three feuding coordinate grids)
 *   singularity → terminal printout (always dark, scanlines, sprockets)
 *   everymen    → union / victory poster (sunburst field, knockout headline, stamp)
 *   albescent   → vellum correspondence (white cotton card, surveyor's mark, no hue)
 *
 * Cards have intentionally varied widths and live in a flex-wrap container with
 * slight rotations — never a strict grid.
 */
function FactionTaskCard({
  faction = "ua",
  title,
  description,
  level = 1,
  points = 0,
  onSignup
}) {
  const props = {
    title,
    description,
    level,
    points,
    onSignup
  };
  switch (faction) {
    case "wow":
    case "gestalt":
      return /*#__PURE__*/React.createElement(Gestalt, props);
    case "snide":
      return /*#__PURE__*/React.createElement(Snide, props);
    case "ephemerists":
    case "journeymen":
      return /*#__PURE__*/React.createElement(Ephemerists, props);
    case "singularity":
      return /*#__PURE__*/React.createElement(Singularity, props);
    case "everymen":
      return /*#__PURE__*/React.createElement(Everymen, props);
    case "albescent":
      return /*#__PURE__*/React.createElement(Albescent, props);
    case "ua":
    default:
      return /*#__PURE__*/React.createElement(UA, props);
  }
}

/* ── UA — Gilt Salon (heraldic crest in a gold frame; always-light) ── */
function UACrest({
  w = 50
}) {
  const id = "ua-tc-shield";
  return /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: w * 1.2,
    viewBox: "0 0 100 120",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("clipPath", {
    id: id
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z"
  }))), /*#__PURE__*/React.createElement("g", {
    clipPath: `url(#${id})`
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "100",
    height: "120",
    fill: "var(--ua-orange)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "60",
    width: "100",
    height: "60",
    fill: "#f8ead2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "60",
    r: "15",
    fill: "#f0b53e"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#f0b53e",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "50",
    y2: "20"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "22",
    y2: "30"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "78",
    y2: "30"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "14",
    y2: "48"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "86",
    y2: "48"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "34",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "60",
    x2: "66",
    y2: "22"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(50 84)"
  }, /*#__PURE__*/React.createElement("g", {
    transform: "rotate(38)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "-2",
    y: "-30",
    width: "4",
    height: "44",
    rx: "1.5",
    fill: "#3d2410"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-3",
    y: "10",
    width: "6",
    height: "6",
    fill: "#eab94a"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-3 16 L3 16 L1.5 26 L-1.5 26 Z",
    fill: "var(--ua-orange)"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "rotate(-38)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "-2",
    y: "-30",
    width: "4",
    height: "44",
    rx: "1.5",
    fill: "var(--ua-gold)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-3",
    y: "10",
    width: "6",
    height: "6",
    fill: "#eab94a"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-3 16 L3 16 L1.5 26 L-1.5 26 Z",
    fill: "var(--ua-gold-lt)"
  })))), /*#__PURE__*/React.createElement("path", {
    d: "M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z",
    fill: "none",
    stroke: "var(--ua-gold-lt)",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z",
    fill: "none",
    stroke: "#3d2410",
    strokeWidth: "0.8"
  }));
}
function UA({
  title,
  description,
  level,
  points,
  onSignup
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 170,
      flex: "0 0 auto",
      transform: "rotate(-0.5deg)",
      padding: 7,
      background: "var(--ua-gilt)",
      boxShadow: "0 12px 26px rgba(60,40,10,0.28), inset 0 0 0 1px rgba(255,255,255,0.45)",
      fontFamily: "'EB Garamond', Georgia, serif"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 3,
      background: "linear-gradient(135deg, var(--ua-gold), var(--ua-gold-pale))"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid rgba(60,40,10,0.45)",
      background: __ds_scope.factionCssVar("ua", "card-bg"),
      padding: "15px 14px 13px",
      textAlign: "center",
      backgroundImage: "radial-gradient(rgba(60,40,10,0.03) 1px, transparent 1px)",
      backgroundSize: "5px 5px",
      color: __ds_scope.factionCssVar("ua", "card-text")
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 8.5,
      letterSpacing: "0.13em",
      color: __ds_scope.factionCssVar("ua", "card-accent")
    }
  }, "University of Asthmatics"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      margin: "8px 0 6px"
    }
  }, /*#__PURE__*/React.createElement(UACrest, {
    w: 50
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      margin: "0 auto 11px",
      width: "94%",
      background: __ds_scope.factionCssVar("ua", "card-accent"),
      color: "#fce4c4",
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 7.5,
      letterSpacing: "0.07em",
      padding: "4px 0",
      clipPath: "polygon(0 0,100% 0,95% 50%,100% 100%,0 100%,5% 50%)"
    }
  }, "Ars Longa \xB7 Spiritus Brevis"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: __ds_scope.factionCssVar("ua", "card-font"),
      fontStyle: "italic",
      fontWeight: 600,
      fontSize: 19,
      lineHeight: 1.18,
      marginBottom: 6,
      overflowWrap: "anywhere"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'EB Garamond', Georgia, serif",
      fontStyle: "italic",
      fontSize: 10.5,
      lineHeight: 1.5,
      color: __ds_scope.factionCssVar("ua", "card-muted"),
      marginBottom: 12
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      borderTop: "1px solid var(--ua-line-soft)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.LevelPill, {
    level: level,
    factionSlug: "ua"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: __ds_scope.factionCssVar("ua", "card-font"),
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 17,
      color: __ds_scope.factionCssVar("ua", "card-accent")
    }
  }, points, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 8,
      marginLeft: 3,
      color: __ds_scope.factionCssVar("ua", "card-muted")
    }
  }, "pts"))), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      width: "100%",
      marginTop: 11,
      cursor: "pointer",
      fontFamily: "var(--font-faction-engraved-caps)",
      fontSize: 9.5,
      letterSpacing: "0.12em",
      color: "var(--ua-paper-warm)",
      background: __ds_scope.factionCssVar("ua", "card-accent"),
      border: "none",
      padding: "8px"
    }
  }, "Matriculate"))));
}

/* ════════════════════════════════════════════════════════════════
   GESTALT — gestalt.exe desktop window
   Pink computer-witch window: traffic-light title bar, dotted desktop
   body, sparkle charms, a Caveat title, heart vote, glossy CTA.
   ════════════════════════════════════════════════════════════════ */
function Sparkle({
  size = 12,
  color = "var(--gestalt-pink)",
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    style: {
      display: "block",
      ...style
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z",
    fill: color
  }));
}
function HeartGlyph({
  size = 16,
  color = "var(--gestalt-pink)"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 36 36",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z",
    fill: color,
    stroke: "#fff",
    strokeWidth: "2.2",
    strokeLinejoin: "round"
  }));
}
function Gestalt({
  title,
  description,
  level,
  points,
  onSignup
}) {
  const dot = c => ({
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: c,
    border: "1.2px solid rgba(255,255,255,0.7)"
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 232,
      flex: "0 0 auto",
      borderRadius: 12,
      overflow: "hidden",
      border: "2px solid var(--gestalt-win-border)",
      boxShadow: "0 8px 20px var(--gestalt-glow)",
      fontFamily: "var(--font-body)",
      transform: "rotate(-0.6deg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 11px",
      background: "linear-gradient(180deg, var(--gestalt-title-from), var(--gestalt-title-to))",
      borderBottom: "2px solid var(--gestalt-win-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: dot("#fb7aa8")
  }), /*#__PURE__*/React.createElement("span", {
    style: dot("#f6c75e")
  }), /*#__PURE__*/React.createElement("span", {
    style: dot("#86cfa6")
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 9.5,
      color: "var(--gestalt-title-text)"
    }
  }, "gestalt.exe")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "15px 15px 16px",
      background: __ds_scope.factionCssVar("gestalt", "card-bg"),
      backgroundImage: "radial-gradient(var(--gestalt-border-soft) 1.3px, transparent 1.3px)",
      backgroundSize: "13px 13px",
      color: __ds_scope.factionCssVar("gestalt", "card-text")
    }
  }, /*#__PURE__*/React.createElement(Sparkle, {
    size: 13,
    color: "var(--gestalt-gold)",
    style: {
      position: "absolute",
      top: 11,
      right: 13,
      transform: "rotate(8deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 8.5,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "var(--gestalt-label)",
      marginBottom: 5
    }
  }, "a little magic"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: __ds_scope.factionCssVar("gestalt", "card-font"),
      fontSize: 27,
      lineHeight: 1.0,
      color: __ds_scope.factionCssVar("gestalt", "card-text"),
      marginBottom: 7,
      overflowWrap: "anywhere"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: __ds_scope.factionCssVar("gestalt", "card-muted"),
      marginBottom: 12,
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: onSignup ? 12 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 9,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "3px 9px",
      borderRadius: 20,
      background: "var(--gestalt-pink-lt)",
      color: __ds_scope.factionCssVar("gestalt", "card-text"),
      border: "1px solid var(--gestalt-border-soft)"
    }
  }, /*#__PURE__*/React.createElement(Sparkle, {
    size: 9,
    color: "var(--gestalt-pink)"
  }), " lvl ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: __ds_scope.factionCssVar("gestalt", "card-font"),
      fontSize: 20,
      color: "var(--gestalt-pink)"
    }
  }, /*#__PURE__*/React.createElement(HeartGlyph, {
    size: 15,
    color: "var(--gestalt-pink)"
  }), " ", points)), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      width: "100%",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color: "#fff",
      padding: "9px",
      border: "1.5px solid var(--gestalt-pink-deep)",
      borderRadius: 9,
      background: "linear-gradient(180deg, var(--gestalt-pink), var(--gestalt-pink-deep))",
      boxShadow: "0 4px 10px var(--gestalt-glow)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Sparkle, {
    size: 11,
    color: "#fff"
  }), " sign up")));
}

/* ════════════════════════════════════════════════════════════════
   S.N.I.D.E. — Ransom Dispatch
   Photocopier-black demand note: acid masthead, cut-out ransom title,
   pink marker scrawl, acid points inside a sprayed pink ellipse, tape.
   ════════════════════════════════════════════════════════════════ */
const RANSOM_STYLES = [{
  bg: "var(--snide-paper)",
  col: "var(--snide-ink)",
  font: "var(--font-faction-anton)",
  rot: -5
}, {
  bg: "var(--snide-ink)",
  col: "var(--snide-acid)",
  font: "var(--font-accent)",
  rot: 4
}, {
  bg: "var(--snide-pink)",
  col: "#fff",
  font: "var(--font-faction-black)",
  rot: -3
}, {
  bg: "var(--snide-acid)",
  col: "var(--snide-ink)",
  font: "var(--font-faction-anton)",
  rot: 6
}, {
  bg: "var(--snide-paper)",
  col: "var(--snide-ink)",
  font: "var(--font-faction-typewriter)",
  rot: 2,
  italic: true
}, {
  bg: "var(--snide-ink)",
  col: "#fff",
  font: "var(--font-accent)",
  rot: -6
}];
function Ransom({
  text,
  size = 26
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flexWrap: "wrap",
      gap: "5px 3px",
      alignItems: "center"
    }
  }, [...text].map((ch, idx) => {
    if (ch === " ") return /*#__PURE__*/React.createElement("span", {
      key: idx,
      style: {
        width: size * 0.22
      }
    });
    const s = RANSOM_STYLES[(ch.charCodeAt(0) + idx * 3) % RANSOM_STYLES.length];
    return /*#__PURE__*/React.createElement("span", {
      key: idx,
      style: {
        display: "inline-block",
        background: s.bg,
        color: s.col,
        fontFamily: s.font,
        fontStyle: s.italic ? "italic" : "normal",
        fontSize: size,
        lineHeight: 0.92,
        padding: "2px 6px 0",
        transform: `rotate(${s.rot}deg)`,
        boxShadow: "1.5px 2.5px 0 rgba(0,0,0,0.4)",
        textTransform: "uppercase"
      }
    }, ch);
  }));
}
function Snide({
  title,
  description,
  level,
  points,
  onSignup
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 256,
      position: "relative",
      background: __ds_scope.factionCssVar("snide", "card-bg"),
      color: "#fff",
      padding: "28px 18px 20px",
      fontFamily: "var(--font-body)",
      overflow: "hidden",
      boxShadow: "6px 8px 0 rgba(0,0,0,0.28)",
      transform: "rotate(-1deg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: "radial-gradient(rgba(182,255,46,0.09) 32%, transparent 34%)",
      backgroundSize: "5px 5px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -10,
      left: 28,
      width: 56,
      height: 22,
      background: "var(--snide-tape)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      transform: "rotate(-8deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -8,
      right: 22,
      width: 56,
      height: 22,
      background: "var(--snide-tape)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      transform: "rotate(7deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderBottom: "2px solid var(--snide-acid)",
      paddingBottom: 6,
      marginBottom: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontSize: 15,
      letterSpacing: "0.22em",
      color: "var(--snide-acid)"
    }
  }, "S.N.I.D.E."), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7.5,
      letterSpacing: "0.16em",
      color: "#8f9183",
      textTransform: "uppercase"
    }
  }, "dispatch \u21160666")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-marker)",
      fontSize: 12,
      color: "var(--snide-pink)",
      transform: "rotate(-1.5deg)",
      marginBottom: 6
    }
  }, "your assignment, should you ignore it \u2014"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      margin: "8px 0 14px"
    }
  }, /*#__PURE__*/React.createElement(Ransom, {
    text: title,
    size: 25
  })), description && /*#__PURE__*/React.createElement("p", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-typewriter)",
      fontSize: 10.5,
      lineHeight: 1.5,
      color: "#d8d6c8",
      margin: "0 0 16px"
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      fontFamily: "var(--font-faction-anton)",
      color: "var(--snide-acid)",
      lineHeight: 0.8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 36
    }
  }, points), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      letterSpacing: "0.1em",
      marginLeft: 3
    }
  }, "PTS"), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 60",
    style: {
      position: "absolute",
      inset: "-12px -10px",
      width: "calc(100% + 20px)",
      height: "calc(100% + 24px)"
    }
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "60",
    cy: "30",
    rx: "54",
    ry: "24",
    fill: "none",
    stroke: "var(--snide-pink)",
    strokeWidth: "2.5"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontSize: 12,
      letterSpacing: "0.1em",
      border: "1.5px dashed #6b6d60",
      color: "#cfd1c4",
      padding: "3px 8px",
      transform: "rotate(2deg)"
    }
  }, "LVL ", level), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      marginLeft: "auto",
      cursor: "pointer",
      background: "var(--snide-pink)",
      color: "#fff",
      fontFamily: "var(--font-faction-black)",
      fontSize: 11,
      border: "none",
      padding: "7px 12px",
      transform: "rotate(-3deg)",
      boxShadow: "2px 3px 0 rgba(0,0,0,0.4)"
    }
  }, "I'M IN \u2197")));
}

/* ════════════════════════════════════════════════════════════════
   THE EPHEMERISTS — The Discordant Map
   One place, three irreconcilable addresses: cartesian, perspective
   and polar grids all claim the sheet and disagree. One word is always
   pulled into the lapis; a self-referential footnote points at itself.
   ════════════════════════════════════════════════════════════════ */
const ROMAN = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
function toRoman(n) {
  let s = "";
  for (const [g, v] of ROMAN) {
    while (n >= v) {
      s += g;
      n -= v;
    }
  }
  return s;
}
function EphMark({
  size = 11,
  color = "var(--eph-gold-light)"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "1.4",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "12",
    rx: "11",
    ry: "4.4",
    transform: "rotate(-24 12 12)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "0.6",
    fill: color,
    stroke: "none"
  }));
}
function Ephemerists({
  title,
  description,
  level,
  points,
  onSignup
}) {
  const tw = title.trim().split(" ");
  const tlast = tw.pop();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 214,
      minHeight: 300,
      position: "relative",
      overflow: "hidden",
      background: __ds_scope.factionCssVar("ephemerists", "card-bg"),
      color: __ds_scope.factionCssVar("ephemerists", "card-text"),
      border: "1.5px solid var(--eph-ink)",
      fontFamily: "var(--font-faction-codex)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 5,
      padding: "9px 0 4px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      color: "var(--eph-gold)"
    }
  }, /*#__PURE__*/React.createElement(EphMark, {
    size: 11,
    color: "var(--eph-gold)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 600,
      fontSize: 8.5,
      letterSpacing: "0.24em"
    }
  }, "THE EPHEMERISTS")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-codex-script)",
      fontStyle: "italic",
      fontSize: 8.5,
      color: "var(--eph-muted)",
      marginTop: 1
    }
  }, "exhibit C \xB7 no single here")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      minHeight: 188,
      margin: "2px 4px",
      border: "1px solid var(--eph-gold-deep)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.5,
      backgroundImage: "repeating-linear-gradient(0deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 16px)"
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 188",
    preserveAspectRatio: "none",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "var(--eph-lapis)",
    strokeWidth: "0.9",
    fill: "none"
  }, Array.from({
    length: 11
  }).map((_, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: i * 20,
    y1: "188",
    x2: "122",
    y2: "40"
  })), [60, 96, 124, 146, 163, 176].map((y, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: "0",
    y1: y,
    x2: "200",
    y2: y
  })))), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 188",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      opacity: 0.72
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "var(--eph-rubric)",
    strokeWidth: "0.8",
    fill: "none"
  }, [16, 34, 54, 76].map((r, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: "122",
    cy: "88",
    r: r
  })), Array.from({
    length: 12
  }).map((_, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: "122",
    y1: "88",
    x2: 122 + 80 * Math.cos(i * Math.PI / 6),
    y2: 88 + 80 * Math.sin(i * Math.PI / 6)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "61%",
      top: "47%",
      transform: "translate(-50%,-50%)",
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: "var(--eph-gold-light)",
      boxShadow: "0 0 10px 3px color-mix(in srgb, var(--eph-gold-light) 70%, transparent)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "8%",
      left: "6%",
      fontSize: 7.5,
      letterSpacing: "0.04em",
      color: "var(--eph-vellum-text)",
      background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
      padding: "1px 4px"
    }
  }, "x 14 \xB7 y ", /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: "line-through",
      opacity: 0.65
    }
  }, "8"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-lapis)",
      fontStyle: "italic"
    }
  }, "9")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "78%",
      left: "54%",
      fontSize: 7.5,
      color: "var(--eph-rubric)",
      background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
      padding: "1px 4px"
    }
  }, "r 47 \xB7 \u03B8 31\xB0"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "6%",
      left: "68%",
      fontSize: 7.5,
      color: "var(--eph-lapis)",
      background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
      padding: "1px 4px"
    }
  }, "\u221E \xB7 vanishing"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 2,
      bottom: 7,
      transformOrigin: "left bottom",
      transform: "rotate(-90deg)",
      whiteSpace: "nowrap",
      fontSize: 6,
      color: "var(--eph-muted)",
      opacity: 0.85
    }
  }, "\xBC\u2033 wider within than without \u2020")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 5,
      padding: "8px 14px 10px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 700,
      fontSize: 22,
      lineHeight: 0.94,
      color: __ds_scope.factionCssVar("ephemerists", "card-text")
    }
  }, tw.join(" "), tw.length ? " " : "", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-lapis)"
    }
  }, tlast), /*#__PURE__*/React.createElement("sup", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontSize: 9,
      color: "var(--eph-lapis)",
      fontWeight: 400
    }
  }, "\u2020")), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      lineHeight: 1.45,
      fontStyle: "italic",
      color: "var(--eph-muted)",
      margin: "4px 0 6px",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      fontSize: 7.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: __ds_scope.factionCssVar("ephemerists", "card-text")
    }
  }, "\u25A6 grade ", toRoman(level)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-gold-deep)"
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontWeight: 700,
      fontSize: 13,
      color: "var(--eph-rubric)"
    }
  }, points, " pvncta")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 6.5,
      fontStyle: "italic",
      color: "var(--eph-muted)",
      marginTop: 6,
      lineHeight: 1.35
    }
  }, "\u2020 the road does not return you to where you began \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--eph-lapis)"
    }
  }, "see \u2020"))), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontSize: 9,
      letterSpacing: "0.12em",
      fontStyle: "italic",
      padding: "7px 10px",
      border: "none",
      cursor: "pointer",
      width: "100%",
      background: "var(--eph-ink)",
      color: "var(--eph-parchment)",
      position: "relative",
      zIndex: 6
    }
  }, "Triangulate the truth \u25B8"));
}

/* ── Singularity — Terminal Printout (always dark) ── */
function SprocketHoles() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 6,
      padding: "4px 0"
    }
  }, Array.from({
    length: 5
  }).map((_, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    style: {
      width: 6,
      height: 4,
      background: "rgba(10,26,14)",
      border: "1px solid var(--faction-singularity-card-accent)",
      borderRadius: 1
    }
  })));
}
function Singularity({
  title,
  description,
  level,
  points,
  onSignup
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 128,
      maxWidth: 156,
      flex: "0 1 140px",
      background: "var(--faction-singularity-card-bg)",
      border: "1px solid var(--faction-singularity-border-hard)",
      position: "relative",
      fontFamily: __ds_scope.factionCssVar("singularity", "card-font"),
      color: "var(--faction-singularity-card-text)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
      pointerEvents: "none",
      zIndex: 1
    }
  }), [["top", 3, "left", 3, "borderTop", "borderLeft"], ["top", 3, "right", 3, "borderTop", "borderRight"], ["bottom", 3, "left", 3, "borderBottom", "borderLeft"], ["bottom", 3, "right", 3, "borderBottom", "borderRight"]].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "absolute",
      [c[0]]: c[1],
      [c[2]]: c[3],
      width: 10,
      height: 10,
      [c[4]]: "1px solid var(--faction-singularity-card-text)",
      [c[5]]: "1px solid var(--faction-singularity-card-text)"
    }
  })), /*#__PURE__*/React.createElement(SprocketHoles, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 12px 8px",
      position: "relative",
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: "var(--faction-singularity-card-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      marginBottom: 6
    }
  }, "singularity protocol", /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 5,
      height: 9,
      background: "var(--faction-singularity-card-text)",
      marginLeft: 3,
      verticalAlign: "middle",
      animation: "wz-blink 1s step-end infinite"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      marginBottom: 6,
      lineHeight: 1.3,
      overflowWrap: "anywhere"
    }
  }, "> ", title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--faction-singularity-card-muted)",
      lineHeight: 1.6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, "PTS: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--faction-singularity-card-text)",
      fontSize: "var(--text-md)",
      fontWeight: 700
    }
  }, points)), /*#__PURE__*/React.createElement("div", null, "LVL: ", level)), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: "var(--faction-singularity-card-muted)",
      lineHeight: 1.4,
      marginBottom: 6,
      overflow: "hidden",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical"
    }
  }, description), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      background: "transparent",
      color: "var(--faction-singularity-card-text)",
      border: "1px solid var(--faction-singularity-card-text)",
      fontFamily: __ds_scope.factionCssVar("singularity", "card-font"),
      fontSize: 7,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      padding: "2px 8px",
      cursor: "pointer",
      marginBottom: 4
    }
  }, ">", " sign up"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      borderTop: "1px solid var(--faction-singularity-border-hard)",
      paddingTop: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      border: "1px solid var(--faction-singularity-card-text)",
      color: "var(--faction-singularity-card-text)",
      fontSize: 7,
      padding: "1px 6px",
      borderRadius: 6,
      textTransform: "uppercase"
    }
  }, "lvl ", level))), /*#__PURE__*/React.createElement(SprocketHoles, null), /*#__PURE__*/React.createElement("style", null, `@keyframes wz-blink { 50% { opacity: 0; } }`));
}

/* ════════════════════════════════════════════════════════════════
   ALBESCENT — Vellum Correspondence (always light)
   Pure-white cotton card, hairline borders, a centred surveyor's-mark
   sigil, Cormorant Garamond italic title. No hue. The card whispers.
   ════════════════════════════════════════════════════════════════ */
function AlbescentMark({
  size = 20,
  color = "var(--faction-albescent-card-text)"
}) {
  const c = size / 2,
    rO = size * 0.43,
    rI = size * 0.235,
    rD = size * 0.044;
  const tS = rI + size * 0.025,
    tE = tS + size * 0.13;
  const tick = deg => {
    const a = deg * Math.PI / 180;
    return {
      x1: c + tS * Math.cos(a),
      y1: c + tS * Math.sin(a),
      x2: c + tE * Math.cos(a),
      y2: c + tE * Math.sin(a)
    };
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    fill: "none",
    style: {
      display: "block",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rO,
    stroke: color,
    strokeWidth: size * 0.022,
    opacity: 0.18
  }), /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rI,
    stroke: color,
    strokeWidth: size * 0.038,
    opacity: 0.5
  }), [0, 90, 180, 270].map((deg, i) => {
    const {
      x1,
      y1,
      x2,
      y2
    } = tick(deg);
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      stroke: color,
      strokeWidth: size * 0.038
    });
  }), /*#__PURE__*/React.createElement("circle", {
    cx: c,
    cy: c,
    r: rD,
    fill: color
  }));
}
function Albescent({
  title,
  description,
  level,
  points,
  onSignup
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 196,
      flex: "0 0 auto",
      background: __ds_scope.factionCssVar("albescent", "card-bg"),
      border: "1px solid var(--faction-albescent-border)",
      boxShadow: "var(--al-shadow)",
      padding: "22px 18px 16px",
      fontFamily: __ds_scope.factionCssVar("albescent", "card-font"),
      color: __ds_scope.factionCssVar("albescent", "card-text")
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(AlbescentMark, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--al-border-faint)",
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 6,
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color: __ds_scope.factionCssVar("albescent", "card-muted"),
      marginBottom: 9
    }
  }, "Albescent"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontStyle: "italic",
      fontWeight: 300,
      fontSize: 18,
      lineHeight: 1.28,
      marginBottom: 10,
      overflowWrap: "anywhere"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 7.5,
      lineHeight: 1.6,
      color: __ds_scope.factionCssVar("albescent", "card-muted"),
      marginBottom: 14,
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 7,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: __ds_scope.factionCssVar("albescent", "card-accent"),
      borderBottom: "1px solid var(--faction-albescent-border)",
      paddingBottom: 1,
      marginBottom: 14,
      display: "inline-block"
    }
  }, "acknowledge"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid var(--al-border-faint)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 6.5,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: __ds_scope.factionCssVar("albescent", "card-muted")
    }
  }, "Lvl ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      fontStyle: "italic",
      fontWeight: 300,
      fontSize: 16,
      color: __ds_scope.factionCssVar("albescent", "card-accent")
    }
  }, points, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 6.5,
      marginLeft: 3,
      letterSpacing: "0.1em",
      textTransform: "uppercase"
    }
  }, "pts"))));
}

/* ════════════════════════════════════════════════════════════════
   THE EVERYMEN — Union / Victory Poster ("Mobilize")
   Sunburst red field, knocked-out Bebas headline, cog sigil seal,
   gold rule, split LVL/PTS footer bar, rubber-stamp enlist CTA.
   ════════════════════════════════════════════════════════════════ */
function CogMark({
  size = 22,
  color = "currentColor"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("g", {
    fill: color
  }, Array.from({
    length: 8
  }).map((_, i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: "11",
    y: "0.5",
    width: "2",
    height: "5",
    rx: "0.5",
    transform: `rotate(${i * 45} 12 12)`
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "6.5",
    fill: "none",
    stroke: color,
    strokeWidth: "2.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2",
    fill: color
  }));
}
function Everymen({
  title,
  description,
  level,
  points,
  onSignup
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 206,
      background: "var(--everymen-field)",
      color: "var(--everymen-cream)",
      border: "3px solid var(--everymen-ink)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.55,
      zIndex: 0,
      background: "repeating-conic-gradient(from 0deg at 50% 38%, var(--everymen-field-deep) 0deg 7.5deg, transparent 7.5deg 15deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.1,
      zIndex: 1,
      backgroundImage: "radial-gradient(var(--everymen-cream) 0.6px, transparent 0.7px)",
      backgroundSize: "4px 4px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      background: "var(--everymen-ink)",
      color: "var(--everymen-gold)",
      textAlign: "center",
      padding: "5px 0",
      fontFamily: "var(--font-faction-poster)",
      fontSize: 12,
      letterSpacing: "0.3em"
    }
  }, "THE EVERYMEN"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      padding: "16px 14px 13px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: "var(--everymen-cream)",
      color: "var(--everymen-red)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 0 3px var(--everymen-ink)"
    }
  }, /*#__PURE__*/React.createElement(CogMark, {
    size: 24,
    color: "var(--everymen-red)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 74,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-poster)",
      fontSize: 34,
      lineHeight: 1.06,
      color: "var(--everymen-cream)",
      textShadow: "1.5px 1.5px 0 var(--everymen-ink)",
      overflowWrap: "anywhere"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: "var(--everymen-gold)",
      margin: "11px 22px 10px"
    }
  }), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      lineHeight: 1.5,
      color: "var(--everymen-cream)",
      opacity: 0.92,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      display: "flex",
      alignItems: "stretch",
      borderTop: "3px solid var(--everymen-ink)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--everymen-ink)",
      color: "var(--everymen-gold)",
      textAlign: "center",
      padding: "6px 0",
      fontFamily: "var(--font-faction-poster)",
      fontSize: 16
    }
  }, "LVL ", level), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--everymen-gold)",
      color: "var(--everymen-ink)",
      textAlign: "center",
      padding: "6px 0",
      fontFamily: "var(--font-faction-poster)",
      fontSize: 16
    }
  }, points, " PTS")), onSignup && /*#__PURE__*/React.createElement("button", {
    onClick: onSignup,
    style: {
      width: "100%",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      padding: "8px 10px",
      border: "none",
      background: "var(--everymen-cream)",
      color: "var(--everymen-ink)",
      position: "relative",
      zIndex: 2
    }
  }, "Mobilize \u25B8"));
}
Object.assign(__ds_scope, { FactionTaskCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FactionTaskCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/FactionCommentBox.jsx
try { (() => {
/**
 * FactionCommentBox — a single comment / thread post, reskinned per faction.
 *
 * Comments are the one surface where every faction speaks in the SAME thread,
 * so each faction needs an unmistakable bubble. The data model is identical
 * (author, handle, timestamp, body with @mentions, avatar); only the frame,
 * type and avatar treatment change:
 *
 *   ua          → gilt salon frame (gold leaf border, Cormorant italic)
 *   wow         → whimsy.exe chat window (pink titlebar + window buttons)
 *   snide       → ransom slip (black dispatch card, tape strip, Special Elite)
 *   ephemerists → marginalia (vellum, gold rule, EB Garamond italic)
 *   singularity → terminal line ( > handle@signal, blinking cursor )
 *   everymen    → union entry (red poster header bar, Bebas)
 *   albescent   → the register (white vellum card, Cormorant)
 *
 * Mentions (@handle) are auto-styled in the faction's voice. Built entirely on
 * global tokens so it flips light/dark with the rest of the system.
 */

const MENTION_STYLE = {
  ua: {
    color: "#c8601a",
    fontWeight: 700
  },
  wow: {
    color: "#d23b7e",
    fontWeight: 700
  },
  snide: {
    color: "#14110b",
    fontWeight: 700,
    background: "#b6ff2e",
    padding: "0 3px"
  },
  ephemerists: {
    color: "var(--eph-rubric)",
    fontStyle: "italic",
    fontWeight: 600
  },
  singularity: {
    color: "#60a5fa",
    fontWeight: 700
  },
  everymen: {
    color: "#d12027",
    fontWeight: 700
  },
  albescent: {
    color: "#1c1c1a",
    borderBottom: "1px solid rgba(28,28,26,.4)",
    fontWeight: 600
  }
};
const AVATAR_SKIN = {
  ua: {
    borderRadius: "50%",
    filter: "sepia(.3)",
    border: "2px solid #c9962f",
    boxShadow: "0 0 0 1px #a9781f, 0 0 0 3px #f0e2c0"
  },
  wow: {
    borderRadius: "8px",
    border: "2px solid #ec5f99",
    boxShadow: "2px 2px 0 #fbcfe2"
  },
  snide: {
    filter: "grayscale(1) contrast(1.5)",
    border: "1.5px solid #14110b"
  },
  ephemerists: {
    borderRadius: "50%",
    filter: "sepia(.5)",
    border: "2px solid #b0863a",
    boxShadow: "0 0 0 1px #2a1d12"
  },
  singularity: {
    filter: "grayscale(1) sepia(1) hue-rotate(175deg) saturate(2.6) brightness(.82)",
    border: "1px solid #60a5fa"
  },
  everymen: {
    filter: "grayscale(1) contrast(1.2) sepia(.25)",
    border: "2px solid #221a12"
  },
  albescent: {
    borderRadius: "50%",
    filter: "grayscale(1) brightness(1.05)"
  }
};
function Body({
  body,
  faction
}) {
  if (body == null) return null;
  const ms = MENTION_STYLE[faction] || {
    color: "var(--color-text-link)",
    fontWeight: 700
  };
  return String(body).split(/(@\w+)/g).map((part, i) => part[0] === "@" ? /*#__PURE__*/React.createElement("span", {
    key: i,
    style: ms
  }, part) : /*#__PURE__*/React.createElement("span", {
    key: i
  }, part));
}
function Avatar({
  faction,
  src,
  size = 42
}) {
  const base = {
    width: size,
    height: size,
    objectFit: "cover",
    display: "block",
    flex: "none"
  };
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      ...base,
      ...(AVATAR_SKIN[faction] || {})
    }
  });
}

/* ── per-faction bubble bodies (avatar is rendered by the row wrapper) ── */

function UaBubble({
  name,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      padding: 4,
      borderRadius: 5,
      background: "linear-gradient(135deg,#ecd089 0%,#c9962f 26%,#a9781f 50%,#e3c06a 76%,#c9a23c 100%)",
      boxShadow: "0 2px 11px rgba(150,108,32,.28)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9f2e2",
      border: "1px solid rgba(176,122,58,.4)",
      borderRadius: 3,
      padding: "13px 16px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontSize: 8,
      letterSpacing: ".22em",
      textTransform: "uppercase",
      color: "#c8601a"
    }
  }, "University of Asthmatics"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-codex-script)",
      fontStyle: "italic",
      fontWeight: 600,
      fontSize: 21,
      color: "#2a1a10",
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontSize: 7,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: "#b07a3a",
      border: "1px solid rgba(201,150,47,.65)",
      padding: "1px 5px"
    }
  }, "UA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-codex-script)",
      fontStyle: "italic",
      fontSize: 12,
      color: "#b07a3a",
      marginLeft: "auto"
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "linear-gradient(90deg,#c9962f,transparent)",
      margin: "9px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-codex-script)",
      fontStyle: "italic",
      fontSize: 17,
      lineHeight: 1.5,
      color: "#3a2616"
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "ua"
  }))));
}
function WowBubble({
  name,
  handle,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: "relative",
      background: "var(--gestalt-card-bg)",
      border: "2px solid var(--gestalt-pink-deep)",
      borderRadius: 8,
      boxShadow: "4px 4px 0 var(--gestalt-pink-lt)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "linear-gradient(#f9b6d4,#ec5f99)",
      padding: "4px 9px",
      borderBottom: "2px solid #d23b7e"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-script)",
      fontSize: 18,
      color: "#fff",
      textShadow: "1px 1px 0 #a83a6e",
      lineHeight: .9
    }
  }, "\u2726 ", name, ".exe"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      background: "#fff",
      border: "1.5px solid #a83a6e",
      borderRadius: 3
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      background: "#fde2ee",
      border: "1.5px solid #a83a6e",
      borderRadius: 3
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "9px 12px 11px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-script)",
      fontSize: 20,
      lineHeight: 1.2,
      color: "var(--gestalt-ink)"
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "wow"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 8,
      color: "var(--gestalt-ink-soft)",
      marginTop: 4
    }
  }, handle, " \xB7 ", meta)));
}
function SnideBubble({
  name,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: "relative",
      background: "#14110b",
      padding: "13px 15px 14px",
      boxShadow: "3px 4px 0 rgba(0,0,0,.3)",
      transform: "rotate(.4deg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -9,
      left: 30,
      width: 74,
      height: 20,
      background: "rgba(228,214,120,.5)",
      transform: "rotate(-4deg)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-anton)",
      fontSize: 16,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      color: "#f4f1e8",
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-anton)",
      fontSize: 8,
      letterSpacing: ".06em",
      color: "#14110b",
      background: "#b6ff2e",
      padding: "1px 4px"
    }
  }, "SNIDE"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-typewriter)",
      fontSize: 8,
      color: "#8b897d",
      marginLeft: "auto"
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-typewriter)",
      fontSize: 11,
      lineHeight: 1.6,
      color: "#e7e4d8",
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "snide"
  })));
}
function EphBubble({
  name,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: "relative",
      background: "var(--eph-vellum)",
      borderLeft: "2px solid var(--eph-gold)",
      padding: "12px 15px 13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontSize: 13,
      letterSpacing: ".05em",
      color: "var(--eph-vellum-text)",
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-engraved)",
      fontSize: 7,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: "var(--eph-rubric)",
      border: "1px solid var(--eph-gold)",
      padding: "1px 4px"
    }
  }, "Ephemerists"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontStyle: "italic",
      fontSize: 10,
      color: "var(--eph-muted)",
      marginLeft: "auto"
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-codex)",
      fontSize: 15,
      fontStyle: "italic",
      lineHeight: 1.5,
      color: "var(--eph-vellum-text)",
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "ephemerists"
  })));
}
function SingularityBubble({
  handle,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      background: "#040a12",
      border: "1px solid #2563eb",
      boxShadow: "0 0 0 1px rgba(37,99,235,.3)",
      padding: "11px 14px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-terminal)",
      fontSize: 10,
      color: "#60a5fa"
    }
  }, "> ", handle, "@signal ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#3a5f9c"
    }
  }, "[", meta, "]"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#60a5fa",
      border: "1px solid #60a5fa",
      padding: "0 3px",
      fontSize: 8
    }
  }, "SINGULARITY")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-terminal)",
      fontSize: 11,
      lineHeight: 1.55,
      color: "#9fc2ff",
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "singularity"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      animation: "wzcb-blink 1s step-end infinite"
    }
  }, "_")));
}
function EverymenBubble({
  name,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      background: "var(--everymen-paper)",
      border: "1px solid var(--everymen-red-deep)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#d12027",
      padding: "5px 13px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-poster)",
      fontSize: 17,
      letterSpacing: ".05em",
      color: "#f4ecd6",
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-poster)",
      fontSize: 9,
      letterSpacing: ".12em",
      color: "#f4ecd6",
      opacity: .8,
      marginLeft: "auto"
    }
  }, "The Everymen \xB7 ", meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      lineHeight: 1.6,
      color: "var(--everymen-paper-text)",
      padding: "10px 13px 12px"
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "everymen"
  })));
}
function AlbescentBubble({
  name,
  meta,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      background: "var(--al-surface)",
      border: "1px solid var(--al-border)",
      boxShadow: "var(--al-shadow)",
      padding: "14px 17px 15px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-vellum)",
      fontSize: 15,
      letterSpacing: ".04em",
      color: "var(--al-text)",
      lineHeight: 1
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-vellum)",
      fontStyle: "italic",
      fontSize: 9,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--al-text-muted)",
      borderBottom: "1px solid var(--al-border)"
    }
  }, "Albescent"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-faction-vellum)",
      fontStyle: "italic",
      fontSize: 11,
      color: "var(--al-text-muted)",
      marginLeft: "auto"
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-faction-vellum)",
      fontSize: 16,
      lineHeight: 1.55,
      color: "var(--al-ink)",
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(Body, {
    body: body,
    faction: "albescent"
  })));
}
const BUBBLE = {
  ua: UaBubble,
  wow: WowBubble,
  snide: SnideBubble,
  ephemerists: EphBubble,
  singularity: SingularityBubble,
  everymen: EverymenBubble,
  albescent: AlbescentBubble
};
function FactionCommentBox({
  faction = "ua",
  name,
  handle,
  meta,
  body,
  avatar
}) {
  const f = __ds_scope.canonicalSlug(faction);
  const Bubble = BUBBLE[f] || UaBubble;
  const h = handle && handle[0] === "@" ? handle : handle ? "@" + handle : "";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 13,
      alignItems: "flex-start",
      margin: "0"
    }
  }, /*#__PURE__*/React.createElement("style", null, "@keyframes wzcb-blink{0%,49%{opacity:1}50%,100%{opacity:0}}"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    faction: f,
    src: avatar
  })), /*#__PURE__*/React.createElement(Bubble, {
    name: name,
    handle: h,
    meta: meta,
    body: body
  }));
}
Object.assign(__ds_scope, { FactionCommentBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/FactionCommentBox.jsx", error: String((e && e.message) || e) }); }

// components/feedback/FactionVoteStamps.jsx
try { (() => {
const {
  useState
} = React;
/**
 * FactionVoteStamps — World Zero's rating control: five rectangular rubber
 * stamps (1–5) replacing star ratings. The vote MODEL is shared across every
 * faction; what changes per faction is the LANGUAGE of the five rungs and the
 * tint. Pass `faction` to reframe the ramp in that faction's voice:
 *
 *   (none)      → a start · solid · good · excellent · legendary   (generic ramp)
 *   ua          → rough sketch · study · fair hand · fine work · masterwork   (the Critique, burnt amber)
 *   snide       → meh · not bad · rad · sick!! · ANARCHY
 *   ephemerists → apocryphal · disputed · plausible · corroborated · canonical
 *   singularity → noise · weak · signal · clear · verified
 *   everymen    → noted · supported · commended · honored · exemplary
 *   albescent   → unseeing · glimpsed · witnessed · verified · inscribed
 *
 * The faction kits ship their own fully-bespoke vote shapes (wax seals, signal
 * bars, witness circles); this is the shared stamp form, reframed by token.
 */

/** Per-faction rung labels. The 1–5 model is identical; only the words change. */
const FACTION_LABELS = {
  ua: ["rough sketch", "study", "fair hand", "fine work", "masterwork"],
  gestalt: ["a start", "solid", "good", "excellent", "legendary"],
  snide: ["meh", "not bad", "rad", "sick!!", "ANARCHY"],
  ephemerists: ["apocryphal", "disputed", "plausible", "corroborated", "canonical"],
  singularity: ["noise", "weak", "signal", "clear", "verified"],
  everymen: ["noted", "supported", "commended", "honored", "exemplary"],
  albescent: ["unseeing", "glimpsed", "witnessed", "verified", "inscribed"]
};

/** Generic multi-hue ramp (the default, faction-agnostic rendering). */
const GENERIC_COLORS = ["var(--vote-1)", "var(--vote-2)", "var(--vote-3)", "var(--vote-4)", "var(--vote-5)"];
const GENERIC_LABELS = ["a start", "solid", "good", "excellent", "legendary"];
function FactionVoteStamps({
  faction,
  value = 0,
  average,
  totalVotes,
  onVote
}) {
  const [selected, setSelected] = useState(value);
  const labels = faction ? FACTION_LABELS[faction] ?? GENERIC_LABELS : GENERIC_LABELS;
  // No faction → the distinct multi-hue ramp. Any faction (incl. ua) → its
  // accent, graded by opacity so the five rungs read as a ramp.
  const useGeneric = !faction;
  const accent = useGeneric ? null : __ds_scope.factionCssVar(faction, "card-accent");
  const colorFor = i => useGeneric ? GENERIC_COLORS[i] : `color-mix(in srgb, ${accent} ${32 + i * 17}%, transparent)`;
  const labelFont = useGeneric ? "var(--font-body)" : __ds_scope.factionCssVar(faction, "card-font");
  const handle = stars => {
    setSelected(stars);
    onVote && onVote(stars);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, labels.map((label, i) => {
    const stampValue = i + 1;
    const active = selected === stampValue;
    const color = colorFor(i);
    return /*#__PURE__*/React.createElement("div", {
      key: stampValue,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handle(stampValue),
      className: active ? "vote-stamp vote-stamp-active" : "vote-stamp",
      style: {
        "--stamp-color": color
      },
      "aria-label": `Rate ${stampValue} — ${label}`
    }, active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        inset: 2,
        border: "1px dashed color-mix(in srgb, var(--color-text-on-accent) 25%, transparent)",
        pointerEvents: "none"
      }
    }), stampValue), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: labelFont,
        fontStyle: useGeneric ? "normal" : "italic",
        fontSize: useGeneric ? 7 : 9,
        textTransform: useGeneric ? "uppercase" : "none",
        letterSpacing: useGeneric ? "0.04em" : 0,
        color: active ? color : "var(--color-text-tertiary)",
        maxWidth: 48,
        textAlign: "center",
        lineHeight: 1.2
      }
    }, label));
  })), average !== undefined && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 9,
      color: "var(--color-text-secondary)",
      margin: 0
    }
  }, average.toFixed(1), " avg \xB7 ", totalVotes ?? 0, " votes"));
}
Object.assign(__ds_scope, { FactionVoteStamps });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/FactionVoteStamps.jsx", error: String((e && e.message) || e) }); }

// components/filters/FactionPennant.jsx
try { (() => {
/**
 * FactionPennant — a diagonal banner/pennant tab in a faction's full-saturation
 * color, used for faction filters. Pennants are ALWAYS full color (never
 * desaturated); inactive simply drops opacity to 0.85.
 */
function FactionPennant({
  slug,
  name,
  active = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      background: __ds_scope.factionCssVar(slug),
      color: "var(--color-text-on-accent)",
      fontFamily: "var(--font-body)",
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      padding: "4px 12px",
      cursor: "pointer",
      border: "none",
      borderRadius: 0,
      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      opacity: active ? 1 : 0.85,
      clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)",
      transition: "all 120ms"
    }
  }, name);
}
Object.assign(__ds_scope, { FactionPennant });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/filters/FactionPennant.jsx", error: String((e && e.message) || e) }); }

// components/filters/FilterStamp.jsx
try { (() => {
/**
 * FilterStamp — a rectangular rubber-stamp toggle used for status filters.
 * Hard corners (no radius), bold uppercase Courier Prime, and an inner dashed
 * border that inverts with the active state. Active = solid ink fill.
 */
function FilterStamp({
  label,
  active = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      position: "relative",
      border: `2px solid ${active ? "var(--color-text-primary)" : "var(--color-border-strong)"}`,
      borderRadius: 0,
      background: active ? "var(--color-text-primary)" : "var(--color-bg-surface)",
      color: active ? "var(--color-bg-page)" : "var(--color-text-primary)",
      fontFamily: "var(--font-body)",
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      padding: "5px 10px",
      cursor: "pointer",
      transition: "all 120ms"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 2,
      border: `1px dashed ${active ? "var(--stamp-active-dashed)" : "var(--stamp-inactive-dashed)"}`,
      pointerEvents: "none"
    }
  }), label);
}
Object.assign(__ds_scope, { FilterStamp });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/filters/FilterStamp.jsx", error: String((e && e.message) || e) }); }

// components/filters/LevelNodes.jsx
try { (() => {
/**
 * LevelNodes — a row of connected circular nodes for filtering by level.
 * Circles joined by short horizontal bars; the active node fills with ink and
 * scales up slightly. Clicking the active node clears the filter.
 */
function LevelNodes({
  levels = [0, 1, 2, 3, 4, 5],
  value = "",
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, levels.map((level, index) => {
    const active = value === level;
    return /*#__PURE__*/React.createElement("div", {
      key: level,
      style: {
        display: "flex",
        alignItems: "center"
      }
    }, index > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        width: 12,
        height: 2,
        background: "var(--color-border-strong)"
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onChange && onChange(active ? "" : level),
      style: {
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: `2px solid ${active ? "var(--color-text-primary)" : "var(--color-border-strong)"}`,
        background: active ? "var(--color-text-primary)" : "var(--color-bg-surface)",
        color: active ? "var(--color-bg-page)" : "var(--color-text-tertiary)",
        fontFamily: "var(--font-body)",
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: active ? "scale(1.15)" : "scale(1)",
        transition: "all 120ms",
        padding: 0
      }
    }, level, "+"));
  }));
}
Object.assign(__ds_scope, { LevelNodes });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/filters/LevelNodes.jsx", error: String((e && e.message) || e) }); }

// components/layout/WatercolorBackground.jsx
try { (() => {
/**
 * WatercolorBackground — World Zero's full-bleed paint-bleed backdrop.
 * Blurred SVG ellipses in all four corners with turbulence distortion. Opacity
 * is driven by the --wc-opacity-* tokens so dark mode dims it automatically.
 * Render it once, fixed behind page content (zIndex 0).
 */
function WatercolorBackground({
  fixed = true,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    style: {
      position: fixed ? "fixed" : "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 0,
      transition: "opacity 300ms",
      ...style
    },
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("filter", {
    id: "wc-blur",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "28"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "wc-distort",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "26",
    result: "blur"
  }), /*#__PURE__*/React.createElement("feTurbulence", {
    type: "turbulence",
    baseFrequency: "0.015",
    numOctaves: "3",
    result: "turb"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    in: "blur",
    in2: "turb",
    scale: "18"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "wc-droplet",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "9"
  }))), /*#__PURE__*/React.createElement("ellipse", {
    cx: "8%",
    cy: "10%",
    rx: "14%",
    ry: "18%",
    fill: "#4f46e5",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-distort)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "14%",
    cy: "6%",
    rx: "10%",
    ry: "12%",
    fill: "#7c3aed",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "4%",
    cy: "18%",
    rx: "6%",
    ry: "8%",
    fill: "#be185d",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18%",
    cy: "14%",
    r: "1.5%",
    fill: "#4f46e5",
    opacity: "var(--wc-opacity-drip)",
    filter: "url(#wc-droplet)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6%",
    cy: "24%",
    r: "1%",
    fill: "#7c3aed",
    opacity: "var(--wc-opacity-drop)",
    filter: "url(#wc-droplet)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "90%",
    cy: "8%",
    rx: "12%",
    ry: "16%",
    fill: "#b45309",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-distort)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "85%",
    cy: "14%",
    rx: "10%",
    ry: "10%",
    fill: "#d97706",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "95%",
    cy: "4%",
    rx: "8%",
    ry: "10%",
    fill: "#16a34a",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "82%",
    cy: "6%",
    r: "1.2%",
    fill: "#d97706",
    opacity: "var(--wc-opacity-drip)",
    filter: "url(#wc-droplet)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "10%",
    cy: "90%",
    rx: "14%",
    ry: "14%",
    fill: "#9f1239",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-distort)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "6%",
    cy: "85%",
    rx: "8%",
    ry: "12%",
    fill: "#7c3aed",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16%",
    cy: "86%",
    r: "1.3%",
    fill: "#9f1239",
    opacity: "var(--wc-opacity-drip)",
    filter: "url(#wc-droplet)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "88%",
    cy: "88%",
    rx: "12%",
    ry: "16%",
    fill: "#0f766e",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-distort)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "94%",
    cy: "92%",
    rx: "10%",
    ry: "10%",
    fill: "#0e7490",
    opacity: "var(--wc-opacity-blob)",
    filter: "url(#wc-blur)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "84%",
    cy: "94%",
    r: "1%",
    fill: "#0e7490",
    opacity: "var(--wc-opacity-drop)",
    filter: "url(#wc-droplet)"
  }));
}
Object.assign(__ds_scope, { WatercolorBackground });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/WatercolorBackground.jsx", error: String((e && e.message) || e) }); }

__ds_ns.FactionPraxisCard = __ds_scope.FactionPraxisCard;

__ds_ns.FactionTaskCard = __ds_scope.FactionTaskCard;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.LevelPill = __ds_scope.LevelPill;

__ds_ns.PageTitle = __ds_scope.PageTitle;

__ds_ns.SLUG_ALIAS = __ds_scope.SLUG_ALIAS;

__ds_ns.FACTIONS = __ds_scope.FACTIONS;

__ds_ns.FACTION_ORDER = __ds_scope.FACTION_ORDER;

__ds_ns.FactionCommentBox = __ds_scope.FactionCommentBox;

__ds_ns.FactionVoteStamps = __ds_scope.FactionVoteStamps;

__ds_ns.FactionPennant = __ds_scope.FactionPennant;

__ds_ns.FilterStamp = __ds_scope.FilterStamp;

__ds_ns.LevelNodes = __ds_scope.LevelNodes;

__ds_ns.WatercolorBackground = __ds_scope.WatercolorBackground;

})();
