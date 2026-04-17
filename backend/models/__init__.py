# Import all models so Alembic can detect them via Base.metadata.
from models.faction import Faction
from models.account import Account, OAuthProvider
from models.roles import Role, AccountRole
from models.character import Character
from models.era import Era
from models.character_stats import CharacterStats
from models.task import Task, TaskFaction, TaskStatus, TaskType
from models.praxis import (
    Praxis,
    PraxisMember,
    PraxisInvite,
    MediaItem,
    PraxisType,
    PraxisStatus,
    PraxisInviteStatus,
    MediaType,
    ModerationStatus,
)
from models.vote import Vote
from models.flag import Flag
from models.relationship import Relationship
from models.message import Message
from models.meta_task import PraxisMetaTask
from models.contact import ContactMessage
from models.taunt_message import TauntMessage
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.analog_double_dipper import AnalogDoubleDipper

__all__ = [
    "Faction",
    "Account",
    "OAuthProvider",
    "Role",
    "AccountRole",
    "Character",
    "Era",
    "CharacterStats",
    "Task",
    "TaskFaction",
    "TaskStatus",
    "TaskType",
    "Praxis",
    "PraxisMember",
    "PraxisInvite",
    "MediaItem",
    "PraxisType",
    "PraxisStatus",
    "PraxisInviteStatus",
    "MediaType",
    "ModerationStatus",
    "Vote",
    "Flag",
    "Relationship",
    "Message",
    "PraxisMetaTask",
    "ContactMessage",
    "TauntMessage",
    "FactionDefectionHistory",
    "InvitationLetter",
    "AnalogDoubleDipper",
]
