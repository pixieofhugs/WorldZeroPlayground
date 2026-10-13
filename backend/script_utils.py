"""
Shared utilities for World Zero database scripts.

Provides --env argument parsing and environment-aware settings loading
so any script can target dev or prod with:

    python my_script.py --env prod
    python my_script.py --env dev   # default
"""

import argparse

from config import Settings


ENV_FILES = {
    "dev":  ".env",
    "prod": ".env.prod",
}


def get_settings(env: str) -> Settings:
    """Load Settings from the correct .env file for the given environment."""
    env_file = ENV_FILES.get(env)
    if not env_file:
        raise ValueError(f"Unknown environment '{env}'. Choose: {list(ENV_FILES)}")
    # pydantic-settings v2 accepts _env_file to override model_config at runtime
    settings = Settings(_env_file=env_file)
    # A bare postgresql:// or postgres:// URL (as a hosted provider hands out) — normalize to asyncpg driver
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    settings.DATABASE_URL = url
    return settings


def add_env_argument(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    """Add the standard --env argument to any argparse parser."""
    parser.add_argument(
        "--env",
        choices=list(ENV_FILES),
        default="dev",
        help="Target environment (default: dev). Use --env prod to run against production.",
    )
    return parser
