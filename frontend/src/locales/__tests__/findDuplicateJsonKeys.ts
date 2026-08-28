// Reports keys that appear twice within the SAME JSON object, at any nesting
// depth. `JSON.parse` cannot do this: it silently keeps the last value and
// drops the earlier block (JSON is last-wins), so a duplicated catalog key
// erases its own copy with no error. See issue #670 / the #634 factions.json
// `albescent.invitation` incident.
//
// This is a raw token scanner rather than a JSON.parse reviver, because the
// reviver only ever sees the survivor — duplicates are already collapsed by
// the time it runs.
//
// ponytail: the scanner assumes WELL-FORMED JSON (it is only ever run on
// catalogs that also go through `import ... from '*.json'`, which would fail
// the build first on malformed input). It does not validate syntax; it only
// finds duplicate object keys. Array indices are not reflected in the reported
// path — a duplicate inside `[{...}, {...}]` reports the enclosing key path.

interface DuplicateKey {
  /** Dotted path to the object that holds the duplicate, plus the key itself. */
  path: string
  key: string
}

interface Frame {
  kind: 'object' | 'array'
  keys: Set<string>
  /** Dotted path from the document root to this container. */
  path: string
}

export function findDuplicateJsonKeys(text: string): DuplicateKey[] {
  const duplicates: DuplicateKey[] = []
  const stack: Frame[] = []
  // The key most recently read in the innermost object, so a nested container
  // opened as that key's value can build its own path.
  let pendingKey: string | null = null
  let index = 0

  const readString = (): string => {
    // Assumes text[index] === '"'. Returns the decoded-enough key text
    // (escape sequences are kept verbatim; duplicate detection only needs
    // byte-equal keys, which raw text preserves).
    let result = ''
    index++ // skip opening quote
    while (index < text.length) {
      const char = text[index]
      if (char === '\\') {
        result += text[index] + (text[index + 1] ?? '')
        index += 2
        continue
      }
      if (char === '"') {
        index++ // skip closing quote
        return result
      }
      result += char
      index++
    }
    return result
  }

  const peekNextNonWhitespace = (): string => {
    let scan = index
    while (scan < text.length && /\s/.test(text[scan])) scan++
    return text[scan] ?? ''
  }

  while (index < text.length) {
    const char = text[index]

    if (char === '{' || char === '[') {
      const parent = stack[stack.length - 1]
      const parentPath = parent ? parent.path : ''
      const path =
        pendingKey != null
          ? parentPath
            ? `${parentPath}.${pendingKey}`
            : pendingKey
          : parentPath
      stack.push({
        kind: char === '{' ? 'object' : 'array',
        keys: new Set<string>(),
        path,
      })
      pendingKey = null
      index++
      continue
    }

    if (char === '}' || char === ']') {
      stack.pop()
      index++
      continue
    }

    if (char === '"') {
      const value = readString()
      const isKey = peekNextNonWhitespace() === ':'
      const frame = stack[stack.length - 1]
      if (isKey && frame && frame.kind === 'object') {
        if (frame.keys.has(value)) {
          duplicates.push({
            path: frame.path ? `${frame.path}.${value}` : value,
            key: value,
          })
        } else {
          frame.keys.add(value)
        }
        pendingKey = value
      }
      continue
    }

    index++
  }

  return duplicates
}
