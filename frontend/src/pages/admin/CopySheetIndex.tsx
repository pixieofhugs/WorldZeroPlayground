import { useState } from 'react'
import './adminConsole.css'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER, factionName } from '../../utils/factions'
import { FactionRow } from '../characterPaths/editCharacterSlots'
import PageTitle from '../../components/ui/PageTitle'

const COPY_SHEET_SLUGS = [...FACTION_RAINBOW_ORDER, ALBESCENT_FACTION_SLUG]

/** `/admin/copy`: reuses Edit Character's `FactionRow` with a pick-only model (nothing to confirm). */
export default function CopySheetIndex() {
  const { t } = useTranslation('admin')
  const [picked, setPicked] = useState(COPY_SHEET_SLUGS[0])
  return (
    <div className="flex flex-col gap-3 adm-copy-index">
      <PageTitle title={t('console.rail.items.factionCopy')} />
      <p className="card-meta">{t('copySheet.pickerHint')}</p>
      <FactionRow
        slug={picked}
        picker={{
          current: COPY_SHEET_SLUGS[0],
          picked,
          offered: COPY_SHEET_SLUGS.slice(1),
          pick: setPicked,
          touched: picked !== COPY_SHEET_SLUGS[0],
          confirming: false,
          cancelConfirm: () => {},
          confirm: async () => {},
          saving: false,
        }}
      />
      <Link to={`/admin/copy/${picked}`} className="btn-outline text-xs self-start">
        {t('copySheet.button', { name: factionName(picked) })}
      </Link>
    </div>
  )
}
