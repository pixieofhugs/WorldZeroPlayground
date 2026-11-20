"""Write a display-size copy beside every stored image that lacks one (#3626).

    python scripts/backfill_display_copies.py               # dry run, dev
    python scripts/backfill_display_copies.py --env prod    # dry run, prod
    python scripts/backfill_display_copies.py --apply       # actually write

Idempotent: an image that already has its ``.display.webp`` is skipped. Originals
are never touched; rules live in ``services.media.write_missing_display_copy``.
"""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from models.praxis import MediaItem, MediaType  # noqa: E402
from script_utils import add_env_argument, get_settings  # noqa: E402
from services.media import write_missing_display_copy  # noqa: E402


async def backfill_display_copies(session: AsyncSession, apply: bool) -> int:
    """Returns how many copies were (or would be) written."""
    paths = (
        await session.execute(
            select(MediaItem.file_path).where(MediaItem.type == MediaType.image)
        )
    ).scalars().all()
    return sum(write_missing_display_copy(path, apply) for path in paths)


async def run(env: str, apply: bool) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}")  # host/db only, no creds
    print(f"Mode        : {'APPLY - files WILL be written' if apply else 'dry run'}\n")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            count = await backfill_display_copies(session, apply)
    finally:
        await engine.dispose()

    verb = "written" if apply else "would be written"
    print(f"Display copies {verb}: {count}")
    if not apply and count:
        print("\nDry run - nothing was written. Re-run with --apply.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill display-size image copies.")
    add_env_argument(parser)
    parser.add_argument("--apply", action="store_true", help="Write the files; default reports only.")
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.env, args.apply)))


if __name__ == "__main__":
    main()
