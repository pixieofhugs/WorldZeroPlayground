import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import MediaArt from '../blocks/MediaArt'
import { pickArtKey } from '../blocks/useMediaArt'
import { ErrorBanner, formatAutosave } from '../archetypes/shared'
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  PublishButton,
  TitleField,
} from '../archetypes/controls'
import { MetataskSealStack } from '../MetataskSealStack'
import type { EditPraxisState } from '../useEditPraxis'
import {
  DefaultModePicker,
  MobileStickyBar,
  SegToggle,
  type ComposerTab,
} from './shared'

/**
 * The Ephemerists MOBILE composer (#527) — "Seal & Enter" on a phone. The same
 * single-column composer as the Default mobile skin (Write/Preview toggle, fluid
 * media grid, sticky submit bar) dressed in codex chrome: ledger-ruled vellum
 * leaves, Cinzel rubric labels, a finding pulled to lapis. Ported from the
 * desktop Ephemerists Ephemeris-Entry archetype; grounds on the `--eph-*` tokens
 * (theme-aware). Consumes `useEditPraxis` verbatim — no editor, upload, or submit
 * logic lives here.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const INK = 'var(--eph-ink)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  display: 'block',
  fontFamily: DISPLAY,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A ledger leaf bound in a gold-deep hairline, headed by a rubric Cinzel label. */
function Leaf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: VELLUM, border: `1px solid ${GOLD_DEEP}`, padding: "var(--space-md)" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "var(--text-lg)", letterSpacing: '0.14em', textTransform: 'uppercase', color: RUBRIC, marginBottom: "var(--space-sm)" }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function EphemeristsComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="ephemerists" style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)", fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)" }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: "var(--space-sm)" }}>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "var(--text-title)", lineHeight: 1, color: TEXT, margin: 0 }}>
            <Trans
              ns="forms"
              i18nKey="editPraxis.ephemerists.pageTitle"
              components={[<span key="0" />, <span key="1" style={{ color: LAPIS }} />]}
            />
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.ephemerists.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.ephemerists.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: "var(--space-xs)", padding: "var(--space-xs)", background: VELLUM, border: `1px solid ${GOLD_DEEP}` },
            buttonStyle: (active) => ({
              padding: 'var(--space-sm)',
              border: 'none',
              fontFamily: DISPLAY,
              fontSize: "var(--text-md)",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: active ? INK : 'transparent',
              color: active ? PARCHMENT : MUTED,
            }),
          }}
        />
      </header>

      {/* Observed-task reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: "var(--space-sm)", padding: 'var(--space-md)', background: VELLUM, border: `1px solid ${GOLD_DEEP}` }}>
        <span style={kicker}>{t('editPraxis.ephemerists.taskRefLabel')}</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "var(--text-content)", color: TEXT, textAlign: 'right', flex: 1, lineHeight: 1.1 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, color: LAPIS }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('editPraxis.ephemerists.pointsLabel', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          {/* Mode — Solo · Collab · Duel, above the title (scrolls with content) */}
          <DefaultModePicker state={state} />

          <Leaf title={t('editPraxis.ephemerists.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.ephemerists.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  color: TEXT,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `2px solid ${INK}`,
                  padding: 'var(--space-xs) 0 var(--space-sm)',
                },
              }}
            />
          </Leaf>

          <Leaf title={t('editPraxis.ephemerists.bodyLabel')}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.ephemerists.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: SERIF,
                  lineHeight: 1.65,
                  color: TEXT,
                  background: VELLUM_DEEP,
                  border: `1.5px solid ${INK}`,
                  padding: 'var(--space-md) var(--space-lg)',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
            <div style={{ ...kicker, marginTop: "var(--space-sm)", color: MUTED }}>
              {t('editPraxis.ephemerists.bodyMeta', { words: state.wordCount })}
            </div>
          </Leaf>

          {state.showInviteBox && (
            <Leaf title={state.duelMode ? t('editPraxis.ephemerists.inviteLabelDuel') : t('editPraxis.ephemerists.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: SERIF,
                  inputBg: VELLUM_DEEP,
                  inputColor: TEXT,
                  inputBorder: `1.5px solid ${INK}`,
                  acceptedBg: LAPIS,
                  acceptedColor: PARCHMENT,
                  placeholder: t('editPraxis.ephemerists.invitePlaceholder'),
                }}
              />
            </Leaf>
          )}

          {state.showSealStack && (
            <Leaf title={t('editPraxis.ephemerists.metatasksLabel')}>
              <MetataskSealStack state={state} />
            </Leaf>
          )}

          <Leaf title={t('editPraxis.ephemerists.filesLabel')}>
            <MediaGrid state={state} />
          </Leaf>
        </>
      ) : (
        <Leaf title={t('editPraxis.ephemerists.previewLabel')}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "var(--text-title)", color: TEXT, marginBottom: "var(--space-sm)" }}>
            {state.title || t('editPraxis.ephemerists.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: SERIF, lineHeight: 1.65, color: TEXT },
            }}
          />
        </Leaf>
      )}

      <ErrorBanner message={state.error} />

      <MobileStickyBar
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: "var(--space-md)",
          padding: 'var(--space-md) 0 var(--space-xs)',
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderTop: `1px solid ${GOLD}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.ephemerists.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: MUTED,
                fontFamily: SCRIPT,
                fontStyle: 'italic',
                fontSize: "var(--text-xl)",
                textDecoration: 'underline',
                cursor: 'pointer',
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.ephemerists.publishIdle'),
            busyLabel: t('editPraxis.ephemerists.publishBusy'),
            style: {
              flex: 1,
              background: RUBRIC,
              color: PARCHMENT,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: "var(--text-xl)",
              letterSpacing: '0.08em',
              padding: 'var(--space-md) var(--space-lg)',
              border: `1px solid ${GOLD}`,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the specimen-leaf idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: "var(--space-sm)" }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1px solid ${INK}`, background: VELLUM_DEEP }}>
            {item.type === 'image' ? (
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : item.type === 'video' ? (
              <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <MediaArt art={pickArtKey(filename, 'audio')} width={120} height={120} />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => void state.removeMedia(item)}
                aria-label={t('media.removeAria', { name: filename })}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: VELLUM,
                  border: `1.5px solid ${GOLD}`,
                  color: GOLD,
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      {!readOnly && (
        <FilePicker
          state={state}
          skin={{
            buttonStyle: {
              aspectRatio: '1 / 1',
              width: '100%',
              background: VELLUM_DEEP,
              border: `1.5px dashed ${INK}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: "var(--space-xs)",
              fontFamily: DISPLAY,
              fontSize: "var(--text-base)",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: RUBRIC,
            },
            buttonLabel: t('editPraxis.ephemerists.fileButton'),
          }}
        />
      )}
    </div>
  )
}
