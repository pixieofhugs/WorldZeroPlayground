from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.task import TaskStatus, TaskType


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: int
    title: str
    description: str
    point_value: int
    level_required: int
    status: TaskStatus
    task_type: TaskType
    created_by: int
    primary_faction_slug: str
    metatask_faction_slug: Optional[str] = None
    is_task_vision_eligible: bool
    created_at: datetime
    # Derived, read-time count of characters actively working on this task —
    # active-signup population (Praxis.status in [in_progress, pending]), the
    # same set GET /tasks/{id}/signups exposes, reduced to a count (#1021).
    # Populated by services.task.build_task_out(_for_viewer). Defaults to 0
    # because TaskOut.model_validate() is also used directly on metatask rows
    # (the praxis seal stack — services/praxis.py's applied_metatasks_for),
    # which have no such attribute on the Task ORM object; 0 is also the true
    # value there since metatasks are never signup targets (evaluate_signup
    # rejects TaskType.metatask before any status check).
    in_progress_count: int = 0
    # Viewer-relative capability flags — populated by the task router using
    # the authenticated viewer's character. Defaults keep the flags safe for
    # unauthenticated callers (empty modes, cannot submit, not eligible).
    can_submit_praxis: bool = False
    allowed_modes: list[str] = []
    eligible_for_current_user: bool = False


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    point_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
    primary_faction_slug: Optional[str] = None
    # Metatask fields — optional; defaults to a standard task.
    task_type: Optional[str] = None
    metatask_faction_slug: Optional[str] = None


class CharacterTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task: TaskOut
    status: str
    signed_up_at: datetime


class TaskSignupOut(BaseModel):
    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    status: str
    signed_up_at: datetime
