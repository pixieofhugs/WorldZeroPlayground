/**
 * THE LAYOUT BLOCKS, RENDERED DIRECTLY (#3139). Seven faction tiles are built
 * on `../selectCardBlocks.tsx`, and the first consumer uses one band form, one
 * alignment and a subset of the props — so every form and prop a later tile may
 * reach for is rendered here, with no tile in between.
 *
 * `everySelectTileKeepsTheSevenSlots.test.tsx` reads the same attributes off
 * the tiles; this file reads them off the blocks. `renderToStaticMarkup` only.
 */
import type { CSSProperties, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import {
  SelectCardBand,
  SelectCardBody,
  SelectCardCall,
  SelectCardFooter,
  SelectCardFrame,
  SelectCardOrnament,
  SelectCardStanding,
} from "../selectCardBlocks";

const html = (node: ReactElement): string => renderToStaticMarkup(node);

/** The opening tag that carries `marker`. */
const tag = (markup: string, marker: string): string => {
  const at = markup.indexOf(marker);
  expect(at, `no ${marker} in ${markup}`).toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf("<", at), markup.indexOf(">", at) + 1);
};

const MARK = <i data-test="mark" />;
const SEAL = <i data-test="seal" />;
const STATES = ["locked", "eligible", "member"] as const;

describe("SelectCardFrame owns its box", () => {
  it("keeps the fluid 360x300 column whatever style a tile hands it", () => {
    const frame = tag(
      html(
        <SelectCardFrame
          style={{
            width: 10,
            maxWidth: 999,
            minHeight: 1,
            height: 300,
            display: "block",
            flexDirection: "row",
            flexGrow: 0,
            boxSizing: "content-box",
            color: "red",
          }}
        >
          x
        </SelectCardFrame>,
      ),
      "data-select-frame",
    );
    for (const declaration of [
      "width:100%",
      "max-width:360px",
      "min-height:300px",
      "height:auto",
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      // What takes the height a stretched row hands the tile's wrapper.
      "flex-grow:1",
      // Paint is the tile's and passes through.
      "color:red",
    ]) {
      expect(frame).toContain(declaration);
    }
    for (const hostile of ["width:10px", "max-width:999px", "min-height:1px", "display:block", "flex-grow:0"]) {
      expect(frame).not.toContain(hostile);
    }
    // `min-height:300px` ends in the hostile height's spelling, hence the anchor.
    expect(frame).not.toMatch(/[";]height:300px/);
  });

  it("passes a tile's class and data attributes through", () => {
    const frame = tag(html(<SelectCardFrame className="redacted" data-redacted="true" />), "data-select-frame");
    expect(frame).toContain('class="redacted"');
    expect(frame).toContain('data-redacted="true"');
  });
});

describe("SelectCardBand, row form", () => {
  const row = (state: (typeof STATES)[number], align?: "center" | "start") =>
    html(
      <SelectCardBand form="row" align={align} state={state} mark={MARK} seal={SEAL} sealSize={22}>
        NAME
      </SelectCardBand>,
    );

  it("is centred by default: 1fr auto 1fr", () => {
    const band = tag(row("locked"), 'data-select-slot="band"');
    expect(band).toContain("display:grid");
    expect(band).toContain("grid-template-columns:1fr auto 1fr");
    expect(tag(row("locked"), ">NAME<")).toContain("text-align:center");
  });

  it('sets the name against the mark on align="start": auto 1fr auto', () => {
    expect(tag(row("locked", "start"), 'data-select-slot="band"')).toContain(
      "grid-template-columns:auto 1fr auto",
    );
    expect(tag(row("locked", "start"), ">NAME<")).toContain("text-align:start");
  });

  it.each(["center", "start"] as const)("draws mark, name, seal in that order (%s)", (align) => {
    const markup = row("member", align);
    const order = ['data-test="mark"', ">NAME<", "data-select-seal", 'data-test="seal"'].map((needle) =>
      markup.indexOf(needle),
    );
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it.each(STATES)("draws the seal for a member only, hidden from assistive tech (%s)", (state) => {
    const markup = row(state);
    if (state !== "member") {
      expect(markup).not.toContain("data-select-seal");
      expect(markup).not.toContain('data-test="seal"');
      return;
    }
    expect(tag(markup, "data-select-seal")).toContain('aria-hidden="true"');
  });

  it.each(["center", "start"] as const)(
    "reserves the seal's width in every state, so the name's cell never changes (%s)",
    (align) => {
      const cells = STATES.map((state) => row(state, align).replace(/<span aria-hidden="true" data-select-seal.*?<\/span>/, ""));
      // Seal aside, the band is the same markup for a member and a stranger.
      expect(cells[0]).toBe(cells[2]);
      expect(cells[1]).toBe(cells[2]);
      expect(cells[0]).toMatch(/<span style="[^"]*width:22px[^"]*"><\/span><\/div>$/);
    },
  );

  it("lets an unbreakable name wrap inside its cell, whatever nameStyle says", () => {
    const name = tag(
      html(
        <SelectCardBand
          form="row"
          state="member"
          seal={SEAL}
          sealSize={22}
          nameStyle={{ fontStyle: "italic", minWidth: 500, overflowWrap: "normal" }}
        >
          NAME
        </SelectCardBand>,
      ),
      ">NAME<",
    );
    expect(name).toContain("font-style:italic");
    expect(name).toContain("min-width:0");
    expect(name).toContain("overflow-wrap:anywhere");
    expect(name).not.toContain("min-width:500px");
  });

  it("keeps its grid whatever style a tile hands it, and takes the paint", () => {
    const band = tag(
      html(
        <SelectCardBand form="row" state="locked" seal={SEAL} sealSize={22} style={{ display: "block", opacity: 0.5 }}>
          NAME
        </SelectCardBand>,
      ),
      'data-select-slot="band"',
    );
    expect(band).toContain("display:grid");
    expect(band).toContain("opacity:0.5");
  });

  it("draws no mark when none is passed", () => {
    expect(
      html(
        <SelectCardBand form="row" state="locked" seal={SEAL} sealSize={22}>
          NAME
        </SelectCardBand>,
      ),
    ).not.toContain("aria-hidden");
  });
});

describe("SelectCardBand, crest form", () => {
  const crest = (state: (typeof STATES)[number], style?: CSSProperties) =>
    html(
      <SelectCardBand form="crest" state={state} mark={MARK} seal={SEAL} sealSize={22} style={style}>
        NAME
      </SelectCardBand>,
    );

  it("stacks the mark above the name", () => {
    const markup = crest("locked");
    const band = tag(markup, 'data-select-slot="band"');
    expect(band).toContain("flex-direction:column");
    expect(markup.indexOf('data-test="mark"')).toBeLessThan(markup.indexOf(">NAME<"));
    expect(tag(markup, 'data-test="mark"')).toBeTruthy();
    expect(markup).toMatch(/<span aria-hidden="true"[^>]*><i data-test="mark">/);
  });

  it.each(STATES)("draws the seal for a member only (%s)", (state) => {
    expect(crest(state).includes("data-select-seal")).toBe(state === "member");
  });

  it("pins the seal to a corner of a band no style can un-position", () => {
    const markup = crest("member", { position: "static", opacity: 0.5 });
    const band = tag(markup, 'data-select-slot="band"');
    expect(band).toContain("position:relative");
    expect(band).not.toContain("position:static");
    expect(band).toContain("opacity:0.5");
    // The seal's holder is the band's last child, absolutely placed.
    expect(markup).toMatch(
      /<span style="position:absolute;[^"]*"><span aria-hidden="true" data-select-seal=""[^>]*><i data-test="seal"><\/i><\/span><\/span><\/div>$/,
    );
  });

  it("lets an unbreakable name wrap inside the band", () => {
    const name = tag(crest("locked"), ">NAME<");
    expect(name).toContain("max-width:100%");
    expect(name).toContain("overflow-wrap:anywhere");
  });
});

describe("the zones pin the footer one way", () => {
  it("the body takes the spare height, whatever style a tile hands it", () => {
    const body = tag(html(<SelectCardBody style={{ flex: "none", opacity: 0.5 }}>x</SelectCardBody>), 'data-select-zone="body"');
    expect(body).toContain("flex:1");
    expect(body).toContain("flex-direction:column");
    expect(body).toContain("opacity:0.5");
  });

  it("the footer carries no pinning of its own", () => {
    expect(html(<SelectCardFooter>x</SelectCardFooter>)).toBe('<div data-select-zone="footer">x</div>');
  });
});

describe("SelectCardOrnament", () => {
  it("renders childless when it is given no drawing, so `:empty` matches it", () => {
    expect(html(<SelectCardOrnament className="rule" style={{ height: 2 }} />)).toBe(
      '<div aria-hidden="true" data-select-slot="ornament" class="rule" style="height:2px"></div>',
    );
  });

  it("holds a drawn node, still hidden from assistive tech", () => {
    expect(
      html(
        <SelectCardOrnament>
          <svg />
        </SelectCardOrnament>,
      ),
    ).toBe('<div aria-hidden="true" data-select-slot="ornament"><svg></svg></div>');
  });
});

describe("SelectCardStanding", () => {
  const standing = (members?: number) =>
    html(
      <SelectCardStanding
        members={members}
        headcount={(count) => `${count} fellows`}
        separator=" / "
        style={{ display: "flex" }}
        standingStyle={{ fontWeight: 700 }}
        headcountStyle={{ opacity: 0.5 }}
      >
        You are in.
      </SelectCardStanding>,
    );

  it("paints the row, the standing and the headcount each from its own style", () => {
    expect(standing(3)).toBe(
      '<div data-select-row="standing" style="display:flex">' +
        '<span data-select-slot="standing" style="font-weight:700">You are in.</span>' +
        '<span data-select-slot="headcount" style="opacity:0.5"> / 3 fellows</span>' +
        "</div>",
    );
  });

  it("drops the headcount and its separator together when no count is known", () => {
    expect(standing()).toBe(
      '<div data-select-row="standing" style="display:flex">' +
        '<span data-select-slot="standing" style="font-weight:700">You are in.</span>' +
        "</div>",
    );
  });

  it("draws a count of zero: unknown is not the same as none", () => {
    expect(standing(0)).toContain("0 fellows");
  });
});

describe("SelectCardCall", () => {
  it("wears the tile's class and paint, and stays full width", () => {
    const call = html(
      <SelectCardCall className="cta" style={{ width: 80, color: "red" }}>
        Visit
      </SelectCardCall>,
    );
    expect(call).toMatch(/^<button[^>]*>Visit<\/button>$/);
    expect(call).toContain('type="button"');
    expect(call).toContain('class="cta"');
    expect(call).toContain("color:red");
    expect(call).toContain("width:100%");
    expect(call).not.toContain("width:80px");
    expect(call).toContain("cursor:pointer");
  });

  it("shuts rather than leaves", () => {
    const call = html(<SelectCardCall disabled>Visit</SelectCardCall>);
    expect(call).toMatch(/^<button[^>]*\bdisabled\b/);
    expect(call).toContain("cursor:default");
  });
});
