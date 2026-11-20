import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getSmallWorld, setSmallWorld, type DialSide, type PopulationDialOut } from '../../api/admin'
import { extractError } from '../../utils/errors'
import './adminSmallWorld.css'
import { useReloadCounts } from './useAdminCounts'

const SIDES: DialSide[] = ['small', 'full']
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function SmallWorldTab() {
  const { t: typed } = useTranslation('admin')
  const t = (key: string, opts: object = {}): string => typed(key as never, { defaultValue: key, ...opts }) as string
  const reloadCounts = useReloadCounts()
  const [dials, setDials] = useState<PopulationDialOut[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSmallWorld()
      .then(setDials)
      .catch((err) => setError(extractError(err, t('console.smallWorld.loadError'))))
  }, [])

  const show = (v: number | boolean) => (typeof v === 'boolean' ? t(`console.smallWorld.${v ? 'on' : 'off'}`) : String(v))
  const values = (side: Record<string, number | boolean>) => Object.values(side).map(show).join(' · ')

  const apply = async (sides: Record<string, DialSide>, done: (changed: number) => string) => {
    setBusy(true)
    setError(null)
    try {
      const before = new Map(dials?.map((d) => [d.dial_key, d.side]))
      const next = await setSmallWorld(sides)
      const changed = next.filter((d) => before.get(d.dial_key) !== d.side).length
      setDials(next)
      setResult(changed ? done(changed) : t('console.smallWorld.resultNone'))
      reloadCounts()
    } catch (err) {
      setError(extractError(err, t('console.smallWorld.saveError')))
    } finally {
      setBusy(false)
    }
  }

  const flip = (d: PopulationDialOut, side: DialSide) =>
    side === d.side
      ? undefined
      : apply({ [d.dial_key]: side }, () =>
          t('console.smallWorld.result', {
            rule: t(`console.smallWorld.rules.${d.dial_key}.name`),
            side: t(`console.smallWorld.side.${side}`),
          }),
        )

  return (
    <div className="adm-sw">
      <header className="adm-head">
        <div>
          <h1 className="adm-h1">{t('console.smallWorld.title')}</h1>
          <p className="adm-lede">{t('console.smallWorld.lede')}</p>
        </div>
        {dials && (
          <div className="adm-btns">
            <button
              type="button"
              className="adm-btn"
              disabled={busy}
              onClick={() =>
                void apply(Object.fromEntries(dials.map((d) => [d.dial_key, 'small' as const])), () =>
                  t('console.smallWorld.resultAll'),
                )
              }
            >
              {t('console.smallWorld.setAll')}
            </button>
          </div>
        )}
      </header>

      {error && <p className="adm-err">{error}</p>}
      {result && (
        <p className="adm-sw-result" role="status">
          {result} <Link to="/admin/mod-log">{t('console.smallWorld.modLog')}</Link>
        </p>
      )}
      {dials && (
        <div className="adm-card adm-split-main">
          <table className="adm-tbl">
            <thead>
              <tr>
                {['rule', 'small', 'full', 'using', 'changed'].map((c) => (
                  <th key={c} scope="col" className="adm-th">
                    {t(`console.smallWorld.cols.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dials.map((d) => {
                const name = t(`console.smallWorld.rules.${d.dial_key}.name`)
                return (
                  <tr key={d.dial_key}>
                    <td className="adm-td">
                      <span className="adm-sw-rule">{name}</span>
                      <span className="adm-muted">
                        {t('console.smallWorld.turnUp', { when: t(`console.smallWorld.rules.${d.dial_key}.when`) })}
                      </span>
                    </td>
                    <td className="adm-td">{values(d.small)}</td>
                    <td className="adm-td">{values(d.full)}</td>
                    <td className="adm-td">
                      <div className="adm-segs" role="radiogroup" aria-label={name}>
                        {SIDES.map((side) => (
                          <button
                            key={side}
                            type="button"
                            role="radio"
                            aria-checked={d.side === side}
                            disabled={busy}
                            className="adm-seg"
                            onClick={() => void flip(d, side)}
                          >
                            {t(`console.smallWorld.side.${side}`)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="adm-td adm-muted">
                      {d.updated_at
                        ? t('console.smallWorld.changedBy', { who: d.updated_by ?? '', when: when(d.updated_at) })
                        : t('console.smallWorld.default')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="adm-muted">{t('console.smallWorld.note')}</p>
    </div>
  )
}
