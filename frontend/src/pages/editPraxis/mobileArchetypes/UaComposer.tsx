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
  MetatasksList,
  PublishButton,
  TitleField,
} from '../archetypes/controls'
import type { EditPraxisState } from '../useEditPraxis'
import { MobileStickyBar, SegToggle, type ComposerTab } from './shared'

/**
 * University of Asthmatics MOBILE composer (#525) — "Submit to the Salon" on a
 * phone. The same single-column composer as the Default mobile skin
 * (Write/Preview toggle, fluid media grid, sticky submit bar) dressed in gilt
 * salon chrome: parchment plates in gold-leaf frames, engraved kickers, Cormorant
 * italic titles. Ported from the desktop UA Atelier archetype; grounds on the
 * `--faction-ua-*` / `--ua-*` tokens (always-light). Consumes `useEditPraxis`
 * verbatim — no editor, upload, or submit logic lives here.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const GOLD_PALE = 'var(--ua-gold-pale)'
const LINE = 'var(--ua-line)'
const GILT = 'var(--ua-gilt)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A parchment plate in the gilt sandwich frame, headed by an engraved title. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ padding: "var(--space-sm)", background: GILT, boxShadow: '0 8px 20px rgba(60,40,10,.16), inset 0 0 0 1px rgba(255,255,255,0.45)' }}>
      <div style={{ padding: "var(--space-xs)", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
        <div style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "var(--space-md)" }}>
          <div style={{ fontFamily: ENGRAVED, fontSize: "var(--text-sm)", letterSpacing: '0.13em', textTransform: 'uppercase', color: ACCENT, marginBottom: "var(--space-sm)" }}>
            {title}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

export default function UaComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="ua" style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)", fontFamily: MONO, color: INK, background: WALL }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)" }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: "var(--space-sm)" }}>
          <h1 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: "var(--text-title)", lineHeight: 1, color: INK, margin: 0 }}>
            {t('editPraxis.ua.pageTitle')}
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.ua.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.ua.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: "var(--space-xs)", padding: "var(--space-xs)", background: PAPER, border: `1px solid ${LINE}`, borderRadius: 999 },
            buttonStyle: (active) => ({
              padding: 'var(--space-sm)',
              borderRadius: 999,
              border: 'none',
              fontFamily: ENGRAVED,
              fontSize: "var(--text-md)",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: active ? ACCENT : 'transparent',
              color: active ? PAPER_WARM : SUB,
            }),
          }}
        />
      </header>

      {/* For-commission reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: "var(--space-sm)", padding: 'var(--space-md)', background: PAPER, border: `1px solid ${LINE}` }}>
        <span style={kicker}>{t('editPraxis.ua.taskRefLabel')}</span>
        <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: "var(--text-content)", color: INK, textAlign: 'right', flex: 1, lineHeight: 1.1 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, color: ACCENT }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          <Plate title={t('editPraxis.ua.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.ua.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: DISPLAY,
                  fontStyle: 'italic',
                  fontWeight: 700,
                  color: INK,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1px solid ${LINE}`,
                  padding: 'var(--space-xs) 0 var(--space-sm)',
                },
              }}
            />
          </Plate>

          <Plate title={t('editPraxis.ua.bodyLabel', { words: state.wordCount })}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.ua.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: DISPLAY,
                  lineHeight: 1.6,
                  color: INK,
                  background: PAPER_WARM,
                  border: `1px solid ${LINE}`,
                  padding: 'var(--space-md) var(--space-lg)',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Plate>

          {state.showInviteBox && (
            <Plate title={state.duelMode ? t('editPraxis.ua.inviteLabelDuel') : t('editPraxis.ua.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: MONO,
                  inputBg: PAPER_WARM,
                  inputColor: INK,
                  inputBorder: `1px solid ${LINE}`,
                  acceptedBg: ACCENT,
                  acceptedColor: PAPER_WARM,
                  placeholder: t('editPraxis.ua.invitePlaceholder'),
                }}
              />
            </Plate>
          )}

          <Plate title={t('editPraxis.ua.filesLabel')}>
            <MediaGrid state={state} />
          </Plate>

          {state.showMetatasks && (
            <Plate title={t('editPraxis.ua.metatasksLabel')}>
              <MetatasksList
                state={state}
                skin={{
                  containerStyle: { display: 'flex', flexDirection: 'column', gap: "var(--space-xs)" },
                  rowStyle: (selected) => ({
                    padding: 'var(--space-sm) var(--space-md)',
                    background: selected ? PAPER_WARM : 'transparent',
                    border: `1px solid ${selected ? ACCENT : LINE}`,
                  }),
                  titleColor: INK,
                  descColor: SUB,
                  pointsActiveColor: ACCENT,
                  pointsIdleColor: SUB,
                }}
              />
            </Plate>
          )}
        </>
      ) : (
        <Plate title={t('editPraxis.ua.previewLabel')}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: "var(--text-title)", color: INK, marginBottom: "var(--space-sm)" }}>
            {state.title || t('editPraxis.ua.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: DISPLAY, lineHeight: 1.6, color: INK },
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
          borderTop: `1px solid ${GOLD}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.ua.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: MUTED,
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontSize: "var(--text-xl)",
                cursor: 'pointer',
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.ua.publishIdle'),
            busyLabel: t('editPraxis.ua.publishBusy'),
            style: {
              flex: 1,
              background: ACCENT,
              color: PAPER_WARM,
              fontFamily: ENGRAVED,
              fontSize: "var(--text-lg)",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: 'var(--space-md) var(--space-lg)',
              border: `1px solid ${ACCENT}`,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the salon plate idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: "var(--space-sm)" }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1px solid ${GOLD}`, background: PAPER_WARM }}>
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
                  background: PAPER,
                  border: `1px solid ${ACCENT}`,
                  color: ACCENT,
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
              background: PAPER_WARM,
              border: `1.5px dashed ${GOLD}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: "var(--space-xs)",
              fontFamily: ENGRAVED,
              fontSize: "var(--text-base)",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: ACCENT,
            },
            buttonLabel: t('editPraxis.ua.fileButton'),
          }}
        />
      )}
    </div>
  )
}
