# /// script
# dependencies = ["mcp[cli]", "httpx"]
# ///
"""World Zero Admin MCP Server

Exposes the World Zero admin HTTP API as MCP tools so Claude can manage
the production database directly. Authenticates via POST /admin/cli-token
and caches the JWT for its 7-day lifetime.

Required environment variables:
  WZ_API_URL     - Base URL of the deployed API (e.g. https://api.worldzero.org)
  WZ_CLI_SECRET  - Value of ADMIN_CLI_SECRET set in Render
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_URL = os.environ["WZ_API_URL"].rstrip("/")
CLI_SECRET = os.environ["WZ_CLI_SECRET"]

mcp = FastMCP("worldzero-admin")

# ---------------------------------------------------------------------------
# Auth — cached JWT
# ---------------------------------------------------------------------------

_token: str | None = None
_token_expires_at: datetime | None = None


async def _get_token() -> str:
    global _token, _token_expires_at

    if _token and _token_expires_at and datetime.now(timezone.utc) < _token_expires_at:
        return _token

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/admin/cli-token",
            headers={"X-Admin-Cli-Secret": CLI_SECRET},
        )
        response.raise_for_status()
        _token = response.json()["access_token"]
        # JWT is valid for 7 days; refresh a day early to be safe
        _token_expires_at = datetime.now(timezone.utc) + timedelta(days=6)
    return _token


async def _get(path: str, params: dict | None = None) -> Any:
    token = await _get_token()
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
        response.raise_for_status()
        return response.json()


async def _post(path: str, body: dict | None = None) -> Any:
    token = await _get_token()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        response.raise_for_status()
        return response.json()


async def _put(path: str, body: dict | None = None) -> Any:
    token = await _get_token()
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{API_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        response.raise_for_status()
        return response.json()


async def _patch(path: str, body: dict) -> Any:
    token = await _get_token()
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{API_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        response.raise_for_status()
        return response.json()


# ---------------------------------------------------------------------------
# Read / Inspect tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_overview() -> dict:
    """Get a game-wide stats overview: counts of accounts, characters, active tasks, praxes, and votes."""
    return await _get("/admin/overview")


@mcp.tool()
async def wz_list_accounts(email: str = "") -> list:
    """List all accounts. Optionally filter by partial email match."""
    params = {"email": email} if email else None
    return await _get("/admin/accounts", params=params)


@mcp.tool()
async def wz_get_account(account_id: int) -> dict:
    """Get full details for an account including all linked characters."""
    return await _get(f"/admin/accounts/{account_id}")


@mcp.tool()
async def wz_list_characters(faction: str = "", status: str = "") -> list:
    """List all characters with their current era stats. Filter by faction slug or status (active/paused/banned)."""
    params = {}
    if faction:
        params["faction"] = faction
    if status:
        params["status"] = status
    return await _get("/admin/characters", params=params or None)


@mcp.tool()
async def wz_list_pending_tasks() -> list:
    """List all tasks awaiting admin approval."""
    return await _get("/admin/tasks/pending")


# ---------------------------------------------------------------------------
# Task management tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_create_task(
    title: str,
    point_value: int,
    level_required: int,
    description: str = "",
    primary_faction_slug: str = "ua",
) -> dict:
    """Create a new task directly in active status (bypasses pending review).

    Args:
        title: Task title. Supports markdown (e.g. ~~strikethrough~~).
        point_value: Points awarded on completion.
        level_required: Minimum character level to sign up.
        description: Full task description shown to players. Supports markdown.
        primary_faction_slug: Faction this task belongs to (default: ua).
    """
    return await _post("/admin/tasks", {
        "title": title,
        "description": description,
        "point_value": point_value,
        "level_required": level_required,
        "primary_faction_slug": primary_faction_slug,
    })


@mcp.tool()
async def wz_approve_task(task_id: int) -> dict:
    """Approve a pending task, moving it to active status."""
    return await _put(f"/admin/tasks/{task_id}/approve")


@mcp.tool()
async def wz_retire_task(task_id: int) -> dict:
    """Retire an active task, removing it from the active task list."""
    return await _put(f"/admin/tasks/{task_id}/retire")


@mcp.tool()
async def wz_reactivate_task(task_id: int) -> dict:
    """Reactivate a retired task, returning it to active status."""
    return await _post(f"/admin/tasks/{task_id}/reactivate")


# ---------------------------------------------------------------------------
# Character management tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_create_character(
    account_id: int,
    username: str,
    display_name: str,
    faction_slug: str = "ua",
    bio: str = "",
    avatar_url: str = "",
    location: str = "",
) -> dict:
    """Admin-create a character on any account, bypassing the level-3 gate."""
    return await _post("/admin/characters", {
        "account_id": account_id,
        "username": username,
        "display_name": display_name,
        "faction_slug": faction_slug,
        "bio": bio,
        "avatar_url": avatar_url,
        "location": location,
    })


@mcp.tool()
async def wz_patch_character_stats(
    character_id: int,
    level: int | None = None,
    score: int | None = None,
    all_time_score: int | None = None,
    votes_available: int | None = None,
) -> dict:
    """Directly set a character's stats for the current era. Only supplied fields are updated.

    Args:
        character_id: The character's ID.
        level: New level value.
        score: New current-era score.
        all_time_score: New all-time score.
        votes_available: New vote budget.
    """
    patch = {}
    if level is not None:
        patch["level"] = level
    if score is not None:
        patch["score"] = score
    if all_time_score is not None:
        patch["all_time_score"] = all_time_score
    if votes_available is not None:
        patch["votes_available"] = votes_available
    return await _patch(f"/admin/characters/{character_id}/stats", patch)


@mcp.tool()
async def wz_ban_character(character_id: int, banned: bool) -> dict:
    """Ban or unban a character. Set banned=True to ban, False to unban."""
    return await _post(f"/admin/characters/{character_id}/ban", {"banned": banned})


# ---------------------------------------------------------------------------
# Faction tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_create_faction(
    slug: str,
    name: str,
    description: str = "",
    hidden: bool = False,
) -> dict:
    """Create a new faction.

    Args:
        slug: URL-safe identifier (lowercase letters, numbers, hyphens, underscores).
        name: Display name shown to players.
        description: Faction description shown to players.
        hidden: If True, faction is hidden from public listing.
    """
    return await _post("/admin/factions", {
        "slug": slug,
        "name": name,
        "description": description,
        "hidden": hidden,
    })


# ---------------------------------------------------------------------------
# Account / role management tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_manage_role(account_id: int, role: str, action: str) -> dict:
    """Grant or revoke a role on an account.

    Args:
        account_id: The account's ID.
        role: Role name (e.g. "admin").
        action: Either "grant" or "revoke".
    """
    return await _post(f"/admin/accounts/{account_id}/role", {
        "role": role,
        "action": action,
    })


@mcp.tool()
async def wz_suspend_account(account_id: int, suspended: bool) -> dict:
    """Suspend or unsuspend an account. Set suspended=True to suspend, False to reactivate."""
    return await _post(f"/admin/accounts/{account_id}/suspend", {"suspended": suspended})


# ---------------------------------------------------------------------------
# Praxis tools
# ---------------------------------------------------------------------------


@mcp.tool()
async def wz_hide_praxis(praxis_id: int) -> dict:
    """Hide a praxis from public view.

    Args:
        praxis_id: The praxis's ID.
    """
    return await _patch(f"/admin/praxes/{praxis_id}/moderate", {"status": "hidden"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
