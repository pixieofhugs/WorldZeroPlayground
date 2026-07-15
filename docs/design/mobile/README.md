# Mobile Field Kit — design references

Vendored mobile-native design deliverables for the mobile epic (#494 foundation → #495
design → #496–500 + follow-ups). Build agents read these for **intent** and rebuild on
real app state with this repo's components, hooks, and tokens.

**References, not production code.** The mockups are a review "board": phone frames on a
dark canvas, driven by a demo `<script>` with stand-in data (`VOICE`, `FAC`, `TASKS`,
`PROOFS`). Discard the demo runtime and stand-in shapes — consume the real state
(`useTaskDetail`, `usePraxisDetail`, `useEditPraxis`, the home hooks). Do **not** port the
board chrome (`.board`, `.section-label`, `.phone`, `.rail`).

## What's here

| Path | Use for |
|---|---|
| `mobile-field-kit.html` | The **Default (na)** language + **Everymen** pilot. 8 sections: foundations, FieldDesk/home, character paths, tasks, praxis, players, factions, moments. na is rendered light+dark on every screen; Everymen ships as a token+voice map (rendered on Home). |
| `wow-treatment.html` | The **WOW** contrast pilot — scrapbook window-cards, Caveat script, rose accent, native-**light**. Sections: idiom, home, tasks, praxis, updates, faction page. Built on the real `WowTaskCard` idiom + `--faction-wow-*` tokens. |
| `snide-treatment.html` | The **SNIDE** treatment — redacted-dossier / ransom-note, Bebas Neue + Anton + Archivo Black, acid-green `#b6ff2e`, native-**dark**. A delivered faction reference (not one of the two scheduled pilots) — consume it when the SNIDE per-faction mobile skin is built. Grounds on `--faction-snide-*` + `--font-faction-marker`. |
| `faction-treatments.html` | **All seven** faction treatments in one board (the superset that supersedes the individual pilots as the per-faction source of truth). Each faction rebuilds its real card archetype — not a recolor — across **idiom anatomy, home, tasks, praxis, composer, updates, faction page**. Idioms: **UA** gilt salon (gold-leaf plates, crest, Playfair) · **Singularity** dark terminal (bracketed readout cards, prompts+cursor, keypad) · **Ephemerists** vellum codex (cartographic plates, Cinzel, concord seals, drop caps) · **Albescent** hushed vellum (concentric mark, hairlines, Cormorant italic, witness circles) · **Everymen** union broadsheet (red mastheads, Bebas on halftone, points seals) · **SNIDE** ransom-note dossier · **WOW** whimsy scrapbook. Drives the per-faction follow-up build issues. |

## The mechanism (build this literally)

One markup layer painted by a **token cascade**: `data-theme` (light/dark) sets neutral
surfaces; `data-treatment` (faction slug) overrides `--accent`, `--headline`, paper, voice.
This is the existing `pickVariant` / `--faction-*` seam plus the **form-factor axis** the
#494 foundation already added (`useFormFactor()` + `MOBILE_ARCHETYPE_BY_SLUG` + `Default*`
fallback). na = the `Default*` mobile skin; each faction treatment is a skin over the same
DOM slots (mirrors ADR-0016 — one contract, presentation-only archetypes).

- Spacing: 4pt base · screen gutter 16 · card pad 16 · section gap 14.
- Type: body never < 15px · labels ≥ 8px, tracked + uppercase · headline face swaps per treatment (Lora italic / Special Elite / Caveat).
- Shell: fixed bottom tab bar (Home · Tasks · Praxis · Players · Factions) + sticky action bar + bottom sheets. Never a desktop sidebar.
- All colors resolve to `--faction-*` / theme tokens already in `frontend/src/index.css`. WOW's tape/scrap/ivy tokens already exist there.

## Concept vs literal — corrections (build agents: apply these)

The mockups draw some elements that **do not exist in the domain**. Build the corrected
version, not the drawing:

| Drawn | Reality | Build instead |
|---|---|---|
| Task **difficulty dots** (1–3) + **slots/capacity** (`1/20`, `Open`) | Task has only `point_value`, `level_required`, faction, `task_type` — no difficulty, no signup cap | Faction + points + level gate (when set) + type. Drop dots and slots. |
| Vote **"4.0 average · N votes"** | #264 retired the average; ADR-0014 shows `{base} + {votePoints}`; voter_count hidden (#375) | Show the `base + votes` points stamp. Keep the 1–5 star widget only as the vote **input**. |
| **"Follow"** button + "Following" feed chip | No follow system (relationships are friend/foe, #459) | Feed chips = **Latest / Top-rated** only. Drop Follow. |
| **Global search** (moments) | Not built | Parked — do not build from this design. |
| Settings: notifications / privacy / about rows | Not real features | Keep only dark-mode toggle, sign out, link to character management. |
| **Updates** screen (WOW §05) + appbar bell | Faction-based inbox, separate effort | Parked. Bell links to the existing Updates route; don't build the mobile inbox here. |
| Faction **member counts** · character **"Tagline"** | Count is a cheap query · maps to real `bio` field | Fine to build; not blockers. |

## Scope decisions (grill, 2026-07-14)

- **#495 is widened** to be the single mobile design-language source of truth for all 8 sections.
- **Pilots = Everymen + WOW** (na = Default). The other 6 factions defer to per-faction follow-ups.
- **Players/profile** builds as a standalone mobile issue that **consumes #459's** profile contract (badges, friend/foe) — it does not redefine them.
- **Level-up** = a mobile skin of the shipped `LevelUpWatcher`/`LevelUpPopup` (#287/#286), not net-new.

See ADR-0035 for the durable rule (mobile surfaces render only real domain fields).

## Provenance

Authored designs delivered 2026-07-14 (`WZ Mobile Field Kit - standalone`, `WZ Mobile - Wow`,
`WZ Mobile - SNIDE`).
The na kit's original was a self-unpacking font bundle; vendored here with the embedded
`@font-face` blobs swapped for a Google Fonts `<link>` (fonts are already loaded by the app).
The WOW source was already portable.
