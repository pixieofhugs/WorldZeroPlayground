import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import {
  dismissInstall,
  heldInstallPrompt,
  installDismissed,
  isIphoneSafari,
  isStandalone,
  subscribeInstallPrompt,
} from '../../utils/installPrompt'
import { useFormFactor } from '../../hooks/useFormFactor'
import InstallIphoneSteps from './InstallIphoneSteps'
import './installNudge.css'

// Copied from public/favicon.svg (which cannot reach CSS vars); the tile takes the page ink so it flips with the theme.
function WoIcon() {
  return (
    <svg aria-hidden="true" width="56" height="56" viewBox="0 0 64 64" className="install-nudge-icon">
      <defs>
        <linearGradient id="wzInstallRainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c1272d" />
          <stop offset="0.17" stopColor="#c2541f" />
          <stop offset="0.33" stopColor="#ca8a04" />
          <stop offset="0.5" stopColor="#16a34a" />
          <stop offset="0.67" stopColor="#1d6e72" />
          <stop offset="0.83" stopColor="#2563eb" />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="var(--color-text-primary)" />
      <text
        x="32.5"
        y="44.5"
        textAnchor="middle"
        fontFamily="Lora, Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="34"
        letterSpacing="0.5"
        fill="url(#wzInstallRainbow)"
      >
        {'WØ'}
      </text>
    </svg>
  )
}

/** One-time "put it on your home screen" card on Home (#3702). Android needs the held Chrome event; iPhone Safari gets the steps. */
export default function InstallNudge() {
  const { t } = useTranslation('home')
  const [gone, setGone] = useState(installDismissed)
  const prompt = useSyncExternalStore(subscribeInstallPrompt, heldInstallPrompt, () => null)
  const iphone = isIphoneSafari()
  const phone = useFormFactor() === 'mobile'
  if (!phone || gone || isStandalone() || (!iphone && !prompt)) return null

  const dismiss = () => {
    dismissInstall()
    setGone(true)
  }
  const install = async () => {
    await prompt?.prompt()
    dismiss()
  }

  return (
    <section
      aria-labelledby="install-nudge-title"
      className="install-nudge"
    >
      <div className="install-nudge-head">
        <WoIcon />
        <div className="install-nudge-titles">
          <span className="install-nudge-kicker">
            {t('install.kicker')}
          </span>
          <h2
            id="install-nudge-title"
            className="install-nudge-title"
          >
            {t('install.title')}
          </h2>
        </div>
      </div>
      <p className="install-nudge-body">
        {t(iphone ? 'install.bodyIphone' : 'install.bodyAndroid')}
      </p>
      {iphone && <InstallIphoneSteps />}
      <div className="install-nudge-actions">
        <button type="button" className="btn-primary" onClick={iphone ? dismiss : install}>
          {t(iphone ? 'install.done' : 'install.install')}
        </button>
        <button type="button" className="btn-outline" onClick={dismiss}>
          {t('install.notNow')}
        </button>
      </div>
      <p className="install-nudge-once">
        {t('install.once')}
      </p>
    </section>
  )
}
