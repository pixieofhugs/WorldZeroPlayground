import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import "../../../i18n";
import { surfaceMap } from "../../../factions";

export const STATES = ["locked", "eligible", "member"] as const;

/** A dispatched tile as the directory mounts it, in one standing. */
export function renderTile(slug: string, state: (typeof STATES)[number]): string {
  const Tile = surfaceMap("factionSelectCard")[slug];
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tile state={state} onVisit={() => {}} />
    </MemoryRouter>,
  );
}

/** Every standing's markup, so a claim holds in all three. */
export const tileMarkup = (slug: string): string[] => STATES.map((state) => renderTile(slug, state));
