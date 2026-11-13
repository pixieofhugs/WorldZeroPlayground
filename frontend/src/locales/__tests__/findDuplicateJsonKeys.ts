// Reports keys duplicated within the same JSON object (#670). A raw token
// scanner, because JSON.parse (and its reviver) keeps only the last value.
//
// ponytail: assumes well-formed JSON (the build's JSON import fails first) and
// reports array-nested duplicates at the enclosing key path; add a real parser
// if either matters.

interface DuplicateKey {
  path: string
  key: string
}

interface Frame {
  kind: 'object' | 'array'
  keys: Set<string>
  path: string
}

export function findDuplicateJsonKeys(text: string): DuplicateKey[] {
  const duplicates: DuplicateKey[] = []
  const stack: Frame[] = []
  // Last key read, so a container opened as its value can build its path.
  let pendingKey: string | null = null
  let index = 0

  const readString = (): string => {
    // Escapes kept verbatim: byte-equal keys suffice for duplicate detection.
    let result = ''
    index++
    while (index < text.length) {
      const char = text[index]
      if (char === '\\') {
        result += text[index] + (text[index + 1] ?? '')
        index += 2
        continue
      }
      if (char === '"') {
        index++
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
