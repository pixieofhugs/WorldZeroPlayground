# UI copy catalog — editor guide

All user-facing text in the World Zero frontend lives here, as plain JSON
files, one folder per language. You can edit copy without touching any code:
change a value in `en/<namespace>.json`, save, done. **Edit values, never
keys** — keys are the code's handle on the copy.

```
locales/
  en/            ← English (the source language)
    common.json
    forms.json
    votes.json
    ...
```

## Namespaces (which file does my copy live in?)

| File | What belongs in it |
|---|---|
| `common.json` | Shared chrome: nav, buttons, generic labels/errors used across pages |
| `forms.json` | Form UX copy: validation, character limits, input hints |
| `votes.json` | Vote-tier labels, per faction (see slug nesting below) |
| `factions.json` | Faction `names`/`descriptions` per slug (backend emits slug — ADR-0038), plus faction pages: join flows, rosters, faction-detail copy |
| `praxis.json` | Praxis composing/reading: submission, proof, praxis character limits |
| `tasks.json` | Task cards, task detail, propose-task copy |
| `feed.json` | Activity-feed cards and frames |
| `home.json` | Home / landing page copy |
| `admin.json` | Admin and moderation screens |
| `progression.json` | Level-up ranks + unlock names/descriptions (backend emits keys — ADR-0031) |
| `taunts.json` | Foe-taunt templates per faction/trigger (backend emits keys — ADR-0031) |
| `errors.json` | What a failed request tells the player, keyed by error code (backend emits keys — ADR-0031) |
| `glosses.json` | **Not a namespace.** The Ephemerists' script casts — the same word written in Latin, Arabic, Japanese and cuneiform, cycled as ornament over an English label (#2148). It is imported by `components/factionMarks/EphemeristsGloss.tsx`, not registered with i18next, because the casts do not change with the reader's language. Adding a word here means re-running `scripts/fetch-fonts.mjs`, or its glyphs ship with no font. |

## How a key works

Code asks for a key like `votes:ua.tier5` — that is: file `votes.json`,
then follow the nesting `ua` → `tier5`. The value is what renders.

```json
{
  "ua": {
    "tier5": "radiant"
  }
}
```

## Naming convention: semantic keys

Keys describe **what the text is for**, not what it currently says. This is
why the key survives a rewording: `charLimit.reached` stays `charLimit.reached`
whether the copy reads "limit reached" or "no more words."

- camelCase per segment, nested by feature: `charLimit.approaching`
- Number a set of rungs rather than naming them: the vote ladder is
  `tier1` … `tier5`, so every faction's word for the same rung lines up
- Never name a key after its English text (`clickHere`, `noMoreWords` — no).
  The vote ladder was the last holdout: `votes:snide.rad` held "rad" and
  `votes:ua.radiant` held "radiant", which is why #2586 renumbered them

## Placeholders

`{{name}}` inside a value is filled in by the code at render time:

```json
{ "reached": "{{max}}-character limit reached" }
```

Keep the placeholder exactly as-is (including the double braces and the name)
when editing the surrounding copy. You can move it around in the sentence.

## Per-faction voice: faction-slug nesting

When copy differs by faction, nest under the faction slug, one branch per
faction, same key shape in each branch:

```json
{
  "ephemerists": { "tier3": "silver" },
  "snide": { "tier3": "rad" }
}
```

Slugs: `ephemerists`, `everymen`, `coven`, `wow`, `snide`, `singularity`, `ua`
(plus `na` for unaffiliated and `albescent` where those surfaces have copy).

The nesting can sit under a feature as well as at the top of a file. The
character profile is the example: `common.json` `profile.*` holds the words the
unaffiliated profile uses, and `profile.<slug>.*` holds each faction kit's own
voice for the same seven or eight slots — ring label, level unit, next-level
line, praxis eyebrow and empty state, badge heading (#1858). A slot a faction
does not override simply has no key, and the shared `profile.*` one is used.

### One vocabulary for the character forms (`forms.json` → `character.*`)

Create Character and Edit Character are the same form twice, and their copy used
to disagree on every shared field — `Chosen name` against `Display name`, a
placeholder in the third person against one in the second. **`forms:character.*`
is the one block both pages read**, so a reword lands on both at once
(#2793). It holds the five field words plus `portrait`, which was the same
sentence twice (`createCharacter.portraitLabel` and
`editCharacter.portraitHeading`). `Cancel` went further out still, to
`common:actions.cancel`, since it is nobody's field.

`addPhoto` AND `changePhoto` WERE A PAIR, AND BOTH ARE GONE. They captioned the
two phone-only photo wells — empty and filled — and the chassis pass retired both
branches: #2992 took Create Character's, which was `addPhoto`'s only reader, and
#2991 took Edit Character's, which was `changePhoto`'s. The question #2992 left
to the second lane is answered by that lane not needing an answer — neither form
captions a well now, because neither draws one. The portrait is the credential
card's ring, which names itself from `common:credential.uploadTitle`, and beside
it `PortraitPicker` names its own button and reports what is chosen (#1149). Two
keys deleted rather than kept warm, and one fewer place for a caption to
disagree with the control it sits under.

Two things about it are decisions rather than tidying, and are worth knowing
before you reword:

- **The words name the CHARACTER and carry no pronoun.** Not "your story", not
  "who they are" — `Character bio`. That is what settled a second-person heading
  sitting above a third-person placeholder.
- **Both forms are placeholder-only**: there is no visible label anywhere on
  either page, so these strings are also each field's *accessible name*
  (`aria-label`). Reword them freely, but keep them saying what the field is —
  a screen-reader user hears nothing else about that box. `location` is
  deliberately an **airport code** (`Location (SFO, PDX, YYZ)`): close enough to
  find a neighbour, too coarse to track anyone, and nothing but this placeholder
  says so.

## Plurals

i18next native plural suffixes — two sibling keys, `_one` and `_other`:

```json
{
  "voteCount_one": "{{count}} vote",
  "voteCount_other": "{{count}} votes"
}
```

The code passes `count`; i18next picks the right key. Always provide both.

## Ordinals

Same mechanism, one more segment — `_ordinal_one`, `_ordinal_two`, `_ordinal_few`
and `_ordinal_other`. English needs all four (1st, 2nd, 3rd, 4th), and i18next
gets the teens right on its own (11th, not 11st):

```json
{
  "day_ordinal_one": "the {{count}}st day",
  "day_ordinal_two": "the {{count}}nd day",
  "day_ordinal_few": "the {{count}}rd day",
  "day_ordinal_other": "the {{count}}th day"
}
```

### Comment timestamps (`praxis.json` → `comments.time`)

Each faction reads a comment's age in its own voice, and `comments.time.<slug>`
holds the words for it. `comments.time.default` is the plain form — the one
`na`, `ua`, `wow`, **and Albescent** read; a faction with no branch of its own
simply uses it.

**Do not add a `comments.time.albescent` branch.** Albescent had one ("Vigil the
Third") and #783 removed it: the dialect keys on the comment AUTHOR's faction, so
a member announced themselves simply by commenting, to anyone, revealed or not.
Adding the key back would not even work — `utils/commentTime.ts` chooses the
dialect in code and never looks a slug up in this file — but a test asserts the
branch stays absent so nobody has to rediscover why.

The figures arrive as `{{count}}` (or `{{hours}}` for S.N.I.D.E., already
zero-padded). Reword freely around them; the shape of the number — 1-based
shifts, three-digit hours — is code, not copy.

### The invitation card announces; the letter is the letter (`feed.json` + `factions.json`)

Two blocks describe the same object and **they are meant to say different
things**: `feed.json` → `invitationLetter.*` is the activity-feed card, and
`factions.json` → `<slug>.invitation.*` (plus `albescent.letter.*`) is the
letter itself.

**The card is a notification, not a preview** (owner ruling on #2620). It
restates none of the letter's headline, pitch, perks or join CTA for any
faction, and its own call to action sends the player to the **factions page**
rather than opening the letter. So the two vocabularies are independent by
design: when a copy sweep lines them up and finds them saying unrelated things,
**that is the design, not drift to file.** Do not point the card's keys at the
letter's.

They share exactly one string, and only because it is one act: the control that
puts an invitation off without answering it reads **`invitation.dismiss`** on
both surfaces. It sits at the top level of `factions.json`, not under a slug —
every faction's letter and the feed card read that one key, so rewording it is
one edit for all of them. The card had a second key for it (`invitationLetter.
notNow`) and #2620 deleted it; a test in `__tests__/catalog.test.ts` keeps it
deleted and keeps both surfaces pointed at the survivor.

## Embedded markup (`<Trans>`)

Some values contain numbered tags for text that must be partly bold, linked,
etc.:

```json
{ "welcome": "Read the <1>field manual</1> before your first praxis." }
```

The numbers map to real components in the code (via react-i18next's
`<Trans>`). Keep the tags and their nesting intact; reword the text around and
inside them freely.

## Backend-emitted copy (`progression.json`, `taunts.json`)

Most namespaces hold copy the frontend authors. These two are different: the
**backend emits a key** and this catalog owns the words (ADR-0031). The backend
never sends prose for taunts or ranks/unlocks.

- **`progression.json`** — the level-up popup. `ranks.<slug>` is a rank title;
  `unlocks.<slug>.name` / `.desc` describe a level's unlocked ability or sense.
  The backend (`backend/eras/era_1.py`) references these slugs by key. Reword the
  values freely; don't rename a key without changing the era config that emits it.

- **`taunts.json`** — foe taunts, shaped `faction_slug → trigger_type →
  [variant, …]` with a `default` faction fallback. `{{from_name}}` / `{{to_name}}`
  interpolate the two characters. The backend stores only a
  `(faction_slug, trigger_type)` reference and the row id; the frontend picks the
  variant as `id % variants.length`.
  **Variant lists are append-only: never reorder or delete a variant.** The id-
  modulo pick means reordering silently reassigns which taunt an existing row
  renders, and deleting one shifts every later index. Adding to the end is safe.

### Error messages (`errors.json`)

When a request fails, the backend sends a machine-readable **error code** plus
the runtime values its message needs; this catalog owns the wording (#1401).

- **`codes.<ERROR_CODE>`** — the message for one failure, e.g.
  `codes.TASK_BANK_FULL`. The key is the code exactly as the backend spells it,
  in capitals; **never rename one** — it is a wire contract, not a label.
- Placeholders are the values the backend sends: `{{level}}`, `{{limit}}`,
  `{{max_megabytes}}`. **A placeholder with no value disables the whole entry** —
  the player then sees the backend's plainer English instead. So keep every
  placeholder that is already in a value, and never invent a new one.
- **`codes.<ERROR_CODE>_<context>`** — a variant for one surface, where the same
  failure needs different words in different places. `FLAG_LEVEL_TOO_LOW_comment`
  and `FLAG_LEVEL_TOO_LOW_praxis` are the same gate worded for what you were
  flagging. The plain `codes.<ERROR_CODE>` is the fallback for any surface with
  no variant of its own, so it must stay, and it should stay generic.

Reword any value freely. Adding or removing a key here needs a backend change
too — `backend/tests/unit/test_i18n_catalog_coverage.py` fails if this catalog
and the backend's error codes disagree.

### Faction names/descriptions (`factions.json`)

Faction **name/description** prose is also backend-emitted-as-slug (ADR-0038):
config owns which factions exist, the DB `Faction` row carries slug + status
only, and this catalog owns the words.

- **`names.<slug>`** — the faction's display name (e.g. `names.ua` → "UA").
- **`descriptions.<slug>`** — the one-line faction blurb.

The frontend resolves these by slug via `factionName()` / `factionDescription()`.
Every slug the live era defines must have a non-empty `names.<slug>` **and**
`descriptions.<slug>` — including `na` (unaffiliated). **Append-only per slug:**
add an entry when a new faction ships; don't drop a slug that config still emits.

### Drift guard

A backend drift-guard test (`backend/tests/unit/test_i18n_catalog_coverage.py`)
fails if the era config references a rank/unlock key, a
`(faction_slug, trigger_type)` taunt combo, a faction slug whose
`names`/`descriptions` entry this catalog can't resolve, or an error code whose
`errors.json` entry is missing — so a missing key is caught in CI, not at render
time.

## Rules of the road

- **Don't add or rename keys** unless you're also changing the code that uses
  them — a key the code asks for but can't find crashes dev/test builds on
  purpose (and silently falls back in production).
- Valid JSON only: double quotes, commas between entries, no trailing comma.
  If the app won't start after an edit, it's almost always a missing/extra
  comma.
- Escape a literal double quote inside a value as `\"`.
- New language later = new folder (`fr/`, etc.) with the same file names and
  key structure. English is the fallback for anything untranslated.
