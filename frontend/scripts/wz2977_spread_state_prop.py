"""#2977 one-off: rewrite `state={EXPR}` JSX props to `{...EXPR}` in test files.

The four shared composer components now take narrowed `Pick<EditPraxisState, …>`
props instead of the whole state, so a suite that built a full state and handed
it over as `state=` spreads it instead. Every assertion survives; only the
binding changes. Deleted once the batch lands.
"""

import pathlib
import sys


def balanced_end(text: str, open_index: int) -> int:
    depth = 0
    for i in range(open_index, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return i
    raise ValueError("unbalanced brace")


def convert(path: str) -> None:
    file = pathlib.Path(path)
    text = file.read_text(encoding="utf-8")
    needle = " state={"
    changed = 0
    cursor = 0
    while True:
        at = text.find(needle, cursor)
        if at == -1:
            break
        open_index = at + len(needle) - 1
        close_index = balanced_end(text, open_index)
        expr = text[open_index + 1 : close_index]
        replacement = " {..." + expr + "}"
        text = text[:at] + replacement + text[close_index + 1 :]
        cursor = at + len(replacement)
        changed += 1
    file.write_text(text, encoding="utf-8", newline="\n")
    print(path, changed)


for argument in sys.argv[1:]:
    convert(argument)
