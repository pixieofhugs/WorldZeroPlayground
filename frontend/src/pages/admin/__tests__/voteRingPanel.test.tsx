/** Seam: VoteRingView markup — shares, the even-spread baseline, the vote-back note. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { VoteRingView } from "../VoteRingPanel";

const rec = (account_id: number, display_name: string, share: number, votes_back: number) => ({
  account_id, display_name, share, votes_back, votes_back_of: 12, votes: 4, average_stars: 5,
});
const render = (ring: Parameters<typeof VoteRingView>[0]["ring"]) =>
  renderToStaticMarkup(<VoteRingView name="Moss" ring={ring} />);

describe("VoteRingView", () => {
  it("shows each share, the baseline out of the eligible, and who votes back", () => {
    const html = render({ total_votes: 8, eligible: 17, recipients: [rec(2, "Ann", 0.5, 9), rec(3, "Bob", 0.25, 0)] });
    expect(html).toContain("8 votes went to 2 of the 17 people they could vote for.");
    expect(html).toContain("50%");
    expect(html).toContain("about 6%");
    expect(html).toContain("Ann votes back: 9 of their 12 votes went to Moss.");
  });

  it("stays quiet about vote-back when the top recipient does not", () => {
    const html = render({ total_votes: 8, eligible: 17, recipients: [rec(2, "Ann", 0.5, 0)] });
    expect(html).not.toContain("votes back");
  });

  it("says so when there are no votes", () => {
    expect(render({ total_votes: 0, eligible: 17, recipients: [] })).toContain("No votes cast this era.");
  });
});
