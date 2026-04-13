from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.meta_task import MetaTask
from models.task import Task
from schemas.meta_task import MetaTaskOut

GENERIC_FACTION_SLUG = "na"

router = APIRouter()


@router.get("", response_model=list[MetaTaskOut])
async def list_meta_tasks(
    task_id: int,
    session: AsyncSession = Depends(get_db),
) -> list[MetaTaskOut]:
    """List meta tasks applicable to a given task (matching faction or generic)."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    result = await session.execute(
        select(MetaTask).where(
            or_(
                MetaTask.faction_slug == task.primary_faction_slug,
                MetaTask.faction_slug == GENERIC_FACTION_SLUG,
            )
        ).order_by(MetaTask.level_required.asc())
    )
    return [MetaTaskOut.model_validate(meta_task) for meta_task in result.scalars().all()]
