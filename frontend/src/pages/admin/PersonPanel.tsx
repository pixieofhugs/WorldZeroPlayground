import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { banCharacter, suspendAccount, type AdminCharacterSummary } from '../../api/admin'
import { extractError } from '../../utils/errors'
import { factionName } from '../../utils/factions'
import { SidePanel } from './AdminList'
import ModerateConfirm from './ModerateConfirm'
import VoteRingPanel from './VoteRingPanel'

type Act = 'ban' | 'suspend'

export default function PersonPanel({
  person,
  onChanged,
  onClose,
}: {
  person: AdminCharacterSummary
  onChanged: () => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const [confirm, setConfirm] = useState<Act | null>(null)
  const [error, setError] = useState<string | null>(null)
  const banned = person.status === 'banned'
  const suspended = person.account_status === 'suspended'

  const apply = async (act: Act, on: boolean) => {
    await (act === 'ban' ? banCharacter(person.id, on) : suspendAccount(person.account_id, on))
    setConfirm(null)
    await onChanged()
  }
  const undo = async (act: Act) => {
    setError(null)
    try {
      await apply(act, false)
    } catch (err) {
      setError(extractError(err, t(`console.people.${act}Error`)))
    }
  }
  const toggle = (act: Act, on: boolean) => (on ? void undo(act) : setConfirm(act))

  return (
    <SidePanel
      label={person.display_name}
      badge={
        <div>
          <h2 className="adm-h1">{person.display_name}</h2>
          <p className="adm-muted">
            {t('console.people.panel.meta', {
              username: person.username,
              faction: factionName(person.faction_slug),
              level: person.level,
              account: person.account_id,
            })}
          </p>
        </div>
      }
      onClose={onClose}
    >
      <div className="adm-btns">
        <Link to={`/characters/${person.id}`} className="adm-btn">
          {t('console.people.panel.profile')}
        </Link>
        <Link to="/admin/praxis" className="adm-btn">
          {t('console.people.panel.praxis')}
        </Link>
        <Link to="/admin/reports" className="adm-btn">
          {t('console.people.panel.reports')}
        </Link>
      </div>
      <hr className="adm-rule" />
      <VoteRingPanel key={person.account_id} accountId={person.account_id} name={person.display_name} />
      <hr className="adm-rule" />
      <section className="adm-sec">
        <h3 className="adm-h2 adm-grp-danger">{t('console.people.panel.act')}</h3>
        {error && <p className="adm-err">{error}</p>}
        {confirm ? (
          <ModerateConfirm
            heading={t(`console.people.${confirm}Confirm.heading`, { name: person.display_name })}
            lead={t(`console.people.${confirm}Confirm.lead`, { name: person.display_name, username: person.username, account: person.account_id })}
            confirmLabel={t(`console.people.${confirm}Confirm.submit`)}
            errorFallback={t(`console.people.${confirm}Error`)}
            run={() => apply(confirm, true)}
            onCancel={() => setConfirm(null)}
          />
        ) : (
          <div className="adm-btns">
            <button type="button" className="adm-btn adm-btn-dng" onClick={() => toggle('ban', banned)}>
              {banned ? t('console.people.panel.unban') : t('console.people.panel.ban')}
            </button>
            <button type="button" className="adm-btn adm-btn-dng" onClick={() => toggle('suspend', suspended)}>
              {suspended ? t('console.people.panel.unsuspend') : t('console.people.panel.suspend')}
            </button>
          </div>
        )}
      </section>
    </SidePanel>
  )
}
