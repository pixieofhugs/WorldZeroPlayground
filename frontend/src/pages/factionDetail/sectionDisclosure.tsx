/**
 * The Tasks / Praxis disclosures on a faction detail page (#2311).
 *
 * A faction with a dozen tasks pushed everything under it off the screen: two
 * unbounded card grids, no way to fold either. This is the ONE primitive all
 * eight archetypes consume — the shape is unified, the components are not, which
 * is the #1911 precedent and what `frontend/CLAUDE.md` requires ("each faction
 * has its own card archetype; don't unify"). Each skin keeps its own heading
 * component, rule ornament and colour and simply passes its heading text
 * through {@link SectionToggle}; this file supplies the button semantics and the
 * marker, never the paint.
 *
 * WHAT IS *NOT* COLLAPSIBLE, and why it is not an oversight. The Charter, The
 * Roll and Members have no disclosure. That is the sidebar's own ruling
 * (2026-08-02, `hooks/useSidebarPanelLayout.ts`) applied one surface over:
 * collapsing is the one gesture that can silently swallow an obligation, so a
 * panel that exists to tell you somebody is waiting on you is not hideable. The
 * Roll is how a player JOINS, and on the gate state it is how they learn why
 * they cannot. The Charter is a few paragraphs — folding it saves nothing.
 *
 * WHY NOT `<details>` / `<summary>`. It was the first thing tried, and it loses
 * on two counts that are not stylistic. (1) `<details>` requires the folded
 * content to be a DOM DESCENDANT of the element carrying the marker, and in all
 * eight skins the heading is a sibling of the gallery inside a bespoke flex
 * column — adopting it means restructuring sixteen call sites' JSX nesting and
 * re-testing eight layouts, against two props here. (2) The issue asks for
 * explicit `aria-expanded` + `aria-controls`, and `<summary>` gives neither: its
 * expanded state is implicit and browser-owned, there is no separately
 * identified region for `aria-controls` to point at, and authoring
 * `aria-expanded` on a `<summary>` is contradicted by the element's own
 * mapping. A `<button>` is what the ARIA disclosure pattern actually is, and it
 * is what the rail already ships. (`<summary>`'s default marker and
 * `display: list-item` would also need CSS resets across eight skins, and CSS
 * belongs to another agent — a smaller point, but a real one.)
 *
 * THE STORAGE IDIOM IS THE RAIL'S, UNCHANGED: a pure resolver, a lazy
 * `useState` initializer wrapping the browser read in try/catch (the repo's
 * tests render with no DOM), and a write on every change. What is deliberately
 * NOT reused is `SidebarPanelId` — these are not sidebar panels and registering
 * them there would put them in the rail's blob and in its collapsible ruling.
 */
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";

/** The two long galleries, in page order. */
export const FACTION_SECTION_IDS = ["tasks", "praxis"] as const;

export type FactionSectionId = (typeof FACTION_SECTION_IDS)[number];

/** Base key; the account id is appended, exactly as the rail's is. */
export const FACTION_SECTION_STORAGE_KEY = "wz-faction-sections";

/**
 * The account's storage key.
 *
 * Unlike the rail, this surface renders for a signed-out visitor and for the
 * window while `/auth/me` is still in flight, so the bare-key fallback is a
 * state a player really reaches rather than only the DOM-less render. The hook
 * below re-reads when the id arrives, which is why that is harmless.
 */
export function factionSectionStorageKey(
  accountId: number | null | undefined,
): string {
  return accountId === null || accountId === undefined
    ? FACTION_SECTION_STORAGE_KEY
    : `${FACTION_SECTION_STORAGE_KEY}:${accountId}`;
}

/** The id a section's body carries and its disclosure points `aria-controls` at. */
export function factionSectionBodyId(id: FactionSectionId): string {
  return `wz-faction-section-${id}`;
}

/**
 * Which sections a stored preference folds — extracted pure so it is testable in
 * the repo's DOM-less node env, as `resolveInitialPanelLayout` is.
 *
 * Every failure mode resolves to OPEN: junk, non-JSON, a non-array, or an id
 * this build no longer has. Nothing a stale value can say may leave a player
 * looking at a page whose galleries are gone with no control to bring them back.
 */
export function resolveCollapsedSections(
  stored: string | null,
): readonly FactionSectionId[] {
  if (!stored) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // Normalized to page order, so the serialized value does not depend on the
  // order the player folded them in.
  return FACTION_SECTION_IDS.filter((id) => parsed.includes(id));
}

export function serializeCollapsedSections(
  collapsed: readonly FactionSectionId[],
): string {
  return JSON.stringify(FACTION_SECTION_IDS.filter((id) => collapsed.includes(id)));
}

export function toggleCollapsedSection(
  collapsed: readonly FactionSectionId[],
  id: FactionSectionId,
): readonly FactionSectionId[] {
  return collapsed.includes(id)
    ? collapsed.filter((entry) => entry !== id)
    : FACTION_SECTION_IDS.filter((entry) => entry === id || collapsed.includes(entry));
}

/** One section's disclosure: what the heading needs and what the body needs. */
export interface FactionSection {
  readonly open: boolean;
  readonly bodyId: string;
  readonly toggle: () => void;
}

function read(storageKey: string): readonly FactionSectionId[] {
  try {
    return resolveCollapsedSections(localStorage.getItem(storageKey));
  } catch {
    return [];
  }
}

/**
 * The disclosure state for one faction page. Called once per archetype — a page
 * mounts exactly one body, so the two sections need no shared context.
 *
 * ponytail: the preference is per ACCOUNT, not per account × faction. Folding
 * Tasks on one faction page folds it on all of them, which is the rail's own
 * reading of what a fold is — chrome, a standing preference about a KIND of
 * section, not a fact about one faction. If that ever wants to be per faction,
 * the stored value becomes a `Record<slug, FactionSectionId[]>` and the hook
 * takes the slug; nothing at the sixteen call sites changes.
 */
export function useFactionSections(): Readonly<
  Record<FactionSectionId, FactionSection>
> {
  const { user } = useAuth();
  const storageKey = factionSectionStorageKey(user?.account_id);

  const [stored, setStored] = useState<{
    key: string;
    collapsed: readonly FactionSectionId[];
  }>(() => ({ key: storageKey, collapsed: read(storageKey) }));

  // `/auth/me` resolves AFTER the first render, so the initializer above ran
  // against the bare key and the account's own fold has not been read yet.
  // Adjusting during render rather than in an effect is React's documented
  // answer to "state derived from a prop that changed" — an effect would paint
  // the sections open first and snap them shut afterwards.
  if (stored.key !== storageKey) {
    setStored({ key: storageKey, collapsed: read(storageKey) });
  }

  const toggle = useCallback(
    (id: FactionSectionId) => {
      setStored((previous) => {
        const collapsed = toggleCollapsedSection(previous.collapsed, id);
        try {
          localStorage.setItem(previous.key, serializeCollapsedSections(collapsed));
        } catch {
          // A browser refusing storage (private mode, quota) must not cost the
          // player the gesture — the fold still holds for this session.
        }
        return { key: previous.key, collapsed };
      });
    },
    [],
  );

  const section = (id: FactionSectionId): FactionSection => ({
    open: !stored.collapsed.includes(id),
    bodyId: factionSectionBodyId(id),
    toggle: () => toggle(id),
  });

  return { tasks: section("tasks"), praxis: section("praxis") };
}

/**
 * The button semantics, worn INSIDE each archetype's own heading element.
 *
 * Everything typographic is `inherit`, so the heading it sits in keeps painting
 * it: the skew and acid plate on S.N.I.D.E., the display cut on the Coven's
 * braid row, the phosphor caps on Singularity. The marker is an SVG rather than
 * the rail's `›` glyph because these headings are set in eight display faces,
 * several of which have no U+203A — a missing glyph is a tofu box on a faction's
 * front door, and this costs a hundred bytes to be sure it cannot happen.
 *
 * The drawing is ONE hairline on all eight faces — 1px, butt cap, miter join
 * (#2372), the owner's answer to "is this the Ephemerists' value or everyone's"
 * being "Everywhere". It was put to her that at 1px beside Anton and Archivo
 * Black the marker may read as an artefact rather than a mark; she reaffirmed
 * it. So if a per-faction stroke is ever wanted, that is a NEW decision with
 * screenshots behind it, not a bug in this line — the seam to carry it is three
 * props with these values as defaults.
 */
export function SectionToggle({
  section,
  label,
}: {
  readonly section: FactionSection;
  /** The heading's own text — the visible label AND the accessible name. */
  readonly label: string;
}) {
  const { t } = useTranslation("common");
  return (
    <button
      type="button"
      onClick={section.toggle}
      aria-expanded={section.open}
      aria-controls={section.bodyId}
      aria-label={
        section.open
          ? t("sidebar.panel.collapse", { panel: label })
          : t("sidebar.panel.expand", { panel: label })
      }
      style={TOGGLE_STYLE}
    >
      {label}
      <svg
        aria-hidden="true"
        viewBox="0 0 8 12"
        width="0.55em"
        height="0.8em"
        style={{
          flex: "none",
          transform: section.open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 160ms ease",
        }}
      >
        <path
          d="M1.5 1.5 L6.5 6 L1.5 10.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}

/**
 * The folded half. Carries the id `aria-controls` names, so the reference never
 * dangles, and hides with `hidden` — the rail's idiom: the gallery keeps its
 * state and its scroll position, and the page really does get shorter.
 */
export function SectionPanel({
  section,
  children,
}: {
  readonly section: FactionSection;
  readonly children: ReactNode;
}) {
  return (
    <div id={section.bodyId} hidden={!section.open}>
      {children}
    </div>
  );
}

/**
 * A control that must be invisible: the archetype's heading already sets the
 * face, the size, the tracking and the ink, and a button's UA defaults would
 * overwrite all four. `font: inherit` is the whole point of the reset.
 */
const TOGGLE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  font: "inherit",
  letterSpacing: "inherit",
  textTransform: "inherit",
  color: "inherit",
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  textAlign: "left",
  cursor: "pointer",
};
