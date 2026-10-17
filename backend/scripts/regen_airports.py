"""Regenerate ``backend/data/airports.csv`` from OurAirports (public domain, #3247).

    python backend/scripts/regen_airports.py [path-or-url-of-airports.csv]

The download is untrusted data: it is parsed with ``csv`` and every row is
validated (3-letter code, float coordinates in range); bad rows are dropped.
"""
import csv
import io
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

SOURCE_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
OUT = Path(__file__).resolve().parent.parent / "data" / "airports.csv"
_CODE = re.compile(r"^[A-Z]{3}$")


def reduce_rows(text: str) -> list[tuple[str, float, float]]:
    seen: dict[str, tuple[float, float]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        code = (row.get("iata_code") or "").strip().upper()
        try:
            lat, lon = float(row["latitude_deg"]), float(row["longitude_deg"])
        except (KeyError, TypeError, ValueError):
            continue
        if _CODE.match(code) and -90 <= lat <= 90 and -180 <= lon <= 180:
            seen.setdefault(code, (lat, lon))
    return [(code, *seen[code]) for code in sorted(seen)]


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else SOURCE_URL
    if src.startswith("http"):
        with urllib.request.urlopen(src, timeout=60) as resp:  # noqa: S310
            text = resp.read().decode("utf-8")
    else:
        text = Path(src).read_text(encoding="utf-8")
    rows = reduce_rows(text)
    with OUT.open("w", encoding="utf-8", newline="") as out:
        out.write(f"# Source: {SOURCE_URL} (OurAirports, public domain)\n")
        out.write(f"# Fetched: {date.today().isoformat()}. ")
        out.write("Regenerate: backend/scripts/regen_airports.py\n")
        writer = csv.writer(out, lineterminator="\n")
        writer.writerow(["code", "lat", "lon"])
        writer.writerows(rows)
    print(f"{len(rows)} airports -> {OUT}")


if __name__ == "__main__":
    main()
