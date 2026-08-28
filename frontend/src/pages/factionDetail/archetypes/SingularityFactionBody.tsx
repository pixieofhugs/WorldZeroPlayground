import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { mediaUrl } from "../../../utils/media";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Singularity faction-body — the terminal-printout skin of the standardized
 * six-section spine (② Manifest, ③ Access, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side "system readout" stats) is SingularityFactionHero,
 * rendered above.
 *
 * Same shape as EverymenFactionBody / UaFactionBody — Tasks/Praxis reuse the
 * app-wide per-faction cards (TaskCard/PraxisCard already dispatch to the
 * Singularity archetypes); this file owns only the terminal chrome: the
 * two-column layout, the fixed "Tasks"/"Praxis" titles with system kickers, the
 * access/gate readout block, the primary-node spotlight + array roster, and the
 * FDL laurel on the single top-scoring praxis.
 *
 * Singularity is ALWAYS DARK: every colour resolves to a --faction-singularity-*
 * token that reads identically in both themes, so this body reads as a terminal
 * regardless of the global theme — it never mutates data-theme.
 */

// Token shorthands. Four of them are ROLES now (#2675) — paper, accent, quiet
// and the bare hue as `fill` — declared as `--sg-body-*` on this body's
// own grid root and read here with today's token as the fallback, so a value
// resolves identically whether or not the declaring element is above it.
// `-border-hard` and `-amber` are not roles and stay local: decision 07 leaves
// a surface's genuine extras to the surface.
const VOID = "var(--sg-body-paper)"; // terminal black
const PHOSPHOR = "var(--sg-body-accent)"; // green
const SIGNAL = "var(--sg-body-quiet)"; // blue
const BORDER_HARD = "var(--faction-singularity-border-hard)"; // blue brand
const SIGNAL_FILL = "var(--sg-body-fill)"; // blue brand fill
// The credits accent: a GOLD SCALAR, not a rainbow. It read the retired brand
// palette's first stop until #1220 (ADR-0066) pointed it at na's
// --faction-default-gold, and #1766 gave it the --faction-singularity-* token
// this comment always said it would eventually want. Nothing renders
// differently — the new token carries exactly what the alias resolved to in
// each cascade (6.63:1 by day, 10.59:1 by night, on the terminal black). What
// forced the split is that na's gold is a caption ink on a WHITE score plate
// and this ground is near-black in BOTH themes, so no one value serves both.
const AMBER = "var(--faction-singularity-amber)";
const FONT = "var(--font-faction-terminal)";

// color-mix helpers for shades that have no dedicated token.
// ponytail: green/blue only exist as full-strength tokens; the terminal skin
// needs many low-alpha tints, so derive them with color-mix rather than adding
// a dozen one-off vars.
const phosphor = (pct: number): string =>
  `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`;
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`;

/** Scanline overlay reused from the hero/cards — subtle phosphor sweep. */
function Scanlines({ opacity = 0.012 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(to bottom,transparent,transparent 2px,${phosphor(
          opacity * 100,
        )} 2px,${phosphor(opacity * 100)} 4px)`,
      }}
    />
  );
}

/** Void terminal panel with a signal-blue hairline border. */
const PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: VOID,
  border: `1px solid ${signal(42)}`,
};

const SECTION_HEADING_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  marginBottom: "var(--space-sm)",
};

const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: FONT,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the terminal's banner cut, a step above the content ramp.
  fontSize: 28,
  letterSpacing: "0.04em",
  margin: 0,
  color: PHOSPHOR,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

/** Section heading — uppercase phosphor title trailing a signal rule. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={SECTION_HEADING_ROW}>
      <h2 style={SECTION_HEADING_TEXT}>{children}</h2>
      <span style={{ flex: 1, height: 1, minWidth: 30, background: signal(30) }} />
    </div>
  );
}

/* The system `Kicker` under each section title lived here. #1909 cut its two
   strings (`singularity.tasks.kicker` / `.praxis.kicker`): the audit ruled the
   line restated its own heading, and no faction outside the seven bespoke bodies
   ever had one. The style went with the only component that used it. */

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** A portrait filling a node's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/**
 * Node avatar — signal-ringed initials disc.
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2226). The signal ring is
 * this span's own border, so the portrait sits inside it untouched.
 */
function NodeGlyph({
  name,
  size,
  avatarUrl,
}: {
  name: string;
  size: number;
  /** The node's portrait. Empty/absent falls back to the monogram. */
  avatarUrl?: string | null;
}) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${BORDER_HARD}`,
        background: signal(14),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: size * 0.36,
        color: SIGNAL,
      }}
    >
      {avatarUrl ? <img alt="" aria-hidden="true" src={mediaUrl(avatarUrl)} style={PORTRAIT} /> : initial(name)}
    </span>
  );
}

export default function SingularityFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    viewerFactionSlug,
    gameFactions,
    onSignup,
    membership,
  } = state;
  const sections = useFactionSections();

  if (!faction) return null;

  // The burn (#1305) — this viewer left this faction this era, so
  // `can_join_faction` refuses the join for the rest of it. It reuses the
  // gate's chassis below: only the words change, and they are neutral
  // platform copy (ADR-0061) because this is the platform speaking.
  const burned = membership.state === "burned";

  // ② manifest paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // ⑥ spotlight = highest all-time score; array = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const array = ranked.slice(1);

  return (
    /* The grid root is where the nine roles land (#2675). The prefix is this
       body's own — the two columns below mount TaskCard and PraxisCard, which
       dispatch on each row's own faction, so a name any card might also read
       would repaint a card belonging to somebody else. */
    <div className="wz-faction-grid" style={factionRoleVars("singularity", "sg-body")}>
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② MANIFEST */}
        <div style={{ ...PANEL, padding: "var(--space-xl)" }}>
          <Scanlines />
          {/* The panel opened on a shell prompt (`singularity.manifest.command`,
              "> cat /faction/manifest.txt"). #1909 cut it: no other faction had
              a command line over its about panel, and the audit ruled the
              surface generic. That left this the ONE about panel on the site with
              no heading at all, pending #1910 — which closed without giving it
              one, so the region a reader met first was the only unlabelled one
              anywhere (#2547).

              `SectionHeading` is this file's own, the same component the Tasks
              and Praxis sections below already use, so the phosphor title and its
              signal rule come for free. No string is minted: `detail.aboutHeading`
              is the shared key the other seven read, and `factionCopyCollapse`
              names it as the one the family collapsed onto. */}
          <SectionHeading>{t("detail.aboutHeading")}</SectionHeading>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="content-text"
                  style={{
                    fontFamily: FONT,
                    lineHeight: 1.8,
                    color: phosphor(72),
                    margin: 0,
                  }}
                >
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: FONT, lineHeight: 1.8, color: phosphor(45), margin: 0 }}>
                {t("detail.descriptionEmpty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>
            <SectionToggle
              section={sections.tasks}
              label={t("detail.default.tasksHeading", { total: tasks.length })}
            />
          </SectionHeading>
          <SectionPanel section={sections.tasks}>
            {tasks.length === 0 ? (
              <p className="content-text" style={{ fontFamily: FONT, color: phosphor(45) }}>
                {t("detail.default.tasksEmpty")}
              </p>
            ) : (
              <div className="task-card-row" style={{ gap: "var(--space-xl)" }}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    basePoints={task.point_value}
                    multiplier={computeFactionMultiplier(
                      viewerFactionSlug,
                      task.primary_faction_slug,
                      gameFactions,
                    )}
                    onSignup={onSignup}
                  />
                ))}
              </div>
            )}
          </SectionPanel>
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading>
            <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
          </SectionHeading>
          <SectionPanel section={sections.praxis}>
            {recentPraxis.length === 0 ? (
              <p className="content-text" style={{ fontFamily: FONT, color: phosphor(45) }}>
                {t("detail.default.recentEmpty")}
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
                {recentPraxis.map((praxis) => (
                  <div key={praxis.id} style={{ position: "relative", flex: "1 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                    {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                        so the card's built-in stamp is suppressed. */}
                    {praxis.is_top_for_task && (
                      <TaskCrown
                        size={38}
                        ringInset={3}
                        shadow={`drop-shadow(0 0 4px ${phosphor(35)})`}
                        style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
                      />
                    )}
                    <PraxisCard praxis={praxis} showCrown={false} />
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ ACCESS — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PANEL }}>
            {/* #2299 cut this bar's `re: you` label, leaving one child. The
                `justify-content: space-between` and the `gap` that paired them
                described a layout that no longer exists — a single child in a
                `space-between` row already sits at the start (#2621). */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: SIGNAL_FILL,
                padding: "var(--space-sm) var(--space-lg)",
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: VOID,
                }}
              >
                {t("singularity.join.heading")}
              </span>
            </div>
            {/* #2621: the panel opens at 16px under the ACCESS bar — Coven's
                number, and the one rhythm every join panel now shares. Its own
                value, not a shared one. Stated as a PAIR rather than collapsed
                to one value so the horizontal half stays visibly untouched. */}
            <div style={{ position: "relative", padding: "var(--space-lg) var(--space-lg)" }}>
              <Scanlines />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: FONT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                        fontSize: 22,
                        lineHeight: 1,
                        color: PHOSPHOR,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {t("singularity.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", color: signal(60), margin: "var(--space-md) 0 0", letterSpacing: "0.04em" }}>
                      <Trans t={t} i18nKey="singularity.join.memberStanding">
                        array · <span style={{ color: SIGNAL }}>online</span>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("singularity.join.joinButton")}
                    joiningLabel={t("singularity.join.joining")}
                    intro={
                      <>
                        <div
                          style={{
                            fontFamily: FONT,
                            // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                            fontSize: 22,
                            lineHeight: 1.05,
                            color: PHOSPHOR,
                            letterSpacing: "0.03em",
                            marginBottom: "var(--space-md)",
                          }}
                        >
                          {t("singularity.join.eligibleTitle")}
                        </div>
                        <div className="content-text" style={{ fontFamily: FONT, lineHeight: 1.65, color: phosphor(60), marginBottom: "var(--space-lg)" }}>
                          {t("singularity.join.eligibleBody")}
                        </div>
                      </>
                    }
                  />
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    {/* #2299 cut the faction's own gate kicker; the shared
                        burned notice keeps its own overline. */}
                    {burned && (
                      <div style={{ fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.2em", color: signal(50), marginBottom: "var(--space-sm)" }}>
                        {t("detail.burned.kicker")}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: FONT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                        fontSize: 20,
                        lineHeight: 1.1,
                        color: PHOSPHOR,
                        letterSpacing: "0.03em",
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("singularity.join.gateTitle", { faction: factionName(faction.slug) })}
                    </div>
                    <div className="content-text" style={{ fontFamily: FONT, lineHeight: 1.7, color: phosphor(60) }}>
                      {burned
                        ? t("detail.burned.body", { faction: factionName(faction.slug) })
                        : t("mobile.gateHint", { faction: factionName(faction.slug) })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — primary node + the array */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  ...PANEL,
                  border: `1px solid ${BORDER_HARD}`,
                  boxShadow: `0 0 30px -18px ${phosphor(40)}`,
                  textAlign: "center",
                  padding: "var(--space-xl) var(--space-lg) var(--space-lg)",
                }}
              >
                <Scanlines opacity={0.014} />
                <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.28em", color: phosphor(45), marginBottom: "var(--space-md)" }}>
                  {t("singularity.spotlight.label")}
                </div>
                <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                  <NodeGlyph name={spot.display_name} size={72} avatarUrl={spot.avatar_url} />
                </div>
                <div className="content-title" style={{ position: "relative", fontFamily: FONT, lineHeight: 1, color: PHOSPHOR, letterSpacing: "0.03em" }}>
                  {spot.display_name}
                </div>
                <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.1em", color: signal(55), marginTop: "var(--space-sm)", textTransform: "uppercase" }}>
                  {t("detail.spotlightStat", {
                    level: spot.level,
                    score: spot.all_time_score.toLocaleString(),
                    count: spot.all_time_score,
                  })}
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PANEL, padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
            <Scanlines />
            <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.24em", textTransform: "uppercase", color: phosphor(40), marginBottom: "var(--space-md)" }}>
              {t("detail.default.membersHeading", { total: members.length })}
            </div>
            {array.length === 0 ? (
              <p className="content-text" style={{ position: "relative", fontFamily: FONT, color: phosphor(45) }}>
                {spot
                  ? t("detail.membersEmptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              array.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    padding: "var(--space-sm) 0",
                    borderBottom: `1px solid ${signal(14)}`,
                    textDecoration: "none",
                  }}
                >
                  <NodeGlyph name={m.display_name} size={30} avatarUrl={m.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="content-text"
                      style={{
                        fontFamily: FONT,
                        color: PHOSPHOR,
                        lineHeight: 1.1,
                        letterSpacing: "0.03em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", color: AMBER, letterSpacing: "0.04em" }}>
                    {t("detail.memberLevel", { level: m.level })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The trio's paint (#2651) — phosphor-on-void for both affirmatives, a signal
 * hairline for the cancel, exactly as the three buttons stood. The glow stays on
 * the OPEN verb alone, where it was: the array announces itself once.
 */
const JOIN_SKIN: JoinControlSkin = {
  openStyle: {
    width: "100%",
    fontFamily: FONT,
    fontSize: "var(--text-md)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: VOID,
    background: PHOSPHOR,
    border: "none",
    padding: "var(--space-md)",
    boxShadow: `0 0 16px ${phosphor(35)}`,
    cursor: "pointer",
  },
  confirmStyle: {
    fontFamily: FONT,
    fontSize: "var(--text-base)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: VOID,
    background: PHOSPHOR,
    border: "none",
    padding: "var(--space-md)",
  },
  cancelStyle: {
    fontFamily: FONT,
    fontSize: "var(--text-md)",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: signal(60),
    background: "transparent",
    border: `1px solid ${signal(40)}`,
    padding: "var(--space-md) var(--space-lg)",
  },
  proseStyle: { fontFamily: FONT, lineHeight: 1.7, color: phosphor(72), marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: FONT, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
