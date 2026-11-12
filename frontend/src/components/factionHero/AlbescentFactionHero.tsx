import type { FactionHeroProps } from "../../pages/FactionDetail";
import DefaultFactionHero from "./DefaultFactionHero";

/**
 * Albescent faction hero (#2504, ADR-0048): {@link DefaultFactionHero} plus one
 * class. `.alb-faction-hero` (index.css, motion.ornament.css) adds the prism sheet
 * as a token override, the `alb-spin` labyrinth turn, and joins `.alb-prism`'s
 * selector lists so the ground matches the cards' (#2550).
 */
export default function AlbescentFactionHero(props: FactionHeroProps) {
  return (
    <div className="alb-faction-hero">
      <DefaultFactionHero {...props} />
    </div>
  );
}
