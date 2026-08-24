import { useTranslation } from 'react-i18next'

import { SingularityBand } from '../../cardMasthead/factionBands'
import SingularityReadout from '../../factionMarks/SingularityReadout'
import { factionCssVar, factionName } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * Singularity seal — a piped terminal line glowing on black. Same three-field
 * contract as every seal, rendered as a printout: `$` prompt, Share Tech Mono
 * throughout, cyan corner brackets, green phosphor text.
 *
 * THE WINDOW CHROME IS THE KIT'S BAND NOW (#2562). The seal drew its own header
 * — a label between two hand-placed corner brackets — where `SingularityBand` is
 * the window bar the task card and praxis card already wear, lamps and all. The
 * two brackets go with it: they framed a viewport the band now heads, and the
 * bottom-right one stood exactly where the mark's column runs.
 *
 * THE BONUS IS THE LIT WELL (#2042 + #2562). `[+10 PTS]` in square brackets was
 * this seal's own device for a total; `SingularityReadout` is the faction's, on
 * its task card and its score stamp both. IT BRINGS ITS OWN GROUND, which is why
 * it is the one mark on any of the nine seals that needs no re-measuring: the
 * figure never leaves `--faction-singularity-term-readout` (4.68:1 light ·
 * 9.50:1 dark) whatever surface the well is dropped onto.
 *
 * DEVIATION, RECORDED: the well stencils its unit BESIDE the figure, not under
 * it, so this is the one seal whose mark is not a figure over a caption. That is
 * the drawing — repainting a shared mark to suit one surface is what #2042 says
 * not to do, and the readout's row IS how Singularity states a total everywhere
 * else. It still sits in the mark's column at the right, which is what lines the
 * nine seals up.
 *
 * `live` is deliberately off: the caret and its halo are the score stamp's
 * signature (the machine holding the line open on a scored praxis), and a
 * metatask bonus is a promise rather than a result.
 */
export default function SingularitySeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: 'var(--faction-singularity-card-bg)',
        color: 'var(--faction-singularity-card-text)',
        border: '1px solid var(--faction-singularity-border-hard)',
        borderRadius: 4,
        fontFamily: factionCssVar('singularity', 'card-font'),
      }}
      band={<SingularityBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* On the window bar, where `-term-dim` is the ink the process name beside
         it already takes. The bracketed accent button stood on the chassis. */
      removeColor="var(--faction-singularity-term-dim)"
      condition={
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--faction-singularity-terminal-ink)',
          }}
        >
          {'$ '}
          {metatask.title}
        </span>
      }
      mark={
        <SingularityReadout
          value={t('detail.seal.bonusFigure', { points: metatask.point_value })}
          unit={t('card.stamp.points', { count: metatask.point_value })}
          valueSize={SEAL_FIGURE}
        />
      }
    />
  )
}
