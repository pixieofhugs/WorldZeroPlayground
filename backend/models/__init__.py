# Import all models so Alembic can detect them via Base.metadata.
from models.faction import Faction
from models.account import Account, OAuthProvider
from models.roles import Role, AccountRole
from models.character import Character
from models.era import Era
from models.character_stats import CharacterStats
from models.task import Task, TaskFaction, CharacterTask
from models.submission import Submission, MediaItem
from models.vote import Vote
from models.flag import Flag
from models.relationship import Relationship
from models.message import Message
from models.meta_task import MetaTask, SubmissionMetaTask
from models.contact import ContactMessage
from models.taunt_message import TauntMessage

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
    "CharacterTask",
    "Submission",
    "MediaItem",
    "Vote",
    "Flag",
    "Relationship",
    "Message",
    "MetaTask",
    "SubmissionMetaTask",
    "ContactMessage",
    "TauntMessage",
]
