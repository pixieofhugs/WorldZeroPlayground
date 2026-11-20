import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import './installNudge.css'

const ICON = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: 'install-nudge-icon',
}

const ICONS: ReactNode[] = [
  <svg key="share" {...ICON}>
    <path d="M12 3v12" />
    <path d="M7.5 7.5 12 3l4.5 4.5" />
    <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
  </svg>,
  <svg key="add" {...ICON}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>,
  <svg key="done" {...ICON}>
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>,
]

/** Share, Add to Home Screen, Add. #3703's "Show me how" opens this too. */
export default function InstallIphoneSteps() {
  const { t } = useTranslation('home')
  return (
    <ol className="install-steps">
      {ICONS.map((icon, i) => (
        <li
          key={i}
          className="install-step"
        >
          <span aria-hidden className="install-step-num">
            {i + 1}
          </span>
          {icon}
          <span className="install-step-text">
            <Trans t={t} i18nKey={`install.steps.${i + 1}` as 'install.steps.1'} components={{ b: <strong /> }} />
          </span>
        </li>
      ))}
    </ol>
  )
}
