"""#2530 call-site sweep: pickVariant(map, slug, Default) -> resolveVariant(map, slug).

Balances parentheses rather than matching a regex over the whole call, because
eight of the sites are wrapped across three or four lines and two of them nest a
call in the first argument.

Lives in the worktree, not the shared scratchpad: a generic name there gets
clobbered by a parallel agent (see CLAUDE.md).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend"


def split_args(text: str) -> list[str]:
    args, depth, start, quote = [], 0, 0, None
    for i, ch in enumerate(text):
        if quote:
            if ch == quote and text[i - 1] != "\\":
                quote = None
            continue
        if ch in "\"'`":
            quote = ch
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "," and depth == 0:
            args.append(text[start:i])
            start = i + 1
    args.append(text[start:])
    return args


def rewrite(src: str) -> tuple[str, int]:
    out, i, changed = [], 0, 0
    while True:
        m = re.compile(r"\bpickVariant\(").search(src, i)
        if not m:
            out.append(src[i:])
            break
        depth, j = 1, m.end()
        while depth:
            if src[j] == "(":
                depth += 1
            elif src[j] == ")":
                depth -= 1
            j += 1
        inner = src[m.end() : j - 1]
        args = split_args(inner)
        trailer = ""
        if len(args) == 4 and not args[-1].strip():
            trailer = "," + args.pop()  # multi-line, trailing-comma style
        if len(args) == 3:
            head = ",".join(args[:2]) + trailer
            out.append(src[i : m.start()] + "resolveVariant(" + head + ")")
            changed += 1
        else:
            out.append(src[i:j])
        i = j
    return "".join(out), changed


def main(paths: list[str]) -> None:
    for rel in paths:
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        new, n = rewrite(text)
        if n and "pickVariant(" not in new:
            new = new.replace("{ pickVariant }", "{ resolveVariant }")
            new = new.replace("pickVariant,", "resolveVariant,")
        elif n:
            new = new.replace("{ pickVariant }", "{ pickVariant, resolveVariant }")
        if new != text:
            path.write_text(new, encoding="utf-8", newline="\n")
        print(f"{n:3d}  {rel}")


if __name__ == "__main__":
    listed = (Path(__file__).resolve().parent / "files.txt").read_text().split()
    skip = ("defaultManifest", "utils/__tests__")
    main([p for p in listed if not any(s in p for s in skip)] if not sys.argv[1:] else sys.argv[1:])
