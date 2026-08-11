import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Warriors of Whimsy seal — a court writ pressed onto the host praxis and
 * closed with a wax seal (#931). The kit draws no wow specimen, so this is built
 * from WOW's own chronicle identity (ADR-0050): cream parchment bound in gold,
 * written in plum, with the chronicle's woven gold/plum running-head stripe up
 * top and a plum wax-seal disc ringed in gold at the corner.
 *
 * Same three-field contract as every seal (label / condition / bonus) in WOW's
 * heraldic voice — MedievalSharp illuminates the decree, Lora reads the
 * condition. Deliberately NOT coven's cozy pink (#927 donor-slug note): the gold
 * frame and plum ink keep it unmistakably WOW and clearly not the coven sticker.
 */
export default function WowSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-wow-chronicle-bg)',
        color: 'var(--faction-wow-card-text)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 4px 16px -8px var(--faction-wow-chronicle-shadow)',
        fontFamily: 'var(--faction-wow-body-font)',
        transition: 'background 150ms, color 150ms',
      }}
    >
      {/* the chronicle running head — a woven gold/plum stripe, no text */}
      <div
        aria-hidden="true"
        style={{
          height: 5,
          background:
            'repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 10px, var(--faction-wow-card-accent) 10px 20px)',
        }}
      />

      <div style={{ position: 'relative', padding: 'var(--space-md) var(--space-lg)' }}>
        {/* the wax seal — plum disc ringed in gold; ornament, never text */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-lg)',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--faction-wow-plum-surface)',
            border: '2px solid var(--faction-wow-chronicle-gold)',
          }}
        />

        {removable && (
          <button
            type="button"
            onClick={() => onRemove?.(metatask.id)}
            aria-label={t('detail.seal.remove')}
            className="absolute font-body leading-none"
            style={{
              top: 'var(--space-sm)',
              right: 'var(--space-sm)',
              zIndex: 2,
              background: 'transparent',
              border: 'none',
              color: 'var(--faction-wow-card-accent)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        <span
          className="label-heading block"
          style={{
            fontFamily: 'var(--faction-wow-card-font)',
            letterSpacing: '0.14em',
            color: 'var(--faction-wow-card-accent)',
          }}
        >
          {t('detail.seal.label', { faction })}
        </span>

        <span
          aria-hidden="true"
          className="block"
          style={{
            height: 1,
            background: 'var(--faction-wow-rule)',
            margin: 'var(--space-xs) 0 var(--space-sm)',
          }}
        />

        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-wow-body-font)',
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.3,
            color: 'var(--faction-wow-card-text)',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-wow-card-font)',
            fontSize: 'var(--text-title)',
            letterSpacing: '0.03em',
            color: 'var(--faction-wow-stamp-total)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
