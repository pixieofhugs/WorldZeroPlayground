/** Picks a pseudo-thumbnail art key from filename keywords, else a generic page. */
import type { MediaType } from "../../../api/praxis";

export type MediaArtKey =
  | "turnstile"
  | "shoes"
  | "crowd"
  | "fruit"
  | "eye"
  | "tentacle"
  | "spread"
  | "pan"
  | "drawing"
  | "ticket"
  | "window"
  | "stamp"
  | "before"
  | "after"
  | "bulb"
  | "page"
  | "leaf"
  | "recipe"
  | "audio"
  | "video"
  | "generic";

export function pickArtKey(filename: string, kind?: MediaType): MediaArtKey {
  if (kind === "audio") return "audio";
  if (kind === "video") return "video";
  const lower = filename.toLowerCase();
  if (lower.includes("turnstile")) return "turnstile";
  if (lower.includes("shoe")) return "shoes";
  if (lower.includes("crowd")) return "crowd";
  if (lower.includes("fruit")) return "fruit";
  if (lower.includes("eye")) return "eye";
  if (lower.includes("tentacle")) return "tentacle";
  if (lower.includes("spread")) return "spread";
  if (lower.includes("pan")) return "pan";
  if (lower.includes("draw") || lower.includes("doodle")) return "drawing";
  if (lower.includes("ticket") || lower.includes("stub")) return "ticket";
  if (lower.includes("window")) return "window";
  if (lower.includes("stamp")) return "stamp";
  if (lower.includes("before")) return "before";
  if (lower.includes("after")) return "after";
  if (lower.includes("bulb") || lower.includes("light")) return "bulb";
  if (lower.includes("leaf") || lower.includes("plant")) return "leaf";
  if (lower.includes("recipe") || lower.includes("card")) return "recipe";
  return "page";
}
