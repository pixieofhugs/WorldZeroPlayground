/**
 * Copy edit mode: reword any string live, without a deploy. `App.tsx` mounts it
 * only for an admin in admin mode.
 *
 * While armed, `utils/copyRegistry.ts` records each rendered string's `ns:key`;
 * arming emits `languageChanged` so the page already on screen re-records.
 * The click listener is capture-phase on `document`: most copy sits in a link
 * or button that would navigate before a bubble listener heard it.
 *
 * Accepted limit (#3136): no keyboard reach while a `ConfirmDialog` traps Tab.
 * Strings are picked by pointer anyway.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { deleteCopyOverride, putCopyOverride } from '../../api/copy'
import { extractError } from '../../utils/errors'
import { useFormFactor } from '../../hooks/useFormFactor'
import i18n, { resources } from '../../i18n'
import { drawAtRoot } from '../ui/drawAtRoot'
import { isFactionScopedKey } from '../../utils/copyScope'
import {
  copyTargetsForElement,
  missingPlaceholders,
  setCopyRecording,
  type CopyTarget,
} from '../../utils/copyRegistry'

/**
 * The shipped value, from the imported JSON. Pristine only because `i18n.ts`
 * hands the store a clone; reading the mutated store would make Revert a no-op.
 * Exported for `copyOverrides.test.ts`.
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

/** i18next's plural categories, as the `_<category>` suffixes ADR-0032 uses. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const FORM_LABEL = {
  zero: 'copyEdit.formFor.zero',
  one: 'copyEdit.formFor.one',
  two: 'copyEdit.formFor.two',
  few: 'copyEdit.formFor.few',
  many: 'copyEdit.formFor.many',
  other: 'copyEdit.formFor.other',
} as const

/**
 * Plural forms of a bare key the click yielded (#3165); each form is its own
 * override target. Empty for e.g. a context variant. Exported for the test.
 */
export function pluralForms(target: CopyTarget): CopyTarget[] {
  return ['zero', 'one', 'two', 'few', 'many', 'other']
    .map((category) => ({ ns: target.ns, key: `${target.key}_${category}` }))
    .filter((form) => currentTemplate(form) !== null)
}

/** What Save does: store the override, then show it. Exported for the test. */
export async function saveCopy(target: CopyTarget, value: string): Promise<void> {
  await putCopyOverride({ ns: target.ns, key: target.key, value })
  i18n.addResource('en', target.ns, target.key, value)
}

/** What Revert does: drop the override, then show the shipped wording again. */
export async function revertCopy(target: CopyTarget): Promise<void> {
  await deleteCopyOverride(target.ns, target.key)
  i18n.addResource('en', target.ns, target.key, shippedValue(target.ns, target.key))
}

const PANEL: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-md)',
  left: 'var(--space-md)',
  // Above every overlay (#3094), so a popup's wording is editable while it is
  // open. `copyEditorStacking.test.tsx` enforces it.
  zIndex: 1100,
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

/**
 * The panel's box. On a phone it rests above `MobileTabBar` (#1566), and until
 * a string is open it hugs its control so bottom-pinned controls stay tappable
 * (#3136). `min-content` so the armed hint wraps instead of widening the panel.
 * Exported for `copyEditorStacking.test.tsx`.
 */
export function panelStyle(isMobile: boolean, editing: boolean): CSSProperties {
  if (!isMobile) return PANEL
  const phone = { ...PANEL, bottom: 'calc(var(--space-md) + var(--tab-bar-clearance))' }
  return editing ? phone : { ...phone, width: 'min-content', maxWidth: PANEL.width }
}

/**
 * While a string is open, Escape stays in the panel so it does not close the
 * popup being edited (#3094, #3245). Popups listen bubble-phase on
 * `document`/`window`; React delegates a portal's events from `document.body`,
 * so a synthetic `stopPropagation` stops it short of them.
 * Exported for `copyEditorStacking.test.tsx`.
 */
export function keepEscapeInPanel(
  event: { key: string; stopPropagation: () => void },
  stringOpen: boolean,
): void {
  if (event.key === 'Escape' && stringOpen) event.stopPropagation()
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
  const isMobile = useFormFactor() === 'mobile'
  const [armed, setArmed] = useState(false)
  const [target, setTarget] = useState<CopyTarget | null>(null)
  const [choices, setChoices] = useState<CopyTarget[]>([])
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  /**
   * `t` in a ref, load-bearing: react-i18next hands back a new `t` on every store
   * change and the effect below emits one, so `t` in its deps loops ("Maximum
   * update depth exceeded"). Deps stay `[armed]`.
   */
  const translate = useRef(t)
  translate.current = t

  /** Reads only refs and setState, so it is safe to leave out of the effect's deps. */
  const openTarget = (found: CopyTarget) => {
    const template = currentTemplate(found)
    if (template === null) {
      // A plural key holds no string itself; offer each form.
      const forms = pluralForms(found)
      if (forms.length > 0) {
        setTarget(null)
        setChoices(forms)
        setNotice(translate.current('copyEdit.pickForm'))
        return
      }
      // Context variants and `<Trans>` copy: saving would change nothing on screen.
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
    // Re-record the page already on screen. Once per arm (see the ref above).
    i18n.emit('languageChanged', i18n.language)

    const onClick = (event: MouseEvent) => {
      const node = event.target as Element | null
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
        // Several keys render that wording; guessing could reword another screen.
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

  /** "for a count of 1 — " ahead of a plural form's key, nothing ahead of any other. */
  const formLabel = (key: string) => {
    const category = PLURAL_SUFFIX.exec(key)?.[1] as keyof typeof FORM_LABEL | undefined
    return category ? `${t(FORM_LABEL[category])} — ` : ''
  }

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
      await saveCopy(target, draft)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.saveError')))
    }
  }

  const revert = async () => {
    if (!target) return
    try {
      await revertCopy(target)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.revertError')))
    }
  }

  // Drawn at the root (#3094): under `Layout` it would sit in `ShellContent`'s
  // stacking context, below every overlay. See `drawAtRoot`.
  return drawAtRoot(
    <div
      ref={panel}
      style={panelStyle(isMobile, target !== null)}
      className="font-body"
      onKeyDown={(event) => keepEscapeInPanel(event, target !== null)}
    >
      <button
        type="button"
        onClick={armed ? disarm : () => setArmed(true)}
        className="label-caption"
        style={{
          ...BUTTON,
          // This label sizes the idle phone panel (`panelStyle`).
          whiteSpace: 'nowrap',
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
              {`${formLabel(choice.key)}${choice.ns}:${choice.key}`}
            </button>
          ))}
        </div>
      )}

      {target && (
        <>
          <p className="card-meta">{`${formLabel(target.key)}${target.ns}:${target.key}`}</p>
          <p className="card-meta">
            {isFactionScopedKey(target) ? t('copyEdit.scopeFaction') : t('copyEdit.scopeShared')}
          </p>
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
    </div>,
  )
}
