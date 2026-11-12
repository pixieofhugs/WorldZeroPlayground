import { useTranslation } from 'react-i18next'

import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { SingularityBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'

/**
 * Singularity seal — a piped terminal line on black. The issuer is the shared
 * `SingularityBand` window chrome (#2648); the cyan brackets frame the body (the
 * viewport), not the root. Prefix `--sg-seal-*` is this surface's own (#2675);
 * `-bracket` and `-border-hard` stay local extras, not roles.
 */
export default function SingularitySeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-seal'),
        background: 'var(--sg-seal-paper)',
        color: 'var(--sg-seal-ink)',
        border: '1px solid var(--faction-singularity-border-hard)',
        // The role map's corner (#2729), shared with the picker's selection ring.
        borderRadius: 'var(--sg-seal-radius)',
        // Clips the full-bleed band's square corners to the rounded frame.
        overflow: 'hidden',
        fontFamily: 'var(--sg-seal-face)',
      }}
    >
      <SingularityBand />

      <div className="relative" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
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

        {/* A `//` comment line, not a second `$` command; the chrome names the faction. */}
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
