/**
 * Copy edit mode — reword any string on any page, live, without a deploy.
 *
 * Mounted once from `App.tsx`, which gates it on `is_admin && adminMode`, so
 * this file assumes it is only ever rendered for an admin in admin mode.
 *
 * HOW A CLICK BECOMES A KEY
 * -------------------------
 * `i18n.ts`'s `copyRegistry` postProcessor records every rendered string
 * against the `ns:key` that produced it while this editor is armed
 * (`utils/copyRegistry.ts`). Arming emits `languageChanged`, which makes every
 * `useTranslation` consumer re-render and therefore re-record, so the index
 * describes the page as it currently stands rather than only what renders next.
 *
 * WHY THE CAPTURE PHASE
 * ---------------------
 * Most copy lives inside a link or a button. A listener in the bubble phase
 * would navigate away before it heard the click, so this one listens on
 * `document` in the capture phase and stops the event there: while armed, a
 * click edits a label instead of doing what the label says. That is a big thing
 * to do to a page, so the panel says so on screen and disarming undoes it
 * completely.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { deleteCopyOverride, putCopyOverride } from '../../api/copy'
import { extractError } from '../../utils/errors'
import i18n, { resources } from '../../i18n'
import {
  copyTargetsForElement,
  missingPlaceholders,
  setCopyRecording,
  type CopyTarget,
} from '../../utils/copyRegistry'

/**
 * The value the app SHIPS with, straight out of the imported JSON.
 *
 * `resources` is the pristine catalog only because `i18n.ts` hands the store a
 * clone — the store mutates what it is given, and reading the mutated copy here
 * is what made Revert write the override straight back while reporting success.
 *
 * Exported for `__tests__/copyOverrides.test.ts`: that one reference-versus-clone
 * detail is the whole of whether Revert works, and it is invisible from outside.
 */
export function shippedValue(ns: string, key: string): string {
  const table: unknown = (resources.en as Record<string, unknown>)[ns]
  const found = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part]
    return undefined
  }, table)
  return typeof found === 'string' ? found : ''
}

/** The template in force right now — `{{count}}` intact, not the rendered form. */
function currentTemplate(target: CopyTarget): string | null {
  const raw = i18n.getResource('en', target.ns, target.key)
  return typeof raw === 'string' ? raw : null
}

const PANEL: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-md)',
  left: 'var(--space-md)',
  zIndex: 50,
  width: 'min(22rem, calc(100vw - var(--space-xl)))',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
  padding: 'var(--space-sm)',
  background: 'var(--color-bg-page)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 4,
  boxShadow: '0 2px 12px var(--color-cast-shadow-soft)',
}

const ROW: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xs)',
  flexWrap: 'wrap',
}

const BUTTON: CSSProperties = {
  background: 'none',
  border: '1.5px solid var(--color-border-strong)',
  borderRadius: 2,
  cursor: 'pointer',
  padding: 'var(--space-xs) var(--space-sm)',
  color: 'var(--color-text-primary)',
}

export default function CopyEditor() {
  const { t } = useTranslation('admin')
  const panel = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [target, setTarget] = useState<CopyTarget | null>(null)
  const [choices, setChoices] = useState<CopyTarget[]>([])
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  /**
   * `t` for the listener, held in a ref — and this is load-bearing, not tidying.
   *
   * react-i18next v17 hands back a NEW `t` whenever the store changes, and the
   * effect below EMITS a store event. With `t` in the deps that is a loop:
   * emit → new `t` → deps differ → cleanup (which removes the listener and
   * clears the whole index) → effect re-runs → emit → "Maximum update depth
   * exceeded". `bindI18nStore: 'added'` widens it, since every `addResource` —
   * the boot load, every save — would tear the armed session down and rebuild
   * it. The deps are `[armed]` alone, so the effect runs once per arm, and the
   * emit with it.
   */
  const translate = useRef(t)
  translate.current = t

  /**
   * Open one key for editing. Reads only refs and setState, both stable for the
   * life of the component, so the effect's captured copy behaves exactly like a
   * fresh one — which is why it is safe to leave out of the deps above.
   */
  const openTarget = (found: CopyTarget) => {
    const template = currentTemplate(found)
    if (template === null) {
      // Plural and context keys resolve through sibling keys (`_one`, `_other`),
      // so the key the click yields holds no string of its own and saving to it
      // would change nothing on screen.
      setTarget(null)
      setChoices([])
      setNotice(translate.current('copyEdit.notSimpleKey', { key: `${found.ns}:${found.key}` }))
      return
    }
    setNotice(null)
    setChoices([])
    setTarget(found)
    setDraft(template)
  }

  useEffect(() => {
    if (!armed) return
    setCopyRecording(true)
    // Re-render every translated string so the index covers the page already on
    // screen, not just whatever renders after this point. Once per arm: see the
    // ref above for why that matters.
    i18n.emit('languageChanged', i18n.language)

    const onClick = (event: MouseEvent) => {
      const node = event.target as Element | null
      // Our own controls stay live; everything else is a copy target.
      if (node && panel.current?.contains(node)) return
      event.preventDefault()
      event.stopPropagation()
      const found = copyTargetsForElement(node)
      if (found.length === 0) {
        setTarget(null)
        setChoices([])
        setNotice(translate.current('copyEdit.notCopy'))
        return
      }
      if (found.length > 1) {
        // Several keys render that same wording. Guessing would reword a screen
        // she is not looking at, so she picks.
        setTarget(null)
        setChoices(found)
        setNotice(translate.current('copyEdit.pickKey'))
        return
      }
      openTarget(found[0])
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      setCopyRecording(false)
    }
  }, [armed])

  const disarm = () => {
    setArmed(false)
    setTarget(null)
    setChoices([])
    setNotice(null)
  }

  const save = async () => {
    if (!target) return
    const template = currentTemplate(target) ?? ''
    const missing = missingPlaceholders(template, draft)
    if (missing.length > 0) {
      setNotice(t('copyEdit.missingPlaceholder', { placeholders: missing.join(' ') }))
      return
    }
    try {
      await putCopyOverride({ ns: target.ns, key: target.key, value: draft })
      i18n.addResource('en', target.ns, target.key, draft)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.saveError')))
    }
  }

  const revert = async () => {
    if (!target) return
    try {
      await deleteCopyOverride(target.ns, target.key)
      // Put the shipped wording back on screen, so what she sees matches what
      // the server will now serve.
      i18n.addResource('en', target.ns, target.key, shippedValue(target.ns, target.key))
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.revertError')))
    }
  }

  return (
    <div ref={panel} style={PANEL} className="font-body">
      <button
        type="button"
        onClick={armed ? disarm : () => setArmed(true)}
        className="label-caption"
        style={{
          ...BUTTON,
          borderColor: armed ? 'var(--color-accent-primary)' : 'var(--color-border-strong)',
        }}
      >
        {armed ? t('copyEdit.disarm') : t('copyEdit.arm')}
      </button>

      {armed && (
        <p className="card-meta" style={{ color: 'var(--color-accent-primary)' }}>
          {t('copyEdit.armedHint')}
        </p>
      )}

      {notice && (
        <p className="card-meta" role="status">
          {notice}
        </p>
      )}

      {choices.length > 0 && (
        <div style={{ ...ROW, flexDirection: 'column' }}>
          {choices.map((choice) => (
            <button
              key={`${choice.ns}:${choice.key}`}
              type="button"
              onClick={() => openTarget(choice)}
              style={BUTTON}
              className="card-meta"
            >
              {`${choice.ns}:${choice.key}`}
            </button>
          ))}
        </div>
      )}

      {target && (
        <>
          <p className="card-meta">{`${target.ns}:${target.key}`}</p>
          <textarea
            className="font-body"
            value={draft}
            rows={4}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t('copyEdit.textareaLabel')}
            style={{
              width: '100%',
              padding: 'var(--space-xs)',
              background: 'var(--color-bg-surface-alt)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div style={ROW}>
            <button type="button" onClick={save} style={BUTTON} className="label-caption">
              {t('copyEdit.save')}
            </button>
            <button type="button" onClick={revert} style={BUTTON} className="label-caption">
              {t('copyEdit.revert')}
            </button>
            <button
              type="button"
              onClick={() => setTarget(null)}
              style={BUTTON}
              className="label-caption"
            >
              {t('copyEdit.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
