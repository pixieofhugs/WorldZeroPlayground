/** #3111: the S.N.I.D.E. blurb holds a blank line, so its tile draws two paragraphs.
 * Pinned to #3111's placeholder catalog copy; update when the copy is promoted. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

import SnideSelectCard from "../SnideSelectCard";

describe("the S.N.I.D.E. select tile", () => {
  it("draws its blurb as two paragraphs", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SnideSelectCard state="locked" members={3} onVisit={() => {}} />
      </MemoryRouter>,
    );
    const pitch = markup.split('data-select-slot="pitch"')[1].split("</div>")[0];
    expect(pitch.match(/<p[ >]/g)).toHaveLength(2);
  });
});
