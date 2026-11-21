import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { listBlocks, unblockCharacter, type BlockListItem } from '../../../api/relationships'
import { CARD_CTA } from '../../../components/ctaTapFloor'
import { factionCssVar } from '../../../utils/factions'
import { formatDate } from '../../../utils/dates'
import { mediaUrl } from '../../../utils/media'
import type { SettingsSectionProps } from '../../Settings'
import SettingsCard from '../SettingsCard'

/** The active character's block list; a block belongs to a character (ADR-0077). */
export default function BlockedSection({ sectionId }: SettingsSectionProps) {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const characterId = user?.character?.id
  const [blocks, setBlocks] = useState<BlockListItem[]>([])
  const [failedId, setFailedId] = useState<number | null>(null)

  useEffect(() => {
    setBlocks([])
    if (characterId === undefined) return
    let live = true
    listBlocks().then(
      (rows) => live && setBlocks(rows),
      () => {},
    )
    return () => {
      live = false
    }
  }, [characterId])

  const unblock = async (id: number) => {
    setFailedId(null)
    try {
      await unblockCharacter(id)
      setBlocks((rows) => rows.filter((r) => r.character_id !== id))
    } catch {
      setFailedId(id)
    }
  }

  return (
    <SettingsCard sectionId={sectionId} title={t('settings.blocked.eyebrow')} lead={t('settings.blocked.lead')}>
      {blocks.length === 0 ? (
        <p className="font-body mt-[var(--space-lg)] mb-0 text-[length:var(--text-content)] text-[var(--color-text-tertiary)]">
          {t('settings.blocked.empty')}
        </p>
      ) : (
        <ul className="list-none m-0 p-0" data-testid="settings-blocked-list">
          {blocks.map((b, i) => (
            <li
              key={b.character_id}
              className={`font-body flex items-center gap-[var(--space-md)] pt-[var(--space-lg)] ${i === blocks.length - 1 ? '' : 'pb-[var(--space-lg)] border-b border-[var(--color-border)]'}`}
            >
              <div
                aria-hidden
                className="shrink-0 rounded-full overflow-hidden size-10"
                style={{ background: `linear-gradient(135deg, ${factionCssVar(b.faction_slug, 'light')}, ${factionCssVar(b.faction_slug)})` }}
              >
                {b.avatar_url && <img src={mediaUrl(b.avatar_url)} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1 text-[length:var(--text-content)]">
                <Link to={`/characters/${b.character_id}`} className="text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
                  {b.display_name}
                </Link>
                <div className="mt-[var(--space-xs)] text-[var(--color-text-tertiary)]">
                  {failedId === b.character_id ? (
                    <span role="alert">{t('settings.blocked.unblockFailed', { name: b.display_name })}</span>
                  ) : (
                    t('settings.blocked.blockedOn', { date: formatDate(b.created_at) })
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => unblock(b.character_id)}
                className="btn-outline shrink-0 rounded-[var(--radius-md)]"
                style={CARD_CTA}
              >
                {t('settings.blocked.unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}
