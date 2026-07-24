import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  MetataskSealStack,
  PublishButton,
  TitleField,
} from '../archetypes/controls'
import type { EditPraxisState } from '../useEditPraxis'
import { MobileStickyBar, SegToggle, type ComposerTab } from './shared'

/**
 * Everymen MOBILE composer (#529) — "Stamp & File" on a phone. The same
 * single-column composer as the Default mobile skin (Write/Preview toggle, fluid
 * media grid, sticky submit bar) dressed as a union work report: cream newsprint
 * plates framed in ink, knockout Bebas labels, a red/gold masthead. Ported from
 * the desktop Everymen archetype; grounds on the `--everymen-*` tokens (flips
 * with `[data-theme]`). Consumes `useEditPraxis` verbatim — no editor, upload, or
 * submit logic lives here.
 */

const INK = 'var(--everymen-ink)' // structure only: borders/rules + text on gold (stays near-black in dark)
const PAPER_TEXT = 'var(--everymen-paper-text)' // text on the paper surface (flips in dark)
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  display: 'block',
  fontFamily: BODY_FONT,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A cream newsprint plate framed in union ink, headed by a Bebas title. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: PAPER, border: `2px solid ${INK}`, padding: "var(--space-md)" }}>
      <div style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-xl)", letterSpacing: '0.06em', color: RED, marginBottom: "var(--space-sm)" }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function EverymenComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="everymen" style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)", fontFamily: BODY_FONT, color: PAPER_TEXT, background: PAPER }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)" }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: "var(--space-sm)" }}>
          <h1 style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-heading)", lineHeight: 0.95, letterSpacing: '0.02em', color: PAPER_TEXT, margin: 0 }}>
            {t('editPraxis.everymen.pageTitle')}
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.everymen.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.everymen.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: "var(--space-xs)", padding: "var(--space-xs)", background: PAPER_DEEP, border: `1.5px solid ${INK}` },
            buttonStyle: (active) => ({
              padding: 'var(--space-sm)',
              border: 'none',
              fontFamily: ACCENT_FONT,
              fontSize: "var(--text-xl)",
              letterSpacing: '0.08em',
              background: active ? INK : 'transparent',
              color: active ? CREAM : MUTED,
            }),
          }}
        />
      </header>

      {/* For-task reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: "var(--space-sm)", padding: 'var(--space-md)', background: PAPER_DEEP, border: `1.5px solid ${INK}` }}>
        <span style={kicker}>{t('editPraxis.everymen.taskRefLabel')}</span>
        <span style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-content)", letterSpacing: '0.02em', color: PAPER_TEXT, textAlign: 'right', flex: 1, lineHeight: 1 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, color: RED }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          <Plate title={t('editPraxis.everymen.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.everymen.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: ACCENT_FONT,
                  letterSpacing: '0.01em',
                  color: PAPER_TEXT,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1.5px solid ${INK}`,
                  padding: 'var(--space-xs) 0 var(--space-sm)',
                },
              }}
            />
          </Plate>

          <Plate title={t('editPraxis.everymen.bodyLabel')}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.everymen.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: BODY_FONT,
                  lineHeight: 1.6,
                  color: PAPER_TEXT,
                  background: PAPER_DEEP,
                  border: `1.5px solid ${INK}`,
                  padding: 'var(--space-md) var(--space-lg)',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Plate>

          {state.showInviteBox && (
            <Plate title={state.duelMode ? t('editPraxis.everymen.inviteLabelDuel') : t('editPraxis.everymen.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: BODY_FONT,
                  inputBg: PAPER_DEEP,
                  inputColor: PAPER_TEXT,
                  inputBorder: `1.5px solid ${INK}`,
                  acceptedBg: RED,
                  acceptedColor: CREAM,
                  placeholder: t('editPraxis.everymen.invitePlaceholder'),
                }}
              />
            </Plate>
          )}

          <Plate title={t('editPraxis.everymen.filesLabel')}>
            <MediaGrid state={state} />
          </Plate>

          {state.showSealStack && (
            <Plate title={t('editPraxis.everymen.metatasksLabel')}>
              <MetataskSealStack state={state} />
            </Plate>
          )}
        </>
      ) : (
        <Plate title={t('editPraxis.everymen.previewLabel')}>
          <div style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-title)", letterSpacing: '0.01em', color: PAPER_TEXT, marginBottom: "var(--space-sm)" }}>
            {state.title || t('editPraxis.everymen.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: BODY_FONT, lineHeight: 1.6, color: PAPER_TEXT },
            }}
          />
        </Plate>
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
          borderTop: `2px solid ${INK}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.everymen.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: MUTED,
                fontFamily: BODY_FONT,
                fontSize: "var(--text-lg)",
                textDecoration: 'underline',
                cursor: 'pointer',
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.everymen.publishIdle'),
            busyLabel: t('editPraxis.everymen.publishBusy'),
            style: {
              flex: 1,
              background: RED,
              color: CREAM,
              fontFamily: ACCENT_FONT,
              fontSize: "var(--text-xl)",
              letterSpacing: '0.08em',
              padding: 'var(--space-md) var(--space-lg)',
              border: `2px solid ${INK}`,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the union proof-of-work idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: "var(--space-sm)" }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1.5px solid ${INK}`, background: PAPER_DEEP }}>
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
                  background: GOLD,
                  border: `1.5px solid ${INK}`,
                  color: INK,
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
              background: PAPER_DEEP,
              border: `1.5px dashed ${INK}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: "var(--space-xs)",
              fontFamily: ACCENT_FONT,
              fontSize: "var(--text-lg)",
              letterSpacing: '0.06em',
              color: RED,
            },
            buttonLabel: t('editPraxis.everymen.fileButton'),
          }}
        />
      )}
    </div>
  )
}
