"""
Interactively create a task in the production database via the admin API.

Usage (from repo root):
    python scripts/create_task.py

Requires PROD_API_URL (RENDER_API_URL still works as a fallback) and ADMIN_CLI_SECRET in backend/.env.
"""

import os
import sys
from pathlib import Path

import urllib.request
import urllib.error
import json

# ---------------------------------------------------------------------------
# Load backend/.env
# ---------------------------------------------------------------------------

env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
if not env_path.exists():
    print(f"ERROR: .env not found at {env_path}")
    sys.exit(1)

for line in env_path.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

API_URL = (os.environ.get("PROD_API_URL") or os.environ.get("RENDER_API_URL", "")).rstrip("/")
CLI_SECRET = os.environ.get("ADMIN_CLI_SECRET", "")

if not API_URL or not CLI_SECRET:
    print("ERROR: PROD_API_URL and ADMIN_CLI_SECRET must be set in backend/.env")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Faction choices (from era_1.py — update here if factions change)
# ---------------------------------------------------------------------------

FACTIONS = [
    ("na",          "None (cross-faction)"),
    ("ua",          "UA"),
    ("ua_masters",  "UA Masters"),
    ("snide",       "S.N.I.D.E."),
    ("gestalt",     "Gestalt"),
    ("journeymen",  "Journeymen"),
    ("analog",      "Analog"),
    ("singularity", "Singularity"),
    ("albescent",   "/Albescent"),
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def api_post(path: str, payload: dict, token: str | None = None) -> dict:
    url = f"{API_URL}{path}"
    body = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        print(f"\nAPI error {exc.code}: {detail}")
        sys.exit(1)


def prompt(label: str, default: str | None = None, required: bool = True) -> str:
    suffix = f" [{default}]" if default is not None else ""
    while True:
        value = input(f"{label}{suffix}: ").strip()
        if not value and default is not None:
            return default
        if value:
            return value
        if not required:
            return ""
        print("  (required)")


def prompt_int(label: str, default: int | None = None, min_val: int = 0) -> int:
    default_str = str(default) if default is not None else None
    while True:
        raw = prompt(label, default=default_str)
        try:
            val = int(raw)
            if val < min_val:
                print(f"  (must be >= {min_val})")
                continue
            return val
        except ValueError:
            print("  (must be a whole number)")


def prompt_multiline(label: str) -> str:
    print(f"{label} (blank line to finish):")
    lines = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines)


def choose_faction() -> str:
    print("\nFaction:")
    for i, (slug, name) in enumerate(FACTIONS, 1):
        print(f"  {i}. {name} ({slug})")
    while True:
        raw = input("Choose [1]: ").strip()
        if not raw:
            return FACTIONS[0][0]
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(FACTIONS):
                return FACTIONS[idx][0]
        except ValueError:
            pass
        print(f"  (enter a number 1–{len(FACTIONS)})")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=== Create Task ===\n")

    # Authenticate
    print("Authenticating with admin API...")
    url = f"{API_URL}/admin/cli-token"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Cli-Secret": CLI_SECRET,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            token = json.loads(resp.read())["access_token"]
    except urllib.error.HTTPError as exc:
        print(f"Auth failed {exc.code}: {exc.read().decode()}")
        sys.exit(1)
    print("Authenticated.\n")

    # Collect fields
    title = prompt("Title")
    description = prompt_multiline("Description")
    point_value = prompt_int("Point value", default=5, min_val=1)
    level_required = prompt_int("Level required", default=0, min_val=0)
    faction_slug = choose_faction()

    # Confirm
    print("\n--- Review ---")
    print(f"  Title:          {title}")
    print(f"  Description:    {description[:80] + '...' if len(description) > 80 else description or '(none)'}")
    print(f"  Points:         {point_value}")
    print(f"  Level required: {level_required}")
    print(f"  Faction:        {faction_slug}")
    print(f"  Status:         active (immediately live)")
    confirm = input("\nCreate this task? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    # Create
    payload = {
        "title": title,
        "description": description or None,
        "point_value": point_value,
        "level_required": level_required,
        "primary_faction_slug": faction_slug,
    }

    result = api_post("/admin/tasks", payload, token=token)
    print(f"\nTask created! ID: {result['id']}, status: {result['status']}")


if __name__ == "__main__":
    main()
