import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { getMyCharacters, setActiveCharacter } from '../api/me'
import type { CharacterOut } from '../api/auth'
import CredentialCard from '../components/CredentialCard'
import AlbescentInvitation from '../components/AlbescentInvitation'
import { mediaUrl } from '../utils/media'

/**
 * FieldDesk roster — the authenticated account home (#274). "Whose shoes today?":
 * step back into an existing life or begin a new one. Rendered at `/` when authed
 * (App routes a logged-out visitor to the marketing Home instead).
 */

// Deterministic slight tilt per card — index-keyed so it's stable across renders.
const TILTS = [-2.5, 1.8, -1.2, 2.4, -2.0, 1.4]

export default function FieldDesk() {
  const { t } = useTranslation('common')
  const { user, refetch } = useAuth()
  const navigate = useNavigate()
  const [lives, setLives] = useState<CharacterOut[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<number | null>(null)

  useEffect(() => {
    void getMyCharacters()
      .then(setLives)
      .finally(() => setLoading(false))
  }, [])

  const enterLife = async (id: number) => {
    setSwitching(id)
    try {
      await setActiveCharacter(id)
      await refetch()
      navigate(`/characters/${id}`)
    } finally {
      setSwitching(null)
    }
  }

  const active = user?.character ?? null
  const gateLevel = user?.second_character_level_required ?? 0
  const eraName = user?.era_name ?? ''
  // First life is always free; otherwise the server-computed flag is authoritative.
  const unlocked = lives.length === 0 || (user?.can_create_additional_character ?? false)
  const highestLevel = lives.reduce((max, life) => Math.max(max, life.level), 0)
  const levelsToGo = Math.max(0, gateLevel - highestLevel)

  return (
    <div className="page" style={pageStyle}>
      {/* Top-bar pill: the ACTIVE life's @handle + avatar + lives-in-play. No account handle. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        {active && (
          <div style={pillStyle}>
            {active.avatar_url ? (
              <img src={mediaUrl(active.avatar_url)} alt={active.display_name} style={pillAvatar} />
            ) : (
              <span style={{ ...pillAvatar, display: 'inline-block' }} />
            )}
            <span style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>
              @{active.username} ·{' '}
              <b style={{ color: 'var(--color-text-primary)' }}>
                {t('fieldDesk.livesInPlay', { count: lives.length })}
              </b>
            </span>
          </div>
        )}
      </div>

      <h1 style={headingStyle}>{t('fieldDesk.heading')}</h1>
      <div style={rainbowUnderline} />

      {loading ? (
        <p className="font-body text-muted" style={{ marginTop: 24 }}>{t('fieldDesk.loading')}</p>
      ) : (
        <div style={rosterRow}>
          {lives.map((life, index) => (
            <button
              key={life.id}
              type="button"
              onClick={() => enterLife(life.id)}
              disabled={switching != null}
              className="fielddesk-life"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              title={t('fieldDesk.stepInto', { name: life.display_name })}
            >
              <CredentialCard
                displayName={life.display_name}
                handle={life.username}
                bio={life.bio}
                factionSlug={life.faction_slug}
                level={life.level}
                score={life.score}
                avatarUrl={mediaUrl(life.avatar_url)}
                rotation={TILTS[index % TILTS.length]}
              />
            </button>
          ))}

          {/* "Begin a new self" dossier — locked/unlocked off the server flag. */}
          <NewSelfDossier
            unlocked={unlocked}
            gateLevel={gateLevel}
            eraName={eraName}
            levelsToGo={levelsToGo}
            onBegin={() => navigate('/characters/create')}
          />
        </div>
      )}

      {/* The order's correspondence (#395) — account-collective invitation
          (ADR-0021), shown only while the server flag holds. Deliberately no
          link to any faction surface (ADR-0027 secrecy). */}
      {!loading && (user?.can_start_as_albescent ?? false) && (
        <AlbescentInvitation
          lives={lives}
          onJoined={async () => {
            await refetch()
            setLives(await getMyCharacters())
          }}
        />
      )}

      <p style={footerHint}>
        {t('fieldDesk.footer')}
      </p>
    </div>
  )
}

function NewSelfDossier({
  unlocked,
  gateLevel,
  eraName,
  levelsToGo,
  onBegin,
}: {
  unlocked: boolean
  gateLevel: number
  eraName: string
  levelsToGo: number
  onBegin: () => void
}) {
  const { t } = useTranslation('common')
  if (unlocked) {
    return (
      <button type="button" onClick={onBegin} style={dossierUnlocked} title={t('fieldDesk.beginNewSelfTitle')}>
        <div style={folderTab} />
        <div style={medallion}>+</div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 23, color: 'var(--color-text-primary)' }}>
          {t('fieldDesk.beginNewSelf')}
        </div>
        <div style={slotOpen}>{t('fieldDesk.slotOpen')}</div>
      </button>
    )
  }
  return (
    <div style={dossierLocked} aria-disabled>
      <div style={{ fontSize: 22 }}>🔒</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: 'var(--color-text-secondary)', marginTop: 8 }}>
        {t('fieldDesk.secondSelfAwaits')}
      </div>
      <div style={{ fontSize: 9.5, lineHeight: 1.6, color: 'var(--color-text-tertiary)', marginTop: 8, maxWidth: 200 }}>
        {t('fieldDesk.gateHint', {
          gateLevel,
          eraSuffix: eraName ? t('fieldDesk.gateHintEra', { eraName }) : '',
        })}
        <br />
        <b style={{ color: 'var(--color-text-secondary)' }}>{t('fieldDesk.levelsToGo', { count: levelsToGo })}</b>
      </div>
      <div style={progressTrack}>
        <div style={progressFill} />
      </div>
    </div>
  )
}

// --- token-driven styles (no hardcoded hex) ---------------------------------

const pageStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
  backgroundSize: '5px 5px',
}
const pillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 999,
  padding: '4px 12px 4px 4px',
}
const pillAvatar: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'var(--color-bg-surface-alt)',
}
const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontWeight: 700,
  fontSize: 44,
  lineHeight: 1,
  color: 'var(--color-text-primary)',
  margin: 0,
}
const rainbowUnderline: CSSProperties = {
  height: 4,
  width: 220,
  marginTop: 8,
  borderRadius: 2,
  background: 'linear-gradient(90deg, var(--underline-3), var(--underline-2), var(--underline-6), var(--underline-5))',
}
const rosterRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  alignItems: 'flex-start',
  marginTop: 32,
}
const footerHint: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 11,
  color: 'var(--color-text-tertiary)',
  marginTop: 36,
}
const dossierBase: CSSProperties = {
  width: 266,
  minHeight: 320,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '24px 20px',
  position: 'relative',
  background: 'var(--color-bg-surface-alt)',
}
const dossierUnlocked: CSSProperties = {
  ...dossierBase,
  border: '1.5px dashed var(--color-border-strong)',
  cursor: 'pointer',
}
const dossierLocked: CSSProperties = {
  ...dossierBase,
  border: '1.5px dashed var(--color-border-strong)',
  opacity: 0.7,
}
const folderTab: CSSProperties = {
  position: 'absolute',
  top: -1,
  left: 24,
  width: 80,
  height: 14,
  border: '1.5px dashed var(--color-border-strong)',
  borderBottom: 'none',
  transform: 'translateY(-100%)',
  background: 'var(--color-bg-surface-alt)',
}
const medallion: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: '2px solid var(--color-border-strong)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  color: 'var(--color-text-primary)',
  marginBottom: 14,
}
const slotOpen: CSSProperties = {
  fontSize: 7.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-success)',
  marginTop: 16,
  borderTop: '1px solid var(--color-border-strong)',
  paddingTop: 10,
}
const progressTrack: CSSProperties = {
  width: 160,
  height: 6,
  borderRadius: 3,
  marginTop: 16,
  overflow: 'hidden',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)',
}
const progressFill: CSSProperties = {
  height: '100%',
  width: '45%',
  background: 'linear-gradient(90deg, var(--underline-3), var(--underline-2), var(--underline-6))',
}
