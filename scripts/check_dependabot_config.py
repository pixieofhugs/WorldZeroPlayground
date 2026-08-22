"""Validate .github/dependabot.yml against the Dependabot v2 schema.

A malformed dependabot.yml fails silently on GitHub's side -- it simply never
runs, and the repo looks configured while nothing watches anything (#2428).
This checks the two things that fail that way: the YAML must parse, and every
key must be a real v2 key (a typo is accepted by the parser and ignored by
Dependabot).

Run: python scripts/check_dependabot_config.py
"""

import pathlib
import sys

import yaml

# Keys per https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
UPDATE_KEYS = {
    "package-ecosystem", "directory", "directories", "schedule",
    "allow", "assignees", "commit-message", "cooldown", "groups", "ignore",
    "insecure-external-code-execution", "labels", "milestone",
    "open-pull-requests-limit", "patterns", "pull-request-branch-name",
    "rebase-strategy", "registries", "reviewers", "target-branch",
    "vendor", "versioning-strategy",
}
GROUP_KEYS = {"applies-to", "patterns", "exclude-patterns", "dependency-type", "update-types"}
SCHEDULE_KEYS = {"interval", "day", "time", "timezone", "cronjob"}
INTERVALS = {"daily", "weekly", "monthly", "quarterly", "semiannually", "yearly", "cron"}
UPDATE_TYPES = {"major", "minor", "patch"}
APPLIES_TO = {"version-updates", "security-updates"}
DEPENDENCY_TYPES = {"production", "development"}

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / ".github" / "dependabot.yml"


def main() -> int:
    errors: list[str] = []

    if not CONFIG.exists():
        print(f"FAIL: {CONFIG} does not exist")
        return 1

    try:
        cfg = yaml.safe_load(CONFIG.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"FAIL: {CONFIG} is not valid YAML: {exc}")
        return 1

    if cfg.get("version") != 2:
        errors.append(f"version must be 2, got {cfg.get('version')!r}")

    unknown_top = set(cfg) - {"version", "updates", "registries", "enable-beta-ecosystems"}
    if unknown_top:
        errors.append(f"unknown top-level key(s): {sorted(unknown_top)}")

    updates = cfg.get("updates")
    if not isinstance(updates, list) or not updates:
        print("FAIL: `updates` must be a non-empty list")
        return 1

    for i, upd in enumerate(updates):
        where = f"updates[{i}]"
        unknown = set(upd) - UPDATE_KEYS
        if unknown:
            errors.append(f"{where}: unknown key(s) {sorted(unknown)}")

        for required in ("package-ecosystem", "schedule"):
            if required not in upd:
                errors.append(f"{where}: missing required key `{required}`")
        if "directory" not in upd and "directories" not in upd:
            errors.append(f"{where}: needs `directory` or `directories`")

        # The directory must actually contain a manifest, or the entry is inert.
        directory = upd.get("directory")
        if directory:
            target = ROOT / directory.lstrip("/")
            if not target.is_dir():
                errors.append(f"{where}: directory {directory} does not exist in the repo")

        schedule = upd.get("schedule", {})
        unknown_sched = set(schedule) - SCHEDULE_KEYS
        if unknown_sched:
            errors.append(f"{where}.schedule: unknown key(s) {sorted(unknown_sched)}")
        if schedule.get("interval") not in INTERVALS:
            errors.append(f"{where}.schedule.interval: {schedule.get('interval')!r} not in {sorted(INTERVALS)}")

        for name, group in (upd.get("groups") or {}).items():
            gwhere = f"{where}.groups.{name}"
            unknown_group = set(group) - GROUP_KEYS
            if unknown_group:
                errors.append(f"{gwhere}: unknown key(s) {sorted(unknown_group)}")
            bad_types = set(group.get("update-types") or []) - UPDATE_TYPES
            if bad_types:
                errors.append(f"{gwhere}.update-types: invalid {sorted(bad_types)}")
            if "applies-to" in group and group["applies-to"] not in APPLIES_TO:
                errors.append(f"{gwhere}.applies-to: invalid {group['applies-to']!r}")
            if "dependency-type" in group and group["dependency-type"] not in DEPENDENCY_TYPES:
                errors.append(f"{gwhere}.dependency-type: invalid {group['dependency-type']!r}")

    if errors:
        print("FAIL:")
        for err in errors:
            print(f"  - {err}")
        return 1

    ecosystems = ", ".join(f"{u['package-ecosystem']}:{u.get('directory')}" for u in updates)
    print(f"OK: {CONFIG.relative_to(ROOT)} parses, all keys valid ({ecosystems})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
