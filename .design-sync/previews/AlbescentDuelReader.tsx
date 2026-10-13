// AlbescentDuelReader — a documented PASS-THROUGH wrapper (#1084): it renders
// DefaultDuelReader and changes not one pixel. The row exists so the manifest
// says "na draws no mark here to re-cut" rather than "nobody got to it", and
// BRIEF-duel-surfaces.md §6 forbids an Albescent dress on any duel surface
// without an owner ruling.
//
// ONE CELL, on an Albescent-owned task — the only way this archetype is ever
// reached, since the reader dispatches on the TASK's faction.
import { AlbescentDuelReader } from 'worldzero-frontend'
import { duelReaderState } from './_state'

export function Settled() {
  return <AlbescentDuelReader state={duelReaderState('albescent')} />
}
