"""Metatask association table.

A metatask is just a Task row with ``task_type == TaskType.metatask``. This
file now defines only the join table connecting a Praxis to the Task that
acts as its metatask. The old ``MetaTask`` and ``BonusType`` classes have
been removed; see migration 0006_task_type_and_metatask_unification.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class PraxisMetaTask(Base):
    __tablename__ = "praxis_meta_task"

    # The only composite primary key in the schema, and so the only table with
    # no `Identity()`: both halves are foreign keys, and the pair IS the fact.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), primary_key=True
    )
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("task.id"), primary_key=True
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
