// LevelUpPopup preview cells — the "Field Stamp" level-up modal (#244/#287).
// A dim-backdrop modal that renders open + populated. rankKey / unlock keys are
// resolved against progression.json (ADR-0031), so every value below is a REAL
// catalog key. cardMode:single + a 460x600 viewport keep the position:fixed
// overlay inside its own capture card.
import { LevelUpPopup } from 'worldzero-frontend'
import type { LevelUnlock } from '../../frontend/src/api/gameConfig'
import { noop } from './_fixtures'

/** Level 2 — a short rank, rainbow seal, one new ability + one "sense". */
export function RangerRainbow() {
  const abilities: LevelUnlock[] = [
    { kind: 'ability', key: 'duels' },
    { kind: 'sense', key: 'worn_paths' },
  ]
  return <LevelUpPopup level={2} rankKey="ranger" abilities={abilities} onContinue={noop} />
}

/** Level 3 — a fuller unlock list (two abilities + a sense) to stress the rows. */
export function SurveyorManyUnlocks() {
  const abilities: LevelUnlock[] = [
    { kind: 'ability', key: 'propose_task' },
    { kind: 'ability', key: 'comment' },
    { kind: 'sense', key: 'shortcut_sense' },
  ]
  return <LevelUpPopup level={3} rankKey="surveyor" abilities={abilities} onContinue={noop} />
}

/** Level 5 — the ink-ring seal variant + a longer rank word. */
export function VoyagerInkSeal() {
  const abilities: LevelUnlock[] = [
    { kind: 'ability', key: 'second_character' },
    { kind: 'sense', key: 'distance_taste' },
  ]
  return (
    <LevelUpPopup
      level={5}
      rankKey="voyager"
      abilities={abilities}
      onContinue={noop}
      sealRing="ink"
    />
  )
}
