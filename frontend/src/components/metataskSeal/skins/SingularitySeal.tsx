import { useTranslation } from 'react-i18next'

import { factionRoleVars } from '../../../utils/factionRoles'
import { factionCssVar } from '../../../utils/factions'
import { SingularityBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'

/**
 * Singularity seal — a piped terminal line glowing on black. Same three-field
 * contract as every seal, rendered as a printout: `$` prompt, Share Tech Mono
 * throughout, cyan corner brackets, green phosphor text.
 *
 * THE `> ` PROMPT LINE THAT NAMED THE ISSUER IS THE SHARED BAND NOW (#2648),
 * which for this faction is the window chrome the two card kits already fly —
 * the same three lamps, the same dim mono title, the same hairline under it. A
 * terminal that names its own process in a title bar is more this kit's idiom
 * than one that echoes it as a comment line, so the seal loses nothing by the
 * trade.
 *
 * THE BRACKETS FRAME THE VIEWPORT, AND THE VIEWPORT IS THE BODY. With a chrome
 * bar on top they moved down onto the body's box with the padding; left on the
 * root, the upper one would have sat inside the window frame rather than inside
 * the window.
 *
 * THE PREFIX IS `--sg-seal-*`, AND IT IS THIS SURFACE'S OWN (#2675). The nine roles
 * are declared on the window frame below and read beneath it; a name scoped to
 * one element cannot repaint a card of another faction the way a shared
 * `--kit-*` would. The `-bracket` cyan and `-border-hard` are NOT roles — a
 * surface's genuine extras stay local, which is decision 07.
 */
export default function SingularitySeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        ...factionRoleVars('singularity', 'sg-seal'),
        background: 'var(--sg-seal-paper)',
        color: 'var(--sg-seal-ink)',
        border: '1px solid var(--faction-singularity-border-hard)',
        // The corner is the TOKEN's, not this file's (#2729) — the picker's
        // selection ring reads the same one, so the two cannot disagree.
        borderRadius: factionCssVar('singularity', 'card-radius'),
        // The band is full-bleed and the frame is rounded, so the chrome bar's
        // square corners have to be clipped to the window's.
        overflow: 'hidden',
        fontFamily: 'var(--sg-seal-face)',
      }}
    >
      <SingularityBand />

      <div className="relative" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        {/* corner brackets — cyan, terminal viewport framing */}
        <span style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderTop: '1px solid var(--faction-singularity-bracket)', borderLeft: '1px solid var(--faction-singularity-bracket)' }} />
        <span style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderBottom: '1px solid var(--faction-singularity-bracket)', borderRight: '1px solid var(--faction-singularity-bracket)' }} />

        {removable && (
          <button
            type="button"
            onClick={() => onRemove?.(metatask.id)}
            aria-label={t('detail.seal.remove')}
            className="absolute font-body leading-none"
            style={{
              top: 'var(--space-sm)',
              right: 'var(--space-sm)',
              background: 'transparent',
              border: '1px solid var(--sg-seal-accent)',
              color: 'var(--sg-seal-accent)',
              fontSize: 'var(--text-md)',
              lineHeight: 1,
              padding: '0 var(--space-xs)',
              cursor: 'pointer',
            }}
          >
            [<span aria-hidden="true">×</span>]
          </button>
        )}

        {/* The readout's own comment line. `$` is the prompt the condition is
            typed at, so the object's name lands as a COMMENT rather than as a
            second command — the window chrome above already names the faction. */}
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--sg-seal-quiet)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          <span aria-hidden="true">{'// '}</span>
          {t('detail.seal.kind')}
        </span>

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

        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-title)',
            color: 'var(--sg-seal-accent)',
            marginTop: 'var(--space-xs)',
          }}
        >
          [{t('detail.seal.bonus', { points: metatask.point_value })}]
        </span>
      </div>
    </div>
  )
}
