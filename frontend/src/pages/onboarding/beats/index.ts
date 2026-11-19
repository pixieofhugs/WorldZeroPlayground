import type { ComponentType } from 'react'
import type { BeatProps } from './types'
import Beat1 from './Beat1'
import Beat2 from './Beat2'
import Beat3 from './Beat3'
import Beat4 from './Beat4'
import Beat5 from './Beat5'
import Beat6 from './Beat6'
import Beat7 from './Beat7'

/** Index 0 is beat 1. */
export const BEATS: ComponentType<BeatProps>[] = [Beat1, Beat2, Beat3, Beat4, Beat5, Beat6, Beat7]
