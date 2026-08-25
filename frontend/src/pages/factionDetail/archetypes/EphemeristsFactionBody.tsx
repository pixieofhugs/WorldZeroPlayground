import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { EphemeristsSigil } from "../../../components/sigil/EphemeristsSigil";
import {
  AuthorOctagon,
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  DECO,
  GOLD,
  INK,
  LINE,
  MARGINALIA,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
  Tally,
  PLATE as SHEET,
} from "../../../components/factionMarks/ephemeristsPlate";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Ephemerists faction-body — the VALLEY CARD skin of the
 * standardized six-section spine (② The Apparatus, ③ The Road, ④ Tasks,
 * ⑤ Praxis, ⑥ Members). Section ① (hero + side-ledger stats) is
 * EphemeristsFactionHero, rendered above.
 *
 * Same shape as Everymen/UaFactionBody — Tasks/Praxis reuse the app-wide
 * per-faction cards (TaskCard/PraxisCard already dispatch to the Ephemerists
 * archetypes); this file only owns the chrome the design adds around them: the
 * two-column layout, the fixed "Tasks"/"Praxis" titles with marginalia kickers,
 * the join/gate "Road" block, the keeper spotlight + roster, and the FDL laurel
 * on the single top-scoring praxis. Levels read as Roman numerals.
 *
 * SWEPT OFF THE CODEX (#1208). Every mark is the plate kit's rather than a
 * private drawing: the roster's circular vellum medallions are `AuthorOctagon`,
 * the level beside a keeper's name gains the `Tally`, and every section rule was
 * the kit's rune band until #2210 retired the old glyph vocabulary and left the
 * section heads as bare type. Two faction grounds carry ink here — the plate (`ink` 13.91:1,
 * `quiet` 5.98, `caption` 7.22, `nile` 7.00) and the night band under the
 * spotlight (`band-ink` 14.00, `gold` 14.00, `band-quiet` 8.97). Every one of
 * those eight numbers was stale when #1793 re-derived them: they were measured
 * on the PAPYRUS plate, and #1627 turned the whole register night without
 * anything asking this comment to keep up.
 *
 * THE THIRD GROUND IS THE APP'S OWN PAGE, and no plate ink may be spent on it
 * (#1675, #1793). This header used to say "the page beneath both is
 * `.eph-backdrop`, repainted onto `-plate-page`; only `ink`, `quiet` and `nile`
 * clear on it" — and every clause of that was false here. Nothing in this file
 * applies `.eph-backdrop` or any other ground: the root is a bare
 * `.wz-faction-grid`, so what is behind anything outside a `CARD` is
 * `--color-bg-page`, which is near-WHITE in light. #1675 caught the section
 * headings and kickers that way (cream on cream, 1.13:1); #1793 caught the two
 * empty states, at 2.64:1. So everything on this page that is not inside a card
 * takes the app's own tiers, and `PAGE_QUIET` below is the third of them.
 */

/**
 * The page's quiet ink — the app's second tier, NOT `-plate-quiet` (#1793).
 *
 * `QUIET` is #a2977a, minted for the Valley plate's three NIGHT grounds (page
 * 6.38, plate 5.98, panel cell 5.52). On the app's light page it is 2.64:1, and
 * no value of that token could be both: clearing the panel cell needs relative
 * luminance >= 0.2453, clearing the light page needs <= 0.1626, and the
 * intervals do not meet. So the ink changes rather than the token — 7.78:1 in
 * light, 8.33:1 in dark, and the same tier `KICKER` beside it already reads.
 * Both readings are gated in `factionContrast.test.ts`.
 */
const PAGE_QUIET = "var(--color-text-secondary)";

/** One plate off the field journal, at the weight the design draws it. */
const CARD: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: SHEET,
  border: `1px solid ${LINE}`,
  boxShadow: SHADOW,
};

/* The marginalia `Kicker` under each section title lived here. #1909 cut its two
   strings (`ephemerists.tasks.kicker` / `.praxis.kicker`): the audit ruled the
   line restated its own heading, and no faction outside the seven bespoke bodies
   ever had one. The style went with the only component that used it. */

const SECTION_HEADING: CSSProperties = {
  fontFamily: DECO,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's display cut, a step above the content ramp.
  fontSize: 30,
  letterSpacing: "0.04em",
  margin: 0,
  /**
   * THE PAGE'S INK, NOT THE PLATE'S (#1675).
   *
   * `INK` is `-plate-ink`, #f0e6c8 — a cream cut for the night plate the CARDs
   * paint (`-plate-bg`, #171a26), where it measures 11.3:1. The section titles
   * and their kickers are the two things on this page that sit OUTSIDE a card,
   * so in light mode they landed cream-on-cream at **1.13:1** against 3:1 — a
   * 30px heading effectively invisible, on every section, since #1023.
   *
   * The header above this file says "the page beneath both is `.eph-backdrop`",
   * and that is the assumption that rotted: nothing applies `.eph-backdrop`
   * here. The root is a bare `.wz-faction-grid`, so the ground is the app's, and
   * the ink has to be the app's too. Both tokens flip through the
   * `[data-theme="dark"]` cascade, which is why dark mode never showed this.
   */
  color: "var(--color-text-primary)",
};

/**
 * Section title in the plate's display face.
 *
 * It stood over a rune band until #2210, which retires the old glyph vocabulary
 * kit-wide: the notation band is the faction's only ornament row and it is the
 * MASTHEAD's last line, so a page that heads its sections with bare type takes
 * nothing in the band's place.
 */
function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 style={SECTION_HEADING}>{children}</h2>;
}

// `romanLevel` formatted the roster and spotlight levels as "level {roman}".
// #1863 retired the roman numeral as a name for a character's level, and #1911
// settled both rows onto the shared "Level {{level}}", which takes the integer.
// `toRoman` still numbers the codex's own ornament below.

/**
 * A keeper's portrait. The codex struck these as circular vellum medallions;
 * the plate cuts corners, so this is the kit's `AuthorOctagon` at whatever size
 * the slot asks for — the same cartouche the roster rows in the design use.
 *
 * IT TOOK A NAME AND NOTHING ELSE until #2228, so both mounts below drew a
 * keeper's initials over their uploaded photo — not a fallback misfiring, but a
 * surface with no image path to fall back from. `members` has been
 * `CharacterOut[]` all along and `avatar_url` was already on the wire; only this
 * component declined to read it. It takes the whole character so a third mount
 * cannot repeat the omission by passing half of one.
 */
function Medallion({ character, size }: { character: CharacterOut; size: number }) {
  return (
    <AuthorOctagon
      name={character.display_name}
      avatarUrl={character.avatar_url}
      size={size}
      fontSize={size * 0.4}
    />
  );
}

export default function EphemeristsFactionBody({ state }: { state: FactionDetailState }) {
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

  // ② apparatus paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② THE APPARATUS */}
        <div style={{ ...CARD, padding: "var(--space-xl) var(--space-2xl)" }}>
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <EphemeristsSigil size={15} color={BRASS} />
            <span style={{ ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.22em", color: CAPTION }}>
              {t("detail.aboutHeading")}
            </span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BRASS}, transparent)` }} />
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: READING, lineHeight: 1.78, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: READING, lineHeight: 1.78, color: QUIET, margin: 0 }}>
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
              <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: "italic", color: PAGE_QUIET }}>
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
              <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: "italic", color: PAGE_QUIET }}>
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
                        size={44}
                        rotate="-8deg"
                        shadow={`drop-shadow(1.5px 2px 0 color-mix(in srgb, ${INK} 28%, transparent))`}
                        style={{ position: "absolute", top: -14, right: -10, zIndex: 5 }}
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
        {/* ③ THE ROAD — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...CARD, padding: 0 }}>
            <div style={{ background: BAND, color: BAND_INK, padding: "var(--space-sm) var(--space-lg)", fontFamily: CAPS, fontWeight: 600, fontSize: "var(--text-lg)", letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: `inset 0 -2px 0 ${BRASS}` }}>
              {t("ephemerists.join.heading")}
            </div>
            <div style={{ position: "relative", padding: "var(--space-xl)" }}>
              <div style={{ position: "relative", zIndex: 2 }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: CAPS,
                        fontWeight: 700,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                        fontSize: 22,
                        lineHeight: 1.02,
                        color: INK,
                      }}
                    >
                      {t("ephemerists.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: READING, fontSize: "var(--text-xl)", color: QUIET, margin: "var(--space-md) 0 0" }}>
                      <Trans t={t} i18nKey="ephemerists.join.memberStanding">
                        Standing · <span style={{ fontStyle: "italic", color: BRASS_LIGHT }}>keeper of the road</span>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("ephemerists.join.joinButton")}
                    joiningLabel={t("ephemerists.join.joining")}
                    intro={
                      <>
                        <div
                          style={{
                            fontFamily: CAPS,
                            fontWeight: 700,
                            // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                            fontSize: 23,
                            lineHeight: 1.02,
                            color: INK,
                            marginBottom: "var(--space-md)",
                          }}
                        >
                          {t("ephemerists.join.eligibleTitle")}
                        </div>
                        <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                          {t("ephemerists.join.eligibleBody")}
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
                      <div
                        style={{
                          fontFamily: MARGINALIA,
                          fontStyle: "italic",
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: calligraphic flourish above the codex title.
                          fontSize: 13,
                          color: CAPTION,
                          marginBottom: "var(--space-xs)",
                        }}
                      >
                        {t("detail.burned.kicker")}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: CAPS,
                        fontWeight: 700,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                        fontSize: 21,
                        lineHeight: 1.08,
                        color: INK,
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("ephemerists.join.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.65, color: INK }}>
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

        {/* ⑥ MEMBERS — keeper of the road + the keepers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: BAND,
                  color: BAND_INK,
                  border: `1px solid ${BRASS}`,
                  boxShadow: SHADOW,
                  textAlign: "center",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    opacity: 0.14,
                    backgroundImage: `repeating-linear-gradient(0deg, ${BRASS_LIGHT} 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, ${BRASS_LIGHT} 0 1px, transparent 1px 20px)`,
                  }}
                />
                <div style={{ position: "relative", zIndex: 2, padding: "var(--space-xl) var(--space-lg) var(--space-lg)" }}>
                  <div
                    style={{
                      ...SMALL_CAPS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the incised caption over the spotlight's medallion.
                      fontSize: 11,
                      letterSpacing: "0.22em",
                      color: GOLD,
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {t("ephemerists.spotlight.label")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                    <Medallion character={spot} size={72} />
                  </div>
                  <div
                    style={{
                      fontFamily: DECO,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the name plate on the spotlight's band.
                      fontSize: 22,
                      lineHeight: 1.1,
                      letterSpacing: "0.04em",
                      color: BAND_INK,
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: BAND_QUIET, marginTop: "var(--space-sm)" }}>
                    {t("detail.spotlightStat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                      count: spot.all_time_score,
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...CARD, padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
            <div style={{ position: "relative", zIndex: 2, ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.2em", color: CAPTION, marginBottom: "var(--space-md)" }}>
              {t("detail.default.membersHeading", { total: members.length })}
            </div>
            {roster.length === 0 ? (
              <p className="content-text" style={{ position: "relative", zIndex: 2, fontFamily: MARGINALIA, fontStyle: "italic", color: QUIET }}>
                {spot
                  ? t("detail.membersEmptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid ${RULE}`, textDecoration: "none" }}
                >
                  <Medallion character={m} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="content-text" style={{ fontFamily: READING, color: INK, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <Tally level={m.level} />
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: BRASS_LIGHT }}>
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
 * The trio's paint (#2651).
 *
 * THE ONE PLATE CTA (#2146) — ground, ink and enclosure from `.eph-cta`, because
 * the enclosure changes width between the cascades and no inline style has a
 * cascade. That class dressed the open verb and the affirmative and never the
 * cancel, which is exactly what the skin's single `className` slot reaches: the
 * two affirmatives. The cancel stays a marginal note in the margin's own hand.
 */
const JOIN_SKIN: JoinControlSkin = {
  className: "eph-cta",
  openStyle: { width: "100%", ...SMALL_CAPS, fontSize: "var(--text-xl)", letterSpacing: "0.14em", padding: "var(--space-md)", cursor: "pointer" },
  confirmStyle: { ...SMALL_CAPS, fontSize: "var(--text-lg)", letterSpacing: "0.12em", padding: "var(--space-md)" },
  cancelStyle: { fontFamily: MARGINALIA, fontStyle: "italic", fontSize: "var(--text-lg)", letterSpacing: "0.06em", color: QUIET, background: "transparent", border: `1px solid ${LINE}`, padding: "var(--space-md) var(--space-lg)" },
  proseStyle: { fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: READING, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
