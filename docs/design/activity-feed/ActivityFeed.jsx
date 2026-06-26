import React from "react";
import { FactionActivityCard } from "./FactionActivityCard.jsx";
import { FactionlessActivityCard } from "./FactionlessActivityCard.jsx";

/**
 * ActivityFeed — World Zero's single, mixed activity stream.
 *
 * Key idea: this is NOT one feed per faction. It is ONE chronological feed
 * in which each faction posts a card in its own physical archetype, with
 * factionless / system cards woven between them. A row is "factionless"
 * when item.faction is null/undefined — it routes to FactionlessActivityCard;
 * otherwise it routes to FactionActivityCard, which picks the faction's
 * archetype.
 *
 * Theme: wrap in [data-theme="dark"] (or set it on <html>) to flip the
 * neutral chrome + the theme-aware factions. The always-light (ua,
 * albescent) and always-dark (singularity, snide) archetypes hold their
 * own surface by design.
 *
 * Requires the World Zero token CSS to be loaded (see README → Design
 * Tokens). The @keyframes af-blink (terminal cursor) lives in this file's
 * <style> so the component is self-sufficient.
 */
export function ActivityFeed({ items, theme = "light" }) {
  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--color-bg-page)", padding: "42px 18px 80px", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>
      <style>{"@keyframes af-blink{0%,49%{opacity:1}50%,100%{opacity:0}}"}</style>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        <header style={{ textAlign: "center", marginBottom: 34 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 9, letterSpacing: ".32em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>World Zero · Field Activity</div>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 36, color: "var(--color-text-primary)", lineHeight: 1.02, marginTop: 7 }}>The Feed</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 10, lineHeight: 1.6, color: "var(--color-text-secondary)", marginTop: 9, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>One stream. Seven factions, each posting in its own hand — and the unaffiliated in between.</div>
          <div style={{ width: 34, height: 1, background: "var(--color-border-strong)", margin: "16px auto 0" }} />
        </header>

        {items.map((item) =>
          item.faction
            ? <FactionActivityCard key={item.id} item={item} />
            : <FactionlessActivityCard key={item.id} item={item} />
        )}

      </div>
    </div>
  );
}
