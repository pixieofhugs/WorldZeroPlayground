import { useTranslation } from 'react-i18next'

import { factionRoleVars } from '../../../utils/factionRoles'
import { WowBand } from '../../cardMasthead/factionBands'
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
 *
 * THE DECREE IS BANNERED NOW (#2648). The MedievalSharp eyebrow that named the
 * court, and the hairline that separated it from the writ, are both gone;
 * `WowBand` — the theme-invariant plum lettered in gilt, the same banner the
 * task card and the praxis card fly — says it instead.
 *
 * THE RUNNING HEAD HANGS FROM THE BANNER rather than sitting above it. The woven
 * gold/plum stripe is the chronicle's rule, and the band closes on a 2px gilt
 * line the task card already hangs its bunting from; the same order here keeps
 * the seal reading as a small page of the same chronicle.
 */
export default function WowSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        // THE ROLE MAP (#2674), on the writ's own root. `WowBand` inside it is
        // the shared cross-faction masthead, carved out of every lane; every
        // read below carries today's token as its fallback, so the band and the
        // writ resolve exactly as they did.
        ...factionRoleVars('wow', 'wow-seal'),
        background: 'var(--faction-wow-chronicle-bg)',
        color: 'var(--wow-seal-ink)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        // The corner is the ROLE MAP's, not this file's (#2729) — the picker's
        // selection ring reads the token behind it, so the two cannot disagree.
        borderRadius: 'var(--wow-seal-radius)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px -8px var(--faction-wow-chronicle-shadow)',
        fontFamily: 'var(--faction-wow-body-font)',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <WowBand />

      {/* the chronicle running head — a woven gold/plum stripe, no text */}
      <div
        aria-hidden="true"
        style={{
          height: 5,
          background:
            'repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 10px, var(--wow-seal-accent) 10px 20px)',
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
              color: 'var(--wow-seal-accent)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* The chronicle's running-head hand — the decree face at the 0.14em
            tracking this kit letters its headings in. */}
        <span
          className="block"
          style={{
            fontFamily: 'var(--wow-seal-face)',
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--wow-seal-accent)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-wow-body-font)',
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.3,
            color: 'var(--wow-seal-ink)',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="block"
          style={{
            fontFamily: 'var(--wow-seal-face)',
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
