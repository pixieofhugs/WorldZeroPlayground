# Faction copy review — 2026-08-16

An audit of **every faction-specific English string in the app**: 800 strings, 252
concepts, 9 factions. Each string carries an owner ruling on whether it stays
faction-specific, collapses to one shared string, or goes.

These files are a **decision record, not a spec to build from.** The buildable
specs are the issues; they are self-contained and each holds the wordings it
needs. Use these when you want the whole picture, or to check what was decided
about a string the issues do not mention.

## The files

| file | what it is |
|---|---|
| `faction-copy-decisions.csv` | All 800 strings with a disposition, the agreed wording, and why |
| `faction-copy-voiced.csv` | The 409 that stay faction-specific — a filtered view of the above |

### Columns

`decision` · `final_wording` · `surface` · `file` · `concept` · `note` ·
`blocked_on` · `retired_words_to_fix` · then one column per faction slug.

`concept` uses `{F}` where the real key holds a faction slug — `{F}.tasks.heading`
is `wow.tasks.heading`, `coven.tasks.heading`, and so on. Rows are grouped this
way so parallel slots line up across factions.

### `decision` values

| value | strings | meaning |
|---|---|---|
| `FACTION` | 409 | Stays per-faction |
| `GENERIC` | 246 | Collapse the whole `<slug>.` family to one shared key |
| `CUT` | 133 | Delete the slot |
| `USE names.{F}` | 7 | The slot duplicates the faction's name — read `names.{F}` instead |
| `NOT FACTION COPY` | 5 | Already the shared default; listed only as an extractor artifact |

## The governing principle

> *"We are erring on the side of taking out faction-specific flavour with the
> attitude 'we can put it back in intentionally'."*

Surfaces that keep voice: faction select picker, invite letter (including
Albescent's), join panel, faction hero, taunts, vote star ladder, faction name +
description, and the spotlight label. Everything else settles.

## Cross-cutting word rulings

One word each, everywhere — **including inside surfaces that keep their voice**:

| concept | the word | retires |
|---|---|---|
| character level | `level` | anno, rank, Roman numerals, lvl |
| score unit | `points` | pvncta, huzzahs, cr, pts |
| a task | `task` | heist, quest, survey, job, function, protocol, sheet |
| a praxis | `praxis` | spell, chronicle, transcription, signal, report |
| submitting a praxis | `submit` / `submitted` | seal/sealed, file/filed |

Applied by one rule: **replace where the word NAMES the entity, keep it where it
is imagery.** `"Signals Generated"` becomes `Recent praxis`; `"generate signals,
cast them into the consensus"` survives untouched.

Four controls also settled: `Confirm`, `Sign up`, `edited`, and the vote
screen-reader label `Rate {{value}} — {{label}}`.

## Where the work is tracked

| issue | scope |
|---|---|
| #1863 | Words only — the five nouns, 27 rewrites, 5 documented false positives, the `CONTEXT.md` fix |
| #1864 | Key structure only — 40 collapses, 97 deletions, 3 name references |
| #1874 | Invitation perks and two descriptions must state real backend mechanics |
| #1858 | 52 of these strings are hardcoded in `.tsx`; blocks #1864 |
| #1869 | Singularity has no mechanical perk; its perk line is a placeholder |
| #1871 | Albescent holds two perks, not seven; blocks its new copy |
| #1865 | Spotlight labels promise a rotation the code does not implement |

`blocked_on` in the CSV names the issue a row waits on.

## Two traps for anyone auditing this again

**Faction perks live in two places.** Most are `FactionConfig` fields, but
Ephemerists' Task Vision is an `EraConfig` frozenset
(`allow_praxis_on_retired_task_factions`). Reading only the faction blocks makes
a real, enforced perk look like fiction.

**Grep the domain name, not the copy's name.** The "Leap of Whimsy" is
`level_jump` in code. Searching for the marketing phrase returns only the copy
string itself, which reads as an unimplemented promise when it is fully shipped
and enforced.
