/**
 * Badge artwork registry (ADR-0033, #459). The backend sends only
 * `{ key, name }` — the image is a bundled frontend asset mapped by key,
 * exactly like faction sigils. Placeholder line art for now; every glyph
 * draws in `currentColor` so it inherits the surrounding skin's ink and
 * flips light/dark through the cascade (no hardcoded hex — CLAUDE.md).
 */
import type { ComponentType } from 'react'

export interface BadgeArtProps {
  /** px box (square). */
  size?: number
}

/** sock_puppeteer — the marionette control bar: crossed rods + three strings. */
function SockPuppeteerArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      role="img"
      aria-label="Sock Puppeteer badge"
    >
      <path d="M3 6h18" />
      <path d="M12 2v8" />
      <path d="M6 6v10" />
      <path d="M18 6v10" />
      <circle cx="6" cy="18.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18.5" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** sock_puppet — the sock itself, one button eye and a stitched mouth. */
function SockPuppetArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Sock Puppet badge"
    >
      <path d="M8 2v9.5c0 1.5-.8 2.4-2.2 3.3C4.3 15.8 3.5 17 3.8 18.6 4.2 20.6 6 22 8.2 22c1.6 0 2.9-.6 4-1.7L16 16.5V2Z" />
      <path d="M8 5.5h8" />
      <circle cx="12.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9.5 12.5c1 .8 2.4.8 3.4 0" />
    </svg>
  )
}

/** Unknown key → a plain medallion ring, so a new backend badge never renders
 *  blank while its art is pending. */
function UnknownBadgeArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      role="img"
      aria-label="Badge"
    >
      <circle cx="12" cy="12" r="8" strokeDasharray="3.2 2.4" />
    </svg>
  )
}

/** key → glyph. One row per registry badge (backend/badges.py). */
const BADGE_ART: Record<string, ComponentType<BadgeArtProps>> = {
  sock_puppeteer: SockPuppeteerArt,
  sock_puppet: SockPuppetArt,
}

export function badgeArtFor(key: string): ComponentType<BadgeArtProps> {
  return BADGE_ART[key] ?? UnknownBadgeArt
}

export { BADGE_ART, UnknownBadgeArt }
