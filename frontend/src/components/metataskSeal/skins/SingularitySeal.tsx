import { useTranslation } from 'react-i18next'

import { factionCssVar, factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Singularity seal — a piped terminal line glowing on black. Same three-field
 * contract as every seal, rendered as a printout: `$` prompt, Share Tech Mono
 * throughout, cyan corner brackets, green phosphor text.
 */
export default function SingularitySeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-singularity-card-bg)',
        color: 'var(--faction-singularity-card-text)',
        border: '1px solid var(--faction-singularity-border-hard)',
        borderRadius: 4,
        padding: 'var(--space-md) var(--space-lg)',
        fontFamily: factionCssVar('singularity', 'card-font'),
      }}
    >
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
            border: '1px solid var(--faction-singularity-card-accent)',
            color: 'var(--faction-singularity-card-accent)',
            fontSize: 'var(--text-md)',
            lineHeight: 1,
            padding: '0 var(--space-xs)',
            cursor: 'pointer',
          }}
        >
          [<span aria-hidden="true">×</span>]
        </button>
      )}

      <span
        className="label-heading block"
        style={{ color: 'var(--faction-singularity-card-muted)' }}
      >
        {'> '}
        {t('detail.seal.label', { faction })}
      </span>

      <span
        className="font-body block"
        style={{
          fontSize: 'var(--text-content)',
          color: 'var(--faction-singularity-terminal-ink)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {'$ '}
        {metatask.title}
      </span>

      <span
        className="font-body block"
        style={{
          fontSize: 'var(--text-title)',
          color: 'var(--faction-singularity-card-accent)',
          marginTop: 'var(--space-xs)',
        }}
      >
        [{t('detail.seal.bonus', { points: metatask.point_value })}]
      </span>
    </div>
  )
}
