import { appendFileSync } from 'node:fs'
import { vi } from 'vitest'

vi.mock('react-dom/server', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown> & { default?: Record<string, unknown> }
  const out = `${process.env.WZ_CAPTURE_DIR}/cap-${process.pid}.jsonl`
  const wrap = (fn: unknown) =>
    typeof fn !== 'function'
      ? fn
      : (...args: unknown[]) => {
          const html = (fn as (...a: unknown[]) => unknown)(...args)
          if (typeof html === 'string' && html.length > 30) appendFileSync(out, JSON.stringify(html) + '\n')
          return html
        }
  const patched = { ...actual, renderToStaticMarkup: wrap(actual.renderToStaticMarkup), renderToString: wrap(actual.renderToString) }
  return {
    ...patched,
    default: actual.default
      ? { ...actual.default, renderToStaticMarkup: patched.renderToStaticMarkup, renderToString: patched.renderToString }
      : patched,
  }
})
