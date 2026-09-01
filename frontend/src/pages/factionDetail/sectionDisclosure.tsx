/**
 * The gallery disclosures — Tasks / Praxis on a faction detail page (#2311),
 * Praxis / Proposed tasks on a character profile (#2958).
 *
 * A faction with a dozen tasks pushed everything under it off the screen: two
 * unbounded card grids, no way to fold either. A profile with a lot of praxis
 * does the same thing, which is why the primitive generalised rather than being
 * copied — a SURFACE now declares its own {@link SectionSurface} (which
 * galleries, which storage key, which body-id prefix) and everything below is
 * neutral about who is asking.
 *
 * SEPARATE KEYS, DELIBERATELY. Folding Praxis on a faction page must not fold
 * Praxis on every character profile: they are different objects that happen to
 * share a word. One shared key would have been a line shorter and wrong.
 *
 * This is the ONE primitive every archetype consumes — the shape is unified, the
 * components are not, which is the #1911 precedent and what `frontend/CLAUDE.md`
 * requires ("each faction has its own card archetype; don't unify"). Each skin
 * keeps its own heading component, rule ornament and colour and simply passes
 * its heading text through {@link SectionToggle}; this file supplies the button
 * semantics and the marker, never the paint. On the profile that pass-through is
 * `ProfileKit.sectionHeading`, which is why six skins got the fold from one edit.
 *
 * WHAT IS *NOT* COLLAPSIBLE, and why it is not an oversight. On a faction page:
 * the Charter, The Roll and Members. On a profile: About and Badges. That is the
 * sidebar's own ruling (2026-08-02, `hooks/useSidebarPanelLayout.ts`) applied
 * two surfaces over: collapsing is the one gesture that can silently swallow an
 * obligation, so a panel that exists to tell you somebody is waiting on you is
 * not hideable. The Roll is how a player JOINS, and on the gate state it is how
 * they learn why they cannot. The Charter is a few paragraphs — folding it saves
 * nothing, and neither About (a bio) nor Badges (a row of marks) is what pushes
 * a profile down; the two unbounded galleries are.
 *
 * WHAT IS NOT COLLAPSIBLE FOR A DIFFERENT REASON: the na and WOW phone skins.
 * Both draw Praxis and Proposed tasks behind a segmented Chronicles / Quests
 * switch rather than as two stacked sections, so exactly one gallery is ever on
 * screen and there is no section heading to hang a control in. A fold on top of
 * that is a second mechanism answering a question the switch already answers.
 * Every OTHER phone rendering does fold: `ProfileSkin` draws the same two
 * sections at both widths.
 *
 * WHY NOT `<details>` / `<summary>`. It was the first thing tried, and it loses
 * on two counts that are not stylistic. (1) `<details>` requires the folded
 * content to be a DOM DESCENDANT of the element carrying the marker, and in
 * every skin the heading is a sibling of the gallery inside a bespoke flex
 * column — adopting it means restructuring every call site's JSX nesting and
 * re-testing every layout, against two props here. (2) The issue asks for
 * explicit `aria-expanded` + `aria-controls`, and `<summary>` gives neither: its
 * expanded state is implicit and browser-owned, there is no separately
 * identified region for `aria-controls` to point at, and authoring
 * `aria-expanded` on a `<summary>` is contradicted by the element's own
 * mapping. A `<button>` is what the ARIA disclosure pattern actually is, and it
 * is what the rail already ships. (`<summary>`'s default marker and
 * `display: list-item` would also need CSS resets across every skin, and CSS
 * belongs to another agent — a smaller point, but a real one.)
 *
 * THE STORAGE IDIOM IS THE RAIL'S, UNCHANGED: a pure resolver, a lazy
 * `useState` initializer wrapping the browser read in try/catch (the repo's
 * tests render with no DOM), and a write on every change. What is deliberately
 * NOT reused is `SidebarPanelId` — these are not sidebar panels and registering
 * them there would put them in the rail's blob and in its collapsible ruling.
 *
 * WHY THE DECISIONS BELOW ARE EXPORTED WHEN ONLY A TEST IMPORTS THEM. A
 * dead-export audit (#2693) listed the ids constant, the storage-key resolver,
 * the body-id resolver, `resolveCollapsedSections`,
 * `serializeCollapsedSections` and `toggleCollapsedSection` as reachable only
 * from `__tests__` (#2958 renamed the first three; `FACTION_SECTIONS` is now a
 * real import in `settings/sections/CookiesSection.tsx` besides). True, and not a
 * defect — they are the only seam this harness can reach. `vite.config.ts`
 * declares vitest with no `environment`, so tests run in node: no jsdom, no
 * click events, no `localStorage`, effects never run, and every test is one
 * `renderToStaticMarkup` pass. {@link useSectionDisclosures} cannot be mounted
 * and toggled here, so what a stored blob is allowed to be, what junk it tolerates,
 * and the `aria-controls` id that must match the panel it names are asserted on
 * these or not at all. Owner ruling 2026-08-28 on #2693: keep them, note why —
 * if the harness ever gains a DOM they become re-examinable, and until then an
 * audit that lists them again is measuring the harness, not this module.
 */
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";

/**
 * Everything a surface has to declare to own a set of disclosures. Three
 * fields, all of them things a second surface has to differ on: WHICH galleries
 * fold, WHERE the preference is remembered, and what its panels are called.
 *
 * The body-id prefix is not derived from the storage key on purpose. It is the
 * `aria-controls` target — a published, referenced name — and deriving it would
 * couple a screen reader's reference to a storage key's spelling.
 */
export interface SectionSurface<Id extends string = string> {
  /** The long galleries this surface can fold, in page order. */
  readonly ids: readonly Id[];
  /** Base key; the account id is appended, exactly as the rail's is. */
  readonly storageKey: string;
  /** Prefixes the id each panel carries — see {@link sectionBodyId}. */
  readonly bodyIdPrefix: string;
}

/** A faction detail page: its task grid and its recent-praxis grid (#2311). */
export const FACTION_SECTIONS = {
  ids: ["tasks", "praxis"],
  storageKey: "wz-faction-sections",
  bodyIdPrefix: "wz-faction-section",
} as const satisfies SectionSurface;

/** A character profile: its praxis gallery and its proposed-task row (#2958). */
export const PROFILE_SECTIONS = {
  ids: ["praxis", "proposed"],
  storageKey: "wz-profile-sections",
  bodyIdPrefix: "wz-profile-section",
} as const satisfies SectionSurface;

/**
 * The account's storage key, for whichever base key it is handed.
 *
 * Unlike the rail, both of these surfaces render for a signed-out visitor and
 * for the window while `/auth/me` is still in flight, so the bare-key fallback
 * is a state a player really reaches rather than only the DOM-less render. The
 * hook below re-reads when the id arrives, which is why that is harmless.
 */
export function sectionStorageKey(
  baseKey: string,
  accountId: number | null | undefined,
): string {
  return accountId === null || accountId === undefined
    ? baseKey
    : `${baseKey}:${accountId}`;
}

/** The id a section's body carries and its disclosure points `aria-controls` at. */
export function sectionBodyId<Id extends string>(
  surface: SectionSurface<Id>,
  id: Id,
): string {
  return `${surface.bodyIdPrefix}-${id}`;
}

/**
 * Which sections a stored preference folds — extracted pure so it is testable in
 * the repo's DOM-less node env, as `resolveInitialPanelLayout` is.
 *
 * Every failure mode resolves to OPEN: junk, non-JSON, a non-array, or an id
 * this build no longer has — including an id belonging to a DIFFERENT surface,
 * which is what makes a mistakenly shared key merely inert rather than
 * confusing. Nothing a stale value can say may leave a player looking at a page
 * whose galleries are gone with no control to bring them back.
 */
export function resolveCollapsedSections<Id extends string>(
  ids: readonly Id[],
  stored: string | null,
): readonly Id[] {
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
  return ids.filter((id) => parsed.includes(id));
}

export function serializeCollapsedSections<Id extends string>(
  ids: readonly Id[],
  collapsed: readonly Id[],
): string {
  return JSON.stringify(ids.filter((id) => collapsed.includes(id)));
}

export function toggleCollapsedSection<Id extends string>(
  ids: readonly Id[],
  collapsed: readonly Id[],
  id: Id,
): readonly Id[] {
  return collapsed.includes(id)
    ? collapsed.filter((entry) => entry !== id)
    : ids.filter((entry) => entry === id || collapsed.includes(entry));
}

/** One section's disclosure: what the heading needs and what the body needs. */
interface SectionDisclosure {
  readonly open: boolean;
  readonly bodyId: string;
  readonly toggle: () => void;
}

function read<Id extends string>(
  surface: SectionSurface<Id>,
  storageKey: string,
): readonly Id[] {
  try {
    return resolveCollapsedSections(surface.ids, localStorage.getItem(storageKey));
  } catch {
    return [];
  }
}

/**
 * The disclosure state for one page of one surface. Called once per archetype —
 * a page mounts exactly one body, so its sections need no shared context.
 *
 * ponytail: the preference is per ACCOUNT × SURFACE, not per account × page.
 * Folding Tasks on one faction page folds it on all of them, and folding Praxis
 * on one profile folds it on every profile; that is the rail's own reading of
 * what a fold is — chrome, a standing preference about a KIND of section, not a
 * fact about one faction or one player. If that ever wants to be per page, the
 * stored value becomes a `Record<slug, Id[]>` and the hook takes the slug;
 * nothing at the call sites changes.
 */
export function useSectionDisclosures<Id extends string>(
  surface: SectionSurface<Id>,
): Readonly<Record<Id, SectionDisclosure>> {
  const { user } = useAuth();
  const storageKey = sectionStorageKey(surface.storageKey, user?.account_id);

  const [stored, setStored] = useState<{
    key: string;
    collapsed: readonly Id[];
  }>(() => ({ key: storageKey, collapsed: read(surface, storageKey) }));

  // `/auth/me` resolves AFTER the first render, so the initializer above ran
  // against the bare key and the account's own fold has not been read yet.
  // Adjusting during render rather than in an effect is React's documented
  // answer to "state derived from a prop that changed" — an effect would paint
  // the sections open first and snap them shut afterwards.
  if (stored.key !== storageKey) {
    setStored({ key: storageKey, collapsed: read(surface, storageKey) });
  }

  const toggle = useCallback(
    (id: Id) => {
      setStored((previous) => {
        const collapsed = toggleCollapsedSection(surface.ids, previous.collapsed, id);
        try {
          localStorage.setItem(
            previous.key,
            serializeCollapsedSections(surface.ids, collapsed),
          );
        } catch {
          // A browser refusing storage (private mode, quota) must not cost the
          // player the gesture — the fold still holds for this session.
        }
        return { key: previous.key, collapsed };
      });
    },
    [surface],
  );

  // `Object.fromEntries` cannot keep the key union, and the whole value of this
  // hook at a call site is that `sections.praxis` is a compile error on a
  // surface with no praxis. The cast is that union being asserted back on, over
  // an object built from `surface.ids` one line above.
  return Object.fromEntries(
    surface.ids.map((id) => [
      id,
      {
        open: !stored.collapsed.includes(id),
        bodyId: sectionBodyId(surface, id),
        toggle: () => toggle(id),
      },
    ]),
  ) as Record<Id, SectionDisclosure>;
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
  readonly section: SectionDisclosure;
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
  readonly section: SectionDisclosure;
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
