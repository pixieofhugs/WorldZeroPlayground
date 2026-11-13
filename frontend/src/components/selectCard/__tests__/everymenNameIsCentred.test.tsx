/**
 * The Everymen tile's band (#3106): no layout here, so centring is checked on
 * the grid — the name is the centre track of `1fr auto 1fr`, and the tracking's
 * trailing space is paid back as padding-left.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import FactionSelectCard, { type SelectState } from "../FactionSelectCard";

const band = (state: SelectState): string => {
  const html = renderToStaticMarkup(<FactionSelectCard faction="everymen" state={state} members={12} />);
  const at = html.indexOf('data-select-slot="band"');
  const start = html.lastIndexOf("<div", at);
  return html.slice(start, html.indexOf("</div>", at));
};

describe("the Everymen name is on the tile's centreline (#3106)", () => {
  it.each(["locked", "eligible", "member"] as const)("sets the name in the centre track of 1fr auto 1fr (%s)", (state) => {
    const html = band(state);
    expect(html).toContain("grid-template-columns:1fr auto 1fr");
    // Three direct cells: mark, name, seal slot — the name is the middle one.
    const cells = html.match(/<span style="[^"]*"/g)!;
    expect(cells[0]).toContain("justify-self:start");
    expect(cells[1]).toContain("text-align:center");
    expect(cells[1]).not.toContain("flex");
    expect(html).toMatch(/justify-self:end;[^"]*width:22px/);
  });

  it("pays back the tracking's trailing space so the glyphs are centred", () => {
    const html = band("eligible");
    expect(html).toContain("letter-spacing:0.16em");
    expect(html).toContain("padding-left:0.16em");
  });
});
