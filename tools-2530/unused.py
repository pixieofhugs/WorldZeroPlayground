"""Delete the import lines tsc now calls unused (TS6133) — the `Default*` a
dispatcher named as pickVariant's third argument and nothing else.

Only touches lines that are ENTIRELY an import statement; anything else is
printed for a human. Re-runs `tsc` itself so the line numbers are never stale.
"""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend"
TSC = ROOT / "node_modules" / ".bin" / "tsc.cmd"

out = subprocess.run([str(TSC), "--noEmit"], cwd=ROOT, capture_output=True, text=True).stdout
hits: dict[str, list[int]] = {}
for line in out.splitlines():
    m = re.match(r"^(src/.+?)\((\d+),\d+\): error TS6133: '(\w+)' is declared", line)
    if m and (m.group(3).startswith("Default") or m.group(3) == "DEFAULT_CARD"):
        hits.setdefault(m.group(1), []).append(int(m.group(2)))

for rel, lines in hits.items():
    path = ROOT / rel
    text = path.read_text(encoding="utf-8").split("\n")
    drop = []
    for n in lines:
        if re.match(r"^import \w+ from ['\"].+['\"];?$", text[n - 1].strip()):
            drop.append(n)
        else:
            print(f"MANUAL {rel}:{n}  {text[n - 1]}")
    for n in sorted(drop, reverse=True):
        del text[n - 1]
    path.write_text("\n".join(text), encoding="utf-8", newline="\n")
    print(f"{len(drop):3d}  {rel}")
