import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import "../../../i18n";
import { aPraxisCard } from "../../../test/fixtures";
import { PraxisMediaGallery } from "../shared";

const render = (displayPath: string | null) =>
  renderToStaticMarkup(
    <PraxisMediaGallery
      accent="red"
      praxis={aPraxisCard({
        media_items: [
          { id: 1, praxis_id: 1, type: "image", file_path: "a/p.jpg", display_path: displayPath, display_order: 0, created_at: "2026-01-01T00:00:00Z" },
        ],
      })}
    />,
  );

describe("praxis card photo tiles (#3626)", () => {
  it("loads the display copy, lazily", () => {
    const html = render("a/p.display.webp");
    expect(html).toContain("a/p.display.webp");
    expect(html).not.toContain("a/p.jpg");
    expect(html).toContain('loading="lazy"');
  });

  it("falls back to the original when there is no display copy", () => {
    expect(render(null)).toContain("a/p.jpg");
  });
});
