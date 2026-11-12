/**
 * The gallery disclosures — Tasks / Praxis on a faction detail page (#2311),
 * Praxis / Proposed tasks on a character profile (#2958).
 *
 * Each surface declares its own {@link SectionSurface}. Separate storage keys
 * on purpose: folding Praxis on a faction page must not fold it on profiles.
 * This file supplies button semantics and the marker, never the paint; each
 * skin passes its heading text through {@link SectionToggle}.
 *
 * Not collapsible: Charter/Roll/Members and About/Badges (sidebar ruling
 * 2026-08-02: a fold must never hide an obligation, e.g. how to join). Phone
 * profiles use a segmented switch instead (#2996).
 *
 * Not `<details>`: the heading is a sibling of the gallery, not its parent, and
 * `<summary>` can't carry explicit `aria-expanded`/`aria-controls`.
 *
 * The pure helpers are exported only for tests (owner ruling on #2693): the
 * node harness can't mount the hook, so they are the only testable seam.
 */
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";

/**
 * What a surface declares to own a set of disclosures. The body-id prefix is
 * not derived from the storage key: it is the `aria-controls` target.
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
 * Per-account storage key. The bare-key fallback is real (signed out, or
 * `/auth/me` in flight); the hook re-reads when the id arrives.
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
 * Which sections a stored preference folds. Every failure mode (junk,
 * non-array, unknown id) resolves to OPEN.
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
  // Normalized to page order.
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
 * Disclosure state for one page; called once per archetype.
 *
 * ponytail: per account × surface, not per page. For per-page folds, store a
 * `Record<slug, Id[]>` and take the slug; call sites don't change.
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

  // `/auth/me` resolves after first render; re-read during render, not in an
  // effect, so sections don't paint open then snap shut.
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
          // Storage refused: the fold still holds for this session.
        }
        return { key: previous.key, collapsed };
      });
    },
    [surface],
  );

  // Cast restores the key union `Object.fromEntries` loses.
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
 * Button semantics worn inside each archetype's heading; all type inherits.
 * SVG marker, not `›`: several display faces lack U+203A. One 1px hairline on
 * every face is the owner's ruling (#2372), not a bug.
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

/** The folded half: carries the `aria-controls` id; hides with `hidden`. */
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

/** Resets button UA defaults so the heading's type shows through. */
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
