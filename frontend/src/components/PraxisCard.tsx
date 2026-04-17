import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PraxisCardOut } from '../api/praxis'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { moderatePraxis } from '../api/admin'
import { factionCssVar } from '../utils/factions'
import { extractError } from '../utils/errors'

interface Props {
  praxis: PraxisCardOut
  onModerated?: () => void
}

// ─── Shared praxis content ────────────────────────────────────────────────────

interface ContentProps {
  praxis: PraxisCardOut
  titleStyle?: React.CSSProperties
  bodyStyle?: React.CSSProperties
  metaStyle?: React.CSSProperties
}

function PraxisContent({ praxis, titleStyle, bodyStyle, metaStyle }: ContentProps) {
  return (
    <>
      <Link to={`/praxes/${praxis.id}`}>
        <h3 className="font-display font-semibold leading-tight hover:underline" style={{ fontSize: 'var(--text-lg)', marginBottom: 6, ...titleStyle }}>
          {praxis.title}
        </h3>
      </Link>
      {praxis.body_text && (
        <p className="font-body text-sm leading-relaxed line-clamp-3" style={{ marginBottom: 6, ...bodyStyle }}>
          {praxis.body_text}
        </p>
      )}
      <Link to={`/tasks/${praxis.task_id}`} className="font-body hover:underline" style={{ fontSize: 'var(--text-xs)', ...metaStyle }}>
        {praxis.task_title}
      </Link>
      <div className="flex justify-between items-center font-body" style={{ fontSize: 'var(--text-xs)', marginTop: 8, paddingTop: 6, borderTop: '1px dashed rgba(128,128,128,0.3)', ...metaStyle }}>
        <Link to={`/characters/${praxis.created_by_id}`} className="hover:underline">
          {praxis.created_by_display_name || `#${praxis.created_by_id}`}
        </Link>
        {praxis.score !== null && (
          <span className="font-display font-bold" style={{ fontSize: 'var(--text-sm)', color: 'inherit' }}>
            {praxis.score.toFixed(1)}
          </span>
        )}
      </div>
    </>
  )
}

// ─── Admin overlay ────────────────────────────────────────────────────────────

interface AdminProps {
  praxis: PraxisCardOut
  showAdminControls: boolean
  onHide: (e: React.MouseEvent) => void
  onFail: (e: React.MouseEvent) => void
  moderateError: string | null
}

function AdminOverlay({ praxis, showAdminControls, onHide, onFail, moderateError }: AdminProps) {
  return (
    <>
      {praxis.moderation_status === 'flagged' && (
        <span className="eyebrow" style={{ position: 'absolute', top: 8, right: 8, fontSize: 7, padding: '1px 5px', border: '1px solid rgba(220,38,38,0.4)', color: 'var(--color-danger)', background: 'rgba(220,38,38,0.05)' }}>
          under review
        </span>
      )}
      {praxis.moderation_status === 'failed' && (
        <span className="eyebrow" style={{ position: 'absolute', top: 8, right: 8, fontSize: 7, padding: '1px 5px', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--color-warning)', background: 'rgba(245,158,11,0.05)' }}>
          failed
        </span>
      )}
      {praxis.moderation_status === 'hidden' && (
        <span className="eyebrow" style={{ position: 'absolute', top: 8, right: 8, fontSize: 7, padding: '1px 5px', border: '1px solid rgba(107,114,128,0.4)', color: 'var(--color-text-secondary)', background: 'rgba(107,114,128,0.05)' }}>
          hidden
        </span>
      )}
      {moderateError && (
        <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: 4 }}>{moderateError}</p>
      )}
      {showAdminControls && praxis.moderation_status === 'visible' && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          <button onClick={onHide} className="eyebrow" style={{ fontSize: 7, padding: '1px 5px', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--color-danger)', background: 'rgba(220,38,38,0.05)', cursor: 'pointer' }}>hide</button>
          <button onClick={onFail} className="eyebrow" style={{ fontSize: 7, padding: '1px 5px', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--color-warning)', background: 'rgba(245,158,11,0.05)', cursor: 'pointer' }}>fail</button>
        </div>
      )}
    </>
  )
}

// ─── Per-faction archetypes ───────────────────────────────────────────────────

const ROTATIONS = [-2, 1.5, -1, 2.5]

function UAPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  const rotation = ROTATIONS[(praxis.task_faction_slug ?? '').length % ROTATIONS.length]
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: factionCssVar('ua', 'card-bg'),
        clipPath: 'polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)',
        transform: `rotate(${rotation}deg)`,
        position: 'relative',
        padding: '28px 16px 20px',
        fontFamily: "'Courier Prime', monospace",
        color: factionCssVar('ua', 'card-text'),
        transition: 'background 150ms, color 150ms',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: factionCssVar('ua', 'card-accent'), border: '2px solid rgba(0,0,0,0.25)' }} />
      <AdminOverlay {...adminProps} />
      <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('ua', 'card-muted') }} metaStyle={{ color: factionCssVar('ua', 'card-muted') }} />
    </div>
  )
}

function AnalogPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: factionCssVar('analog', 'card-bg'),
        border: '1px solid var(--color-border)',
        clipPath: 'polygon(0 0, 100% 0, 100% 90%, 92% 100%, 80% 95%, 68% 100%, 56% 93%, 44% 100%, 32% 94%, 20% 100%, 8% 94%, 0 100%)',
        position: 'relative',
        padding: '14px 16px 28px 28px',
        fontFamily: "'Special Elite', serif",
        color: factionCssVar('analog', 'card-text'),
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)',
        transition: 'background 150ms, color 150ms',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', left: 22, top: 0, bottom: 0, width: 1, background: 'rgba(220,80,80,0.2)' }} />
      <AdminOverlay {...adminProps} />
      <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('analog', 'card-muted') }} metaStyle={{ color: factionCssVar('analog', 'card-muted') }} />
    </div>
  )
}

function GestaltPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div style={{ position: 'relative', width: '100%', flex: '1 1 280px', minWidth: 280, minHeight: 140, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 10, left: -4, right: -4, height: 24, background: 'var(--faction-gestalt-scrap-deep)', border: '1.5px solid rgba(0,0,0,0.12)', transform: 'rotate(-4deg)', borderRadius: 1 }} />
      <div style={{ position: 'absolute', top: 4, left: -2, right: -2, height: 36, background: 'var(--faction-gestalt-scrap-mid)', border: '1.5px solid rgba(0,0,0,0.12)', transform: 'rotate(3deg)', borderRadius: 1 }} />
      <div
        style={{
          position: 'relative',
          background: factionCssVar('gestalt', 'card-bg'),
          border: '1.5px solid rgba(0,0,0,0.12)',
          transform: 'rotate(-2deg)',
          padding: '22px 14px 16px',
          fontFamily: "'Courier Prime', monospace",
          color: factionCssVar('gestalt', 'card-text'),
          zIndex: 2,
          transition: 'background 150ms, color 150ms',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%) rotate(-1deg)', width: 48, height: 14, background: 'var(--faction-gestalt-tape)', borderRadius: 1 }} />
        <AdminOverlay {...adminProps} />
        <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('gestalt', 'card-muted') }} metaStyle={{ color: factionCssVar('gestalt', 'card-muted') }} />
      </div>
    </div>
  )
}

const SNIDE_TORN_CLIP = 'polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)'

function SnidePraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: factionCssVar('snide', 'card-bg'),
        position: 'relative',
        padding: '14px 14px 16px',
        fontFamily: "'Special Elite', serif",
        color: factionCssVar('snide', 'card-text'),
        transition: 'background 150ms, color 150ms',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 6, background: 'var(--color-bg-page)', clipPath: SNIDE_TORN_CLIP }} />
      <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 6, background: 'var(--color-bg-page)', clipPath: SNIDE_TORN_CLIP }} />
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.25em', color: factionCssVar('snide', 'card-muted'), borderBottom: `1.5px solid ${factionCssVar('snide', 'card-accent')}`, paddingBottom: 3, marginBottom: 6 }}>
        The Daily Snide Gazette
      </div>
      <AdminOverlay {...adminProps} />
      <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('snide', 'card-muted') }} metaStyle={{ color: factionCssVar('snide', 'card-muted') }} />
    </div>
  )
}

function JourneymenPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div style={{ paddingTop: 26, position: 'relative', width: '100%', flex: '1 1 280px', minWidth: 280, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 0, height: 14, borderLeft: `2px dashed ${factionCssVar('journeymen', 'card-accent')}` }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${factionCssVar('journeymen', 'card-accent')}`, background: 'var(--color-bg-page)' }} />
      </div>
      <div
        style={{
          border: `2px solid ${factionCssVar('journeymen', 'card-accent')}`,
          background: factionCssVar('journeymen', 'card-bg'),
          fontFamily: "'Courier Prime', monospace",
          color: factionCssVar('journeymen', 'card-text'),
          position: 'relative',
          transition: 'background 150ms, color 150ms',
        }}
      >
        <div style={{ height: 4, backgroundImage: `repeating-linear-gradient(90deg, var(--faction-journeymen-stripe-red) 0, var(--faction-journeymen-stripe-red) 8px, ${factionCssVar('journeymen', 'card-bg')} 8px, ${factionCssVar('journeymen', 'card-bg')} 16px, var(--faction-journeymen-stripe-amber) 16px, var(--faction-journeymen-stripe-amber) 24px, ${factionCssVar('journeymen', 'card-bg')} 24px, ${factionCssVar('journeymen', 'card-bg')} 32px)` }} />
        <div style={{ padding: '10px 14px 14px' }}>
          <AdminOverlay {...adminProps} />
          <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('journeymen', 'card-muted') }} metaStyle={{ color: factionCssVar('journeymen', 'card-muted') }} />
        </div>
      </div>
    </div>
  )
}

function SingularityHoles() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0' }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={{ width: 6, height: 4, background: 'rgba(10,26,14)', border: '1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))', borderRadius: 1 }} />
      ))}
    </div>
  )
}

function SingularityPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: 'var(--faction-singularity-card-bg)',
        border: '1px solid var(--faction-singularity-border-hard)',
        position: 'relative',
        fontFamily: "'Share Tech Mono', monospace",
        color: 'var(--faction-singularity-card-text)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 3, left: 3, width: 10, height: 10, borderTop: '1px solid var(--faction-singularity-card-text)', borderLeft: '1px solid var(--faction-singularity-card-text)' }} />
      <div style={{ position: 'absolute', top: 3, right: 3, width: 10, height: 10, borderTop: '1px solid var(--faction-singularity-card-text)', borderRight: '1px solid var(--faction-singularity-card-text)' }} />
      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 10, height: 10, borderBottom: '1px solid var(--faction-singularity-card-text)', borderLeft: '1px solid var(--faction-singularity-card-text)' }} />
      <div style={{ position: 'absolute', bottom: 3, right: 3, width: 10, height: 10, borderBottom: '1px solid var(--faction-singularity-card-text)', borderRight: '1px solid var(--faction-singularity-card-text)' }} />
      <SingularityHoles />
      <div style={{ padding: '6px 16px 12px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 8, color: 'var(--faction-singularity-card-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
          singularity protocol
          <span style={{ display: 'inline-block', width: 5, height: 9, background: 'var(--faction-singularity-card-text)', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisContent praxis={praxis} bodyStyle={{ color: 'var(--faction-singularity-card-muted)', fontSize: 9 }} metaStyle={{ color: 'var(--faction-singularity-card-muted)' }} />
      </div>
      <SingularityHoles />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

function UAMastersPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: factionCssVar('ua_masters', 'card-bg'),
        border: '1px solid var(--color-border)',
        clipPath: 'polygon(0 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%)',
        padding: '12px 14px 16px',
        fontFamily: "'Special Elite', serif",
        color: factionCssVar('ua_masters', 'card-text'),
        position: 'relative',
        transition: 'background 150ms, color 150ms',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.2em', color: factionCssVar('ua_masters', 'card-muted'), borderBottom: `2px solid ${factionCssVar('ua_masters', 'card-accent')}`, paddingBottom: 4, marginBottom: 6 }}>
        The UA Masters Gazette
      </div>
      <AdminOverlay {...adminProps} />
      <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar('ua_masters', 'card-muted') }} metaStyle={{ color: factionCssVar('ua_masters', 'card-muted') }} />
    </div>
  )
}

function GenericPraxisCard({ praxis, adminProps }: { praxis: PraxisCardOut; adminProps: AdminProps }) {
  const slug = praxis.task_faction_slug ?? 'ua'
  return (
    <div
      style={{
        width: '100%', flex: '1 1 280px', minWidth: 280,
        background: factionCssVar(slug, 'card-bg'),
        borderLeft: `4px solid ${factionCssVar(slug, 'card-accent')}`,
        color: factionCssVar(slug, 'card-text'),
        padding: '14px 16px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisContent praxis={praxis} bodyStyle={{ color: factionCssVar(slug, 'card-muted') }} metaStyle={{ color: factionCssVar(slug, 'card-muted') }} />
    </div>
  )
}

// ─── Switcher ─────────────────────────────────────────────────────────────────

export default function PraxisCard({ praxis, onModerated }: Props) {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  const showAdminControls = (user?.is_admin && adminMode) ?? false
  const [localPraxis, setLocalPraxis] = useState(praxis)
  const [moderateError, setModerateError] = useState<string | null>(null)

  const applyModeration = (status: 'hidden' | 'failed' | 'visible' | 'flagged') => {
    setLocalPraxis((prev) => ({ ...prev, moderation_status: status }))
  }

  const handleHide = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModerateError(null)
    try {
      const updated = await moderatePraxis(localPraxis.id, 'hidden')
      applyModeration(updated.moderation_status)
      onModerated?.()
    } catch (err) {
      setModerateError(extractError(err, 'Failed to hide.'))
    }
  }

  const handleFail = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModerateError(null)
    try {
      const updated = await moderatePraxis(localPraxis.id, 'failed')
      applyModeration(updated.moderation_status)
      onModerated?.()
    } catch (err) {
      setModerateError(extractError(err, 'Failed to fail.'))
    }
  }

  const adminProps: AdminProps = {
    praxis: localPraxis,
    showAdminControls,
    onHide: handleHide,
    onFail: handleFail,
    moderateError,
  }

  switch (localPraxis.task_faction_slug) {
    case 'ua':
      return <UAPraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'analog':
      return <AnalogPraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'gestalt':
      return <GestaltPraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'snide':
      return <SnidePraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'journeymen':
      return <JourneymenPraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'singularity':
      return <SingularityPraxisCard praxis={localPraxis} adminProps={adminProps} />
    case 'ua_masters':
      return <UAMastersPraxisCard praxis={localPraxis} adminProps={adminProps} />
    default:
      return <GenericPraxisCard praxis={localPraxis} adminProps={adminProps} />
  }
}
