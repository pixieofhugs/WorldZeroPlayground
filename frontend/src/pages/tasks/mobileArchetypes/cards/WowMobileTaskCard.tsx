/**
 * WOW MOBILE task card — the kit's QUEST ROW (kit `10-mobile-skins.html`, #901).
 *
 * The other surface the kit actually drew: a cream sheet in a 1.5px gold frame,
 * headed by the 6px gold/plum checker running head, with a MedievalSharp title,
 * the ✦ points figure in burnt gold, and a Lora-italic meta line. It is the
 * phone's shorthand for `WowTaskCard`'s decree — same palette, same two fonts,
 * same ✦ — compressed to a row: no rod, no wax seal, no illuminated rule, since
 * a decree hung from a rod does not fit a 375px list and stretching it would
 * distort the drawing (UX principle 1).
 *
 * Faction tint comes from `task.primary_faction_slug` on the DESKTOP cards; here
 * it does not, deliberately. This archetype only renders for a WOW task (the
 * `mobileTaskCard` dispatcher keys on that same slug), so a second faction's hue
 * can never arrive, and the chronicle palette is the whole point.
 *
 * DEVIATION: the kit puts the title and the ✦ figure on one baseline. At 375px a
 * long quest title and a four-digit score collide, so the figure moves to its
 * own footer row beside the level — §4's "type wins, geometry yields". That
 * footer is also what gives the row its 46px thumb height.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WowQuestFrame,
} from "../../../../components/cards/wowMobile";
import { factionName } from "../../../../utils/factions";
import type { TaskOut } from "../../../../api/tasks";
import { MobileTaskDescription } from "./shared";

export default function WowMobileTaskCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation("tasks");

  return (
    <WowQuestFrame>
      <Link
        to={`/tasks/${task.id}`}
        style={{
          display: "block",
          minHeight: 46,
          padding: "var(--space-md)",
          textDecoration: "none",
          color: WOW_INK,
        }}
      >
        <h2
          className="content-title"
          style={{
            fontFamily: WOW_DISPLAY,
            lineHeight: 1.12,
            margin: 0,
            color: WOW_INK,
            overflowWrap: "anywhere",
          }}
        >
          {task.title}
        </h2>

        <div
          style={{
            fontFamily: WOW_BODY,
            fontStyle: "italic",
            fontSize: "var(--text-content)",
            lineHeight: 1.4,
            color: WOW_MUTED,
            marginTop: "var(--space-xs)",
          }}
        >
          {t("wow.mobile.cardMeta", {
            faction: factionName(task.primary_faction_slug),
            points,
          })}
        </div>

        <MobileTaskDescription
          text={task.description}
          className="content-text"
          style={{
            fontFamily: WOW_BODY,
            lineHeight: 1.55,
            color: WOW_MUTED,
            margin: "var(--space-sm) 0 0",
          }}
        />

        {/* the illuminated rule, gold through plum and back */}
        <div
          aria-hidden
          style={{
            height: 2,
            opacity: 0.85,
            margin: "var(--space-md) 0 var(--space-sm)",
            background:
              "linear-gradient(90deg, transparent, var(--faction-wow-chronicle-gold) 20%, var(--faction-wow-card-accent) 50%, var(--faction-wow-chronicle-gold) 80%, transparent)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-sm)",
          }}
        >
          <span className="eyebrow" style={{ color: WOW_DEEP }}>
            {t("mobile.level", { level: task.level_required })}
          </span>
          <span
            style={{
              fontFamily: WOW_DISPLAY,
              fontSize: "var(--text-title)",
              lineHeight: 1,
              color: WOW_FIGURE,
              whiteSpace: "nowrap",
            }}
          >
            ✦{points}
          </span>
        </div>
      </Link>
    </WowQuestFrame>
  );
}
