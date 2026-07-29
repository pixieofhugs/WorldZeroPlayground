# Ephemerists — praxis card, score stamp, vote, metatask seal (Valley plate)

Vendored for the build of the Ephemerists praxis-card v2 issue. **Delete this
folder in the last PR of that issue** (`docs/agents/design-fidelity.md`).

## Source

claude.ai design project `14f9466e-6fb1-4643-93f6-21a0889f1f72`:

| File here | Pulled from |
|---|---|
| `ephemerists-praxis-card.html` | `Faction Praxis Cards.dc.html` — score-stamp prose + the box-pattern (Unaffiliated) stamp column that Ephemerists follows, then the `#eph` light card and the `#ephD` dark card, verbatim |
| `ephemerists-vote-metals.js` | same file's `<script type="text/x-dc">` — the shared `caption`/`wrap` helpers plus `ephMetals()`, the production-intent vote widget |
| `ephemerists-metatask-seal.html` | `Metatask Seals - Analysis.dc.html` — specimen 04 (Ephemerists) and the same seal inside the picker row |

Everything is verbatim; nothing was retyped. Port from these files, not from the
issue's prose description of them.

## Label check (ADR-0050 — designs go stale against the roster)

- The `#eph` / `#ephD` frames and specimen 04 are correctly labelled
  **Ephemerists**. Palette and faces match the shipped Valley-plate token family
  (`--faction-ephemerists-plate-*`, `--font-faction-deco`/`-spectral`).
- **One stale label, ignore it:** the doc's index paragraph still lists
  "Ephemerists — the orrery". The orrery is the retired identity. The section
  itself is headed "Ephemerists · deco × egypt" and draws the Valley plate. The
  section wins.
- Specimen 04's right-hand panel reads "applied to an Everymen task" — that is
  the sample, not a rule. The seal wears the **issuing** faction's dress
  wherever it lands, which is what the shipped `MetaTaskSeal` dispatcher already
  does.

## Not in this bundle

The doc's other seven faction frames. They are already built and unchanged.
