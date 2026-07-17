/**
 * FactionSigilRow — mobile faction filter (#659, ADR-0040 §3).
 *
 * The check this issue calls out: the row must render exactly the factions it
 * is given (never a hardcoded literal list), so a `getFactions()`-shaped
 * response that omits `albescent` (pre-reveal, ADR-0027/#390) never leaks an
 * Albescent circle. Also confirms the toggle-off click wiring calls `onChange`
 * with the right slug, using the same element-tree-walk technique as
 * mobileArchetypeDispatch.test.tsx (no DOM in this test env).
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

// Stub the i18n hook to a plain t so the component can be invoked as a plain
// function (no hook dispatcher) when we walk its element tree below. The rest
// of react-i18next (initReactI18next, used by ../../../i18n) is real.
vi.mock("react-i18next", async (importActual) => {
  const actual = await importActual<typeof import("react-i18next")>();
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});
// factionName/factionCssVar read the raw i18n instance, not the hook.
import "../../../i18n";

import FactionSigilRow, { nextFactionValue } from "../FactionSigilRow";
import type { FactionOut } from "../../../api/factions";

const FACTIONS_WITHOUT_ALBESCENT: FactionOut[] = [
  { slug: "everymen" },
  { slug: "ua" },
  { slug: "snide" },
  { slug: "ephemerists" },
  { slug: "singularity" },
  { slug: "wow" },
];

describe("FactionSigilRow — secrecy guard (ADR-0027/#390)", () => {
  it("renders no Albescent circle when the factions prop omits it", () => {
    const html = renderToStaticMarkup(
      <FactionSigilRow
        factions={FACTIONS_WITHOUT_ALBESCENT}
        value=""
        onChange={() => {}}
      />,
    );
    expect(html).not.toContain("/Albescent");
    expect(html).not.toContain("var(--faction-albescent)");
  });

  it("renders an Albescent circle once it is present in the factions prop", () => {
    const html = renderToStaticMarkup(
      <FactionSigilRow
        factions={[...FACTIONS_WITHOUT_ALBESCENT, { slug: "albescent" }]}
        value=""
        onChange={() => {}}
      />,
    );
    expect(html).toContain("/Albescent");
  });
});

describe("nextFactionValue — toggle-off decision (#659)", () => {
  it("selects the tapped slug when a different faction is active", () => {
    expect(nextFactionValue("everymen", "ua")).toBe("ua");
  });
  it("clears the filter when the already-active faction is tapped again", () => {
    expect(nextFactionValue("ua", "ua")).toBe("");
  });
});

// Depth-first search for the button element whose accessible name matches.
function findButtonByLabel(node: unknown, label: string): ReactElement | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButtonByLabel(child, label);
      if (hit) return hit;
    }
    return null;
  }
  const element = node as ReactElement;
  const props = element.props as
    | { "aria-label"?: string; children?: unknown }
    | undefined;
  if (props?.["aria-label"] === label) return element;
  return props ? findButtonByLabel(props.children, label) : null;
}

describe("FactionSigilRow — click wiring calls onChange", () => {
  it("tapping a faction circle calls onChange with that faction's slug", () => {
    const onChange = vi.fn();
    const tree = FactionSigilRow({
      factions: FACTIONS_WITHOUT_ALBESCENT,
      value: "",
      onChange,
    });
    // useTranslation is stubbed to `t = (key) => key`, so factionName's
    // catalog lookup below the hook doesn't apply here — aria-label comes
    // from factionName() directly (not the stubbed hook), so it's still the
    // real English name.
    const button = findButtonByLabel(tree, "UA");
    expect(button, "UA sigil button found").not.toBeNull();
    (button?.props as { onClick: () => void }).onClick();
    expect(onChange).toHaveBeenCalledWith("ua");
  });

  it("tapping the already-active faction circle clears the filter", () => {
    const onChange = vi.fn();
    const tree = FactionSigilRow({
      factions: FACTIONS_WITHOUT_ALBESCENT,
      value: "ua",
      onChange,
    });
    const button = findButtonByLabel(tree, "UA");
    (button?.props as { onClick: () => void }).onClick();
    expect(onChange).toHaveBeenCalledWith("");
  });

  it('tapping the "all factions" circle calls onChange with an empty slug', () => {
    const onChange = vi.fn();
    const tree = FactionSigilRow({
      factions: FACTIONS_WITHOUT_ALBESCENT,
      value: "ua",
      onChange,
    });
    // useTranslation is stubbed to `t = (key) => key` in this file, so the
    // "all factions" button's aria-label (sourced from the hook, unlike
    // factionName) is the raw catalog key here, not the resolved "All" copy.
    const button = findButtonByLabel(tree, "mobile.allFactions");
    expect(button, "all-factions button found").not.toBeNull();
    (button?.props as { onClick: () => void }).onClick();
    expect(onChange).toHaveBeenCalledWith("");
  });
});
