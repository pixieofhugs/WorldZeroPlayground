import type { WispHat } from './Wisp'

/** The wisp wears the hat whose word is in the character's name (the bundle's `worn` rule). */
export function hatForName(name: string): WispHat | undefined {
  const n = name.toLowerCase()
  if (/sir|king|queen|lord|lady|duke|biscuit/.test(n)) return 'crown'
  if (/night|garden|wizard|witch|mage|moon/.test(n)) return 'wizard'
  if (/agent|spy|tea|cup|detective|secret/.test(n)) return 'teacup'
  return undefined
}
