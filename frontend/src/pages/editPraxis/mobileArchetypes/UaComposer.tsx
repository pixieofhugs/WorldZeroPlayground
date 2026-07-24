import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UaSigil } from '../../../components/cards/UaSigil'
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
 * University of Asthmatics MOBILE composer (#525/#852) — sealing a mark, on a
 * phone.
 *
 * The gilt salon is gone with #788. Where every field used to sit in its own
 * three-layer gold-leaf plate, the composer is now one quiet sheet: a tracked
 * small-caps label above each control, a hairline under the title, and the
 * ensō at the head as the faction mark. That collapse is what lets the form
 * hold at 375px — three nested frames per field spent most of the width on
 * borders.
 *
 * NO MANDALA. The kit draws its editor card with a lotus at 10% behind it, but
 * the brief's §5 ruling puts the editor in the `absent` bucket with feed rows
 * and comments, and where the two disagree the brief wins. That is a build-cost
 * ruling, and it holds.
 *
 * Consumes {@link EditPraxisState} verbatim — no editor, upload, or submit logic
 * lives here — and keeps every `editPraxis.ua.*` copy key (#850 owns the words).
 * Every colour is a `--faction-ua-*` token with both themes, so the composer
 * dims through the `[data-theme="dark"]` cascade.
 */

const SHEET = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const LIFT = 'var(--faction-ua-lift)'
const INK = 'var(--faction-ua-card-text)'
const BODY = 'var(--faction-ua-card-body)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const FILL = 'var(--faction-ua)'
const ON_FILL = 'var(--faction-ua-on-fill)'
const DISPLAY = 'var(--faction-ua-card-font)'
const SERIF = 'var(--faction-ua-body-font)'

/** The label voice: EB Garamond, tracked small caps. */
const smallCaps: CSSProperties = {
  display: 'block',
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A labelled field. No frame — the label carries the structure. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <span style={smallCaps}>{label}</span>
      {children}
    </section>
  )
}

export default function UaComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div
      data-skin="ua"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        fontFamily: SERIF,
        color: INK,
        background: `linear-gradient(158deg, ${LIFT}, ${SHEET} 55%, ${PANEL})`,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <UaSigil width={34} height={34} />
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 'var(--text-title)',
              lineHeight: 1,
              color: INK,
              margin: 0,
            }}
          >
            {t('editPraxis.ua.pageTitle')}
          </h1>
          <span style={{ ...smallCaps, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.ua.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.ua.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: {
              gap: 'var(--space-xs)',
              padding: 'var(--space-xs)',
              background: PANEL,
              border: `1px solid ${RULE}`,
              borderRadius: 999,
            },
            buttonStyle: (active) => ({
              padding: 'var(--space-sm)',
              borderRadius: 999,
              border: 'none',
              fontFamily: SERIF,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: active ? FILL : 'transparent',
              color: active ? ON_FILL : MUTED,
            }),
          }}
        />
      </header>

      {/* For the task */}
      <Field label={t('editPraxis.ua.taskRefLabel')}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md)',
            background: PANEL,
            border: `1px solid ${RULE}`,
            borderRadius: 4,
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: FILL, flex: 'none' }} />
          <span className="content-text" style={{ fontFamily: DISPLAY, fontWeight: 600, color: ACCENT, lineHeight: 1.2 }}>
            {praxis.task_title}
          </span>
        </div>
        <span style={smallCaps}>
          {factionName(task?.primary_faction_slug ?? null)}
          {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
        </span>
      </Field>

      {tab === 'write' ? (
        <>
          {/* Mode — Solo · Collab · Duel, above the title (scrolls with content) */}
          <DefaultModePicker state={state} />

          <Field label={t('editPraxis.ua.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.ua.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: DISPLAY,
                  fontWeight: 600,
                  color: INK,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1px solid ${RULE}`,
                  padding: 'var(--space-xs) 0 var(--space-sm)',
                },
              }}
            />
          </Field>

          <Field label={t('editPraxis.ua.bodyLabel', { words: state.wordCount })}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.ua.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: SERIF,
                  lineHeight: 1.6,
                  color: INK,
                  background: SHEET,
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  padding: 'var(--space-md)',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Field>

          {state.showInviteBox && (
            <Field label={state.duelMode ? t('editPraxis.ua.inviteLabelDuel') : t('editPraxis.ua.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: SERIF,
                  inputBg: SHEET,
                  inputColor: INK,
                  inputBorder: `1px solid ${RULE}`,
                  acceptedBg: FILL,
                  acceptedColor: ON_FILL,
                  placeholder: t('editPraxis.ua.invitePlaceholder'),
                }}
              />
            </Field>
          )}

          <Field label={t('editPraxis.ua.filesLabel')}>
            <MediaGrid state={state} />
          </Field>

          {state.showSealStack && (
            <Field label={t('editPraxis.ua.metatasksLabel')}>
              <MetataskSealStack state={state} />
            </Field>
          )}
        </>
      ) : (
        <Field label={t('editPraxis.ua.previewLabel')}>
          <div style={{ background: SHEET, border: `1px solid ${RULE}`, borderRadius: 6, padding: 'var(--space-lg)' }}>
            <div
              className="content-title"
              style={{ fontFamily: DISPLAY, fontWeight: 600, color: INK, marginBottom: 'var(--space-sm)' }}
            >
              {state.title || t('editPraxis.ua.titlePlaceholder')}
            </div>
            {state.media.length > 0 && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <MediaGrid state={state} readOnly />
              </div>
            )}
            <BodyPreview state={state} skin={{ markdownStyle: { fontFamily: SERIF, lineHeight: 1.6, color: BODY } }} />
          </div>
        </Field>
      )}

      <ErrorBanner message={state.error} />

      <MobileStickyBar
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          padding: 'var(--space-md) 0 var(--space-xs)',
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderTop: `1px solid ${HAIR}`,
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
                fontFamily: SERIF,
                fontSize: 'var(--text-xl)',
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
              background: FILL,
              color: ON_FILL,
              fontFamily: SERIF,
              fontSize: 'var(--text-xl)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: 'var(--space-md) var(--space-lg)',
              border: 'none',
              borderRadius: 3,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
      </MobileStickyBar>
    </div>
  )
}

/** Fluid three-across media grid — proportional columns, never fixed-px (§1a). */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div
            key={item.id}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              background: PANEL,
            }}
          >
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
                  background: SHEET,
                  border: `1px solid ${RULE}`,
                  color: ACCENT,
                  fontSize: 'var(--text-lg)',
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
              background: PANEL,
              border: `1px dashed ${FILL}`,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              fontFamily: SERIF,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.1em',
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
