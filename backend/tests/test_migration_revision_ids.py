"""Guard: every Alembic revision id fits `alembic_version.version_num`.

varchar(32): a longer id only dies mid-upgrade, after the DDL ran (#817).
"""
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

VERSION_NUM_MAX_LENGTH = 32
_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def test_revision_ids_fit_version_num_column() -> None:
    script = ScriptDirectory.from_config(Config(str(_ALEMBIC_INI)))
    too_long = {
        revision.revision
        for revision in script.walk_revisions()
        if len(revision.revision) > VERSION_NUM_MAX_LENGTH
    }
    assert not too_long, (
        f"revision ids exceed alembic_version.version_num varchar({VERSION_NUM_MAX_LENGTH}): "
        f"{sorted(too_long)}"
    )
