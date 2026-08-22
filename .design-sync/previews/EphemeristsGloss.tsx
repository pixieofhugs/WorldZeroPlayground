// EphemeristsGloss preview cells. One gloss mechanism, one catalog, four
// scripts (#2148/#2390): an Ephemerists label does not sit still. It turns
// through the word's registered casts — cuneiform, Arabic, Japanese, Latin —
// swapping the visible frame each time its CSS animation comes round.
//
// TWO THINGS THAT SHAPE WHAT A CARD CAN SHOW, both learned the hard way:
//
//  1. `ordinal` picks the CLOCK (via clockFor), NOT the cast. There is no prop
//     that pins a script. The visible frame starts at 0 — the English reading —
//     and advances only in `onAnimationIteration`. A static screenshot therefore
//     catches the English frame, always. Cells that "sweep the script axis" by
//     varying `ordinal` are a fiction: they render identically. The rotation is
//     real in a live browser and is covered by ephemeristsScriptTurn.test.tsx.
//
//  2. It paints inherited ink with no ground of its own. Unmounted on a white
//     page it renders all but invisible — these cells mount it on the Valley
//     plate it is drawn for, which is the only surface it is true on.
//
// So the cells below sweep the axis that IS static: which word is glossed, and
// where the label sits in a real Ephemerists composition.
import { EphemeristsGloss } from 'worldzero-frontend'

/** The Valley plate — the mount every Ephemerists label actually sits on. */
const Plate = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      padding: '20px 24px',
      background: 'var(--faction-ephemerists-card-bg)',
      color: 'var(--faction-ephemerists-card-text)',
      border: '1px solid var(--faction-ephemerists-card-border)',
      fontFamily: 'var(--faction-ephemerists-card-font)',
      fontSize: 'var(--text-content)',
      ...style,
    }}
  >
    {children}
  </div>
)

/** Every word the codex glosses, on the plate, each at rest on its English
 *  frame — the full catalog an Ephemerists surface draws its labels from. */
export function Catalog() {
  return (
    <div style={{ padding: 24 }}>
      <Plate style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 36px' }}>
        <EphemeristsGloss word="points" english="points" />
        <EphemeristsGloss word="signup" english="sign up" />
        <EphemeristsGloss word="base" english="base" />
        <EphemeristsGloss word="bonus" english="bonus" />
        <EphemeristsGloss word="members" english="members" />
        <EphemeristsGloss word="tasks" english="tasks" />
        <EphemeristsGloss word="praxes" english="praxes" />
      </Plate>
    </div>
  )
}

/** In place: the glossed labels doing their real job as the captions of a
 *  readout row, which is where a codex surface spends them. */
export function AsReadoutLabels() {
  const Figure = ({ n, word, english }: { n: string; word: 'points' | 'tasks' | 'praxes'; english: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: '1.9em', letterSpacing: '0.04em' }}>{n}</span>
      <span style={{ fontSize: '0.85em' }}>
        <EphemeristsGloss word={word} english={english} />
      </span>
    </div>
  )
  return (
    <div style={{ padding: 24 }}>
      <Plate style={{ display: 'flex', gap: 48, justifyContent: 'center' }}>
        <Figure n="1,240" word="points" english="points" />
        <Figure n="18" word="tasks" english="tasks" />
        <Figure n="46" word="praxes" english="praxes" />
      </Plate>
    </div>
  )
}

// A "clocks at rest" cell (the same word at ordinal 0/1/2) was authored and then
// removed: the three render identically by definition — the clock changes WHEN the
// wheel turns, never what shows — so it earned nothing the header above does not
// already say, and its single wide row tripped [GRID_OVERFLOW]. Don't re-add it.
