# Onboarding prototype: handoff notes

The prototype is a Design canvas artifact: https://claude.ai/artifact/Cc3cn8nwB19ViWAJ6dviqD. It is private to the owner.
It shows the onboarding arc: tutorial beats, contract, auth, create character, first task, and sign-in.
It also has a mascot sheet.

These notes record what was decided and why, as of 2026-11-18 (the polish pass, published after version 32). The owner's words are quoted where they set a rule.

## Files and how to rebuild

This folder holds the source. The originals were in a session scratchpad that can be wiped.

| File | What it is |
|---|---|
| `src.html` | The single source for every onboarding artboard: template, CSS and `class Component extends DCLogic` logic. Macros: `@@P:n@@` (the wisp at n px wide), `@@BODY@@`, `@@HATS@@`, `@@CROWN@@`/`@@WIZ@@`/`@@SPY@@`, `@@ACC:f@@`/`@@ACC:j@@` (faction accessories), `@@QUILL@@`. |
| `build.py` | Fills the macros and writes 30 artboards to `root/project/`. `NA.dc.html` and `NAPhone.dc.html` are the full flow. `NA-00`…`NA-13` (plus `-phone`) are each pinned to one step. The mascot SVG, hats and faction accessories are defined at the top of this file. |
| `mascot.py` | Generates `Mascot.dc.html`, the pose sheet. **It is stale:** it still shows the four candidate shapes (flame/drop/wisp/curl), with the rainbow-gradient blush and the hair animated separately. The owner rejected both since. |
| `canvas.json` | A snapshot of the board layout. It includes a link note the owner added on the page. |
| `assets/` | The drawn proof photo and avatar for the voting beat (`dragon.html` is the drawing, `make.mjs` renders both PNGs). |
| `shot.mjs` | Screenshots an artboard at chosen moments with Playwright. See "Rendering locally". |

To rebuild:

1. Copy these files to a work folder.
2. Run `mkdir -p root/project && cp canvas.json root/project/`.
3. Run `python3 build.py`.
4. Publish with the Artifact tool:
   - `url` = the artifact
   - `root` = `<work>/root`
   - `file_path` = `root/project/NA.dc.html`
   - `files` = the other 29 `NA*` files (build.py writes the map to `files.json`)

Rules for publishing:

- **Read the artifact first.** The owner edits on the page. Once, a publish of all 30 artboards wrote over a note they had just added.
- **Don't send `canvas.json`** unless the layout changes.
- Check renderVals by stubbing `DCLogic` and running it with `node` (see "Gotchas").
- Check that tags are balanced before you publish.
- Render before you publish (next section). The polish pass found most of its bugs that way.

## Rendering locally

The artboards run outside the canvas if `support.js` is the canvas runtime:

1. Read these from the artifact with the Artifact tool (`paths`): `artifact-type/dc-runtime.js`, `project/ds/wz/_ds_bundle.js`, `project/ds/wz/_ds_bundle.css`, `project/ds/wz/styles.css`, `project/ds/wz/fonts/fonts.css`.
2. Copy `dc-runtime.js` to `root/project/support.js` and the `ds/wz` files to `root/project/ds/wz/`.
3. Serve `root` on port 8765 (`python3 -m http.server 8765`).
4. Run `node shot.mjs NA-06.dc.html out/b6 1000 800 1,3,5 [x,y,w,h]`. `DSF=2` zooms; `RM=1` turns reduced motion on.

Things to know:

- Times are counted from before navigation, so frames land about 0.4s later in the animation than asked.
- Uploaded pictures (`/_blob/…`) don't load locally.
- `build.py` only lists `NA*` files in `files.json`, so the runtime copies are never published.

## Steps and navigation

Steps:

| Step | Screen |
|---|---|
| 0 | Title |
| 1 | Beat 1: out the door |
| 2 | Beat 2: hats |
| 3 | Beat 3: real task + dragon |
| 4 | Beat 4: proof/praxis |
| 5 | Beat 5: voting |
| 6 | Beat 6: level-up climb |
| 7 | Beat 7: faction brawl |
| 8 | Contract |
| 9 | Declined |
| 10 | Auth |
| 11 | Create character |
| 12 | First task |
| 13 | Sign in |

The beats are numbered "n / 7" on the tutorial card.

The tutorial card is pinned (`position: sticky; bottom: 12px`). It holds pips, the text, **Back on the left and Next on the right on the same card** (the owner asked for this), and an `aria-live` region. The header back button is hidden on the beats.

The root uses `overflow-x: clip`, not `overflow: hidden`. Hidden pushed the tutorial card off-screen on the tall proof page, and the player could not advance.

## Choices, with reasons

### The mascot: the shy wisp

The full brief is also in memory: `mascot-brief.md`. It replaced a grey pawn the owner found too generic.

- **Shape: the wisp.** A round body with two flame tips, drawn as **one path**. The owner picked it after seeing four shapes in motion ("happy I asked").
- **The hair doesn't move separately.** I built hair tongues that flickered independently. The owner then asked to "go back to the wisp look without trying to have the hair be animated". Only the whole body sways (`.msway`).
- **Googly eyes are required.** **They don't follow the cursor** (owner's call). The pupils sit slightly low when it is shy and level when it is bold.
- **Colour.** The blush is plain pink. The **rainbow is in the body**: a faint spectrum tint that grows "more rainbow and less grey over time" (owner).
  - The tint is a `color-mix` of each spectrum stop into cream, at `10% + --conf × 48%`.
  - Rejected along the way: a rainbow trail (too much) and a rainbow-gradient blush.
- **Getting braver is "the most important pose"** (owner). One custom property, `--conf` (0 shy … 1 bold), is set per step in renderVals:

  | Step | `--conf` |
  |---|---|
  | 0 | .08 |
  | 1 | .18 |
  | 2 | .3 |
  | 3 | .42 |
  | 4 | .5 |
  | 5 | .6 |
  | 6 | .72 |
  | 7 | .82 |
  | 12–13 | 1 |
  | everything else | .6 |

  `--conf` drives the rainbow amount, the gaze and the blush strength. It is registered with `@property` so the page 6 climb can animate it from .35 to 1 (`brave` keyframes).
- **Personality: shy and curious.** It peeks, blushes, shrinks when startled, and follows from a distance. **Nameless.**
- **It gets a hat from the character's name**, as character creation does: crown, wizard hat, or spy fedora (Agent Teacup gets the spy hat, which the owner liked). The hats are drawn **big enough to cover both hair tips** (owner).
- **No voice.** The owner does not want anything voiced. ElevenLabs was used only for two images, which they approved:
  - the stick photo, blob `be9f6da70f167c54521c1dd637a1564c`
  - Agent Teacup's avatar, blob `749dafdb394997442268be3a0338246b`
- **Motion style:** playful, googly and bouncy, never slick. The vote animations are the reference.

### Scene by scene

- **Title.** It is asleep on the line, wakes at "Welcome, player.", and blushes at being spoken to.
  - The owner said the sleeping pose "doesn't look as good as the others". Causes: the closed eyes were the open eyes crushed flat, the body was frozen in the first frame of its wake-up jump, the dark outline vanished on the still-dark page, and it hovered above the line.
  - Now it has drawn lids (`.lids` in `body()`), a slump to one side, a snore, and a bubble at its mouth. The bubble pops as the title finishes typing, and that wakes it. A faint cream rim keeps the outline visible. The cursor is a thin 2px caret, like a word processor's (owner asked for this).
- **1/7, out the door.** No words on the stage: the owner cut "in here?" and "out there." ("the animation says 1000 words"), and the "tap" labels went with them.
  - The stage is **a phone** on its side: bezel, camera dot, home bar, side buttons, and a dull grey feed that flicks along by itself.
  - The wisp is inside, behind the glass. It comes up to the glass and knocks; **the glass cracks**. It knocks harder; the cracks reach the edges.
  - **A notification drops in and buzzes** to call it back. The wisp looks up at it, shakes its head, and narrows its eyes.
  - It backs right off, trembles, charges, and **the glass shatters**. Daylight spreads from the hole and the meadow is bigger than the phone was.
  - **The phone's frame is thrown clear and comes to rest lying in the grass.** Later a flower grows up through it.
  - It tumbles out, squints, blushes, then hops across the meadow. A flower pops up where it took off each time (never where it stands), and the last landing shakes one more up.
  - Then it loops chasing a butterfly.
  - The idea: going outside is a joy, not an escape.
  - `b1()` in `build.py` generates the cracks, the shards and the wisp's path. `--sh` is the moment the glass goes.
- **2/7, hats.** It tries on hats, blushing. The wisp flicks each hat off, **its hair springs back up**, and the next hat squashes it flat. This is a one-off reaction, which the owner asked for; the rule against hair that flickers by itself still stands.
- **3/7, a real dev task.** Task #24, "Find a Cool Stick" (everymen, 5 pts, level 1, from `api.dev.worldzero.org/tasks`). The owner asked for a real task animated "as playfully as the dragon". It roasts a marshmallow on the stick; the dragon's lunge makes it shrink rather than jump.
- **4/7, proof.** A real `WZ.PraxisCard` with the stick photo and Agent Teacup as the profile picture, scored 17.
  - Images must be absolute URLs (`new URL('/_blob/'+id, document.baseURI).href`), because `mediaUrl()` adds `API_BASE_URL` to any `/path`.
- **5/7, voting** (a page the owner added). Four judges raise score cards, and the player must vote before Next.
  - **The proof is another player's**, not the one from 4/7. Owner: "we don't want people thinking they can vote on their own stuff". It is The Night Gardener (the wizard from 2/7) with "Laundry Dragon, slain" for the dragon task from 3/7.
  - Its photo and avatar are drawings I made, not generated images: blobs `472aee93da8c028061fc93cb6ae6eac8` (photo) and `c328c15150b8e9c9263f627404f26a74` (avatar). The owner has not judged them against the stick photo's style yet.
  - **Fake vote bar:** the real `VoteUI` shows a login gate when there is no user. The owner said a tutorial can "bend the rules", so a custom five-dot bar is layered on top. Next is disabled until the player votes, and the button reads "Vote to continue".
  - **The tally on the card matches the judges and updates.** `usePraxisCard` copies its prop into `useState` once, so the card ignores later props. Fix: ten `<sc-if>` branches (`vstage.j0..j4`, `v1..v5`), each mounting a fresh card. Don't collapse them back into one card.
  - When the player votes it hops "your turn" and blushes.
- **6/7, level-up climb.** Two versions were rejected: dots-with-eyes stairs ("looks like he is climbing on other players") and blocks of rising height ("climbing a bar chart, not ascending by overcoming challenges"). Now:
  - Floating ledges, with **a challenge card standing in the way** at each gap: stick, camera, star.
  - The wisp **knocks the card over and it becomes the ramp** to the next ledge. A card is grey until beaten, then takes its colour.
  - Each is harder. The stick falls at a nudge. The camera wobbles and needs a second, bigger go. The star knocks the wisp flat; it gets up, takes a real run-up, and jump-kicks it.
  - It gets braver and brighter at each card, plants the flag at the top (standing beside it, not over it), and the level rolls to 2.
  - Then **the dragon looks over the top of the card**, as it does on 3/7: the next, harder task. The wisp gulps, then puffs its chest out. On a phone the dragon is on the left, clear of Skip and Sign in.
  - `b6()` in `build.py` generates the scene and the path from one list of ledges and cards. `TEMPO` scales the whole thing.
- **7/7, faction brawl.** The factions crash together with particles and dust clouds while the wisp watches with popcorn and flinches. The slogans hang **below** the line in two rows, each on a thread to its speaker, so the fight and the flight home have the sky to themselves. Each faction wears its **signature accessory** (owner: "blue looking like an antenna is perfect, purple should maybe wear a crown"). The judges on 5/7 wear them too.

  | Faction | Accessory | Why |
  |---|---|---|
  | Singularity (blue) | Antenna with bulb and signal arcs | Owner liked it; it reads as tech |
  | Warriors of Whimsy (purple) | Gold crown with a purple plume | Owner's suggestion; crusading knights, but whimsical |
  | Unwavering Artisans | Beret with a paintbrush | The makers |
  | Cozy Coven (pink) | Knitted pointy hat with a pom-pom | A cozy witch |
  | S.N.I.D.E. (green) | Spiky punk hair | Pranksters against order |
  | Ephemerists (gold) | Dashed, bobbing halo with a sparkle | Things that don't last |
  | Everymen (red) | Hard hat | Perseverance, getting the job done |

  The accessories are in `ACC` in `build.py`, drawn in a 24×20 box. Factions are matched with `is.<slug>` flags. The Coven and Ephemerists descriptions are placeholders in `factions.json`, so their accessories are my guesses.
- **Create character (11).** The real `WZ.DefaultCreateCharacter`, with **no name recommender** (owner removed it), on the **rainbow background the owner likes**.
- **First task (12).** Fully bold, wearing its name hat.
- **Sign in (13).** Beaming and blushing. A waving hand was removed because the wisp has no hands.

### Fixes from the polish pass

- **Hats tuck the hair away.** A hatted wisp uses the `BALD` path (round on top) and the hat sits inside the sway group, so nothing pokes out and the hat rides the head. `body(bald, extra)` in `build.py`.
- **Faction accessories sit in front of the blob**, not behind it.
- **Reduced motion showed blank stages.** The design system turns animations off outright, so anything that entered by animation stayed invisible. The reduced-motion block now gives every scene its finished pose. Keep it in step when you add an entrance.
- The ring's sweep ends at 361deg. At 360 a hairline seam showed at twelve o'clock.
- The first-task wisp stands clear of the headline. Judges on 5/7 show their eyes and hold the score beside the face.

### Motion rules that came out of it

- **A character moves on three nested elements** (`Rig` in `build.py`): x travels evenly, y rises and falls like a thrown thing, and squash, stretch and lean have their own clock. One element with one transform gives straight-line hops.
- Wind up before a big move, and let the size of the wind-up show the effort.
- Vary it: nobody arrives or blinks in step (`LD`, `BK`, `JD` in renderVals).
- **Idle is three clocks that never line up**: an uneven sway (7.3s), a breath (3.1s) and the odd glance (11.3s), plus a blink cycle with a double blink (9.7s). The owner called the old even sway "quite mechanical". `.jump` (your turn, first task, sign in) is a hop, a smaller hop, a wiggle and a big hop, not a pogo.
- **Shut eyes are drawn lids**, never the eyes scaled flat for longer than a blink.
- Hold a pose now and then. The pause after the star card flattens the wisp is what makes the run-up read.

## Gotchas

- **Keyframe names share one stylesheet.** Grep before adding one (`tap` collided once).
- **A generated keyframe set needs a last key at 100%.** Without one the element drifts back to its unanimated pose. `Rig.css` adds it.
- **Watch for animation overrides.** `.boing` plus another animated class on the same element overrides the animation. Nest a wrapper instead (see `.boing > .vbar`).
- **Testing renderVals with node.** Wrap the `data-dc-script` body in a stub:
  - `class DCLogic{setState(o){Object.assign(this.state,o)}}`
  - `document.baseURI`
  - `window`

## Open threads

- Redraw `Mascot.dc.html` (`mascot.py`) as the final wisp only: no separate hair animation, pink blush, rainbow body. Its pose list should be peek, blush, startle, follow, and braver (the most important).
- The owner saw the polish pass ("a real upgrade") and asked for the second round above, which they haven't seen yet. The likely places to tune are the size and number of glass shards on page 1 and the tempo of page 6 (`TEMPO`).
- Pages 3 and 4 were not reworked in the polish pass.
- The prototype is a design reference. Nothing here has been built into `frontend/` yet. When it is, follow `docs/agents/design-fidelity.md`.

## Round three (2026-11-18, published as Version 36)

Owner notes, and what each became. Where this section disagrees with text above, this section wins.

- **1/7.** The phone frame lying in the grass "doesn't work": it falls away again, and the flower through it is gone. The world now grows past the phone's size after the shatter (`b1grow`, `--g` 1.3 desktop, 1.12 phone).
- **4/7.** The card ignores the pointer (`pointer-events: none`), so nothing highlights on hover. It is still the real `PraxisCard`, not an image.
  - Camera, microphone and clapperboard have no faces. The wisp uses each one, in a loop generated by `b4()` in `build.py`: a pose and a flash, a song, a jump onto the clapperboard, which snaps shut.
- **5/7.** The vote is the card's own control, so it always matches the praxis. The separate vote bar is gone.
  - `window.__dsPreview = true` (set in the constructor) makes the kit supply a signed-in viewer. That also removes "Log in to vote" everywhere.
  - The control would call the API. A capture-phase click listener on `document` catches the click first and sets `voted`; the remounted card gets `viewer_vote`. The same listener catches the terms card's two buttons.
  - The page scrolls the vote row out from behind the text box once the judges finish.
- **6/7.** The dragon's tail hangs out under the card (`.b6t`), opposite the head.
- **7/7.** A 3s stand-off before the charge, so the seven can be looked at (cycle 7.8s). Blobs have mouths (`.mth`), the witch hat is bigger, the Everymen hard hat is yellow.
- **Terms.** The real `WZ.TermsCard` is mounted. It is the full Disclaimer, about 1,000px tall on desktop and 3,000px on a phone. Its own "I just want to look around" is the decline. The quill strip sits below it, below the fold.
- **Login Logistics.** No stamp. Back is on the card. The owner reported Back missing "until you go through the whole process"; I could not reproduce that, it was present but faint in the header.
- **Mascot consistency.** One ink outline plus a faint cream rim on every page (`.msc,.tada`). Hair is part of the body everywhere; on 2/7 the hair piece now traces the wisp's own outline, so there is no seam.
- **Photos.** Both proof photos are drawings in one style (`assets/stick.html`, `assets/dragon.html`, rendered by `assets/make2.mjs`). Blobs: stick `e4be00fe7c7e6b9db4f7c2ef16f9ccb7`, dragon `2f00a97202439101e8b5e391effe61bd`. The sword's point is inside the dragon. Agent Teacup's avatar is still the older generated image.

## Round four (2026-11-18, published as Version 38)

- **1/7**: no phone-shaped rectangle after the shatter. `.out` is now a bigger box (`--ox/--oy/--ob` on `.b1`) with an elliptical `mask-image` that fades into the page; clouds, sun, bird and flowers live in `.outin` (the old 440x250 box) so their positions did not move.
- **2/7**: names are King Biscuit, Wizard Wobblewand, Agent Teacup. The third hat is a teacup (still keyed `spy` in `HATS` and the `worn` regex). The hair's outline copy is clipped to the head's width (`#hclip`) and its spring no longer scales wider than 1.
- **4/7**: at 700px and wider the camera stands left of the card, mic and clapperboard right, and the wisp runs behind the card to cross (`.cW` is `z-index:0`, `.swing` is 1). `b4()` emits two rigs, `b4*` (tools on the card, phone) and `b4w*` (sides); everything else shares one clock. Owner said to leave the phone layout as it was.
- **5/7 photo**: dragon's head and snout are one path; the drawing is scaled to .8 so the card's square crop no longer cuts the nose. New blob `be5894c9dce529ec14abe946be430976`.
- **Agent Teacup's avatar** is now a crop of 2/7 with the teacup on (`assets/make3.mjs`), blob `97acd94c1fe4fe6bec57951b1b8a707c`.
- **WOW blob**: no purple hair, bigger crown (`ACC['wow']`).
- **6/7**: tail redrawn to match the head's neck (same girth, back plates, belly lines); icons are book, camera, tree. Phone: tail at .7 scale and 36px headroom above the card for the dragon's head.
- **7/7**: `F` is in hue order (everymen, ua, ephemerists, snide, singularity, wow, coven).
- **Login**: envelope and tick removed; the wisp sits on the card with a key (`.keyw`).
- Not checked: playback (stills only), tablet widths between 500 and 700px.

## Round five (2026-11-18)

- **1/7 reveal**: `.out` no longer uses a clip-path circle. Its radial mask grows by `mask-size` (`b1open`: a quick first gasp, a small recoil, then a slow bloom) and afterwards breathes (`b1breathe`). The box is 97vw wide on desktop (`--ox` is computed from `--g`).
- **1/7 wide-screen world** (900px and up, class `.wd`, generated by `b1wide()` in `build.py`): rainbow that draws itself, hot-air balloon rising, tree with a Coven blob on a swing, a Singularity blob flying a kite, windmill, pines, WOW and Everymen blobs hopping, flowers blooming outwards from the wisp, butterflies, birds crossing, a rabbit crossing the foreground. Phone is unchanged.
- **3/7 and 6/7** share one tail (`TAIL` in `build.py`).
- **Dragon task and its praxis are WOW** (`primary_faction_slug` / `task_faction_slug: 'wow'`), so 3/7 is a WOW task card and 5/7 a WOW praxis card with the WOW vote. The click capture still works (five `button[aria-pressed]`).
- **4/7 desktop**: camera top left, mic middle right, clapperboard bottom left (`rig('b4w', …)`; the wisp changes height behind the card). Levels are measured from the card's top (100 / 300 / 500px).
- **7/7**: the two lines under the fight are gone.
- Not checked: playback (stills only), widths between 700 and 900px on 1/7.

## Round six (2026-11-18)

- **1/7**: the rainbow is its own macro (`@@B1RBW@@`) placed before the hills so they cover its feet. All seven factions are outside: Coven (swing), WOW, UA (at an easel), Snide (bouncing), Ephemerists (on a cloud), Singularity (kite), Everymen.
- **4/7 desktop loop seam**: the wide rig started at mic height instead of at the camera (`r.y(0,A[1])`), so the loop jumped when it restarted. Fixed.
- **Rule: nothing that hides behind a card is drawn before the card is there.** Anything with `z-index:-1` that is a *sibling* of an entering card (not a child of it) gets the `unhide` keyframe on the same delay as its own entrance: `.judge` (5/7), `.b6d` and `.b6t` (6/7). Children of a `.toss` card (3/7's dragon, stick, dog) travel with the card and need nothing. On Back (`.quick`) these wait 1s for the card.

## Round seven (2026-11-18)

- **4/7 desktop**: the clapperboard is now anchored to the card's bottom (54px up, matching the camera's 54px down from the top). The card's height is not known at build time, so `Rig` gained a fourth channel `k` (keyframes `b4wh` on a full-height wrapper `.b4h`, translated in % of the card's height); px offsets stay on `.b4y`. Positions are `(x, px, k)`.
- **6/7**: the wisp reacts to the dragon: "!" (`.b6bang`), a leap, flat on the ledge shaking with eyes shut (`b6lids`), a wide-eyed peek, then the chest-out (`b6eyes` uses the `scale` property so `blink2` keeps running). `T` is 15.2.
- **Login**: wisp (`.dnA`) and key (`.keyw`) dance on one 2.4s clock, mirrored, key twirls on the last beat.
- **Back button rule**: no Back in the header any more. It sits at the bottom of the card that carries the next step: tutorial text box, bottom of the terms card (`.tbk`, with extra bottom padding forced on the card's `article`), login card, beside the real form's Cancel on character creation (position measured from the Cancel button in the tick, `bx/by` in state; Cancel gets a 54px left margin), beside "replay" on the last page. Declined and Sign-in pages keep their own "Reconsider" / "back to start".

## Round eight (2026-11-18)

- **Ephemerists are explorers / wanderers / time travellers, not angels.** The halo is gone everywhere (`ACC['ephemerists']` is a traveller's hat with a red feather) and on 1/7 the Ephemerist stands on the hill with a spyglass instead of sitting on a cloud.
