# Import all models so Alembic can detect them via Base.metadata.
from models.faction import Faction
from models.account import Account, AccountTombstone, OAuthProvider
from models.roles import Role, AccountRole
from models.character import Character
from models.era import Era
from models.character_stats import CharacterStats
from models.task import Task, TaskStatus, TaskType
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
from models.praxis_room import PraxisRoomUpdate
from models.vote import Vote
from models.duel import Duel, DuelStatus
from models.flag import Flag
from models.comment import Comment, CommentMention
from models.relationship import Relationship
from models.character_block import CharacterBlock
from models.meta_task import PraxisMetaTask
from models.contact import ContactMessage
from models.taunt_message import TauntMessage
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.nudge import Nudge
from models.feed_dismissal import FeedDismissal
from models.terms_acceptance import TermsAcceptance

__all__ = [
    "Faction",
    "Account",
    "AccountTombstone",
    "OAuthProvider",
    "Role",
    "AccountRole",
    "Character",
    "Era",
    "CharacterStats",
    "Task",
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
    "PraxisRoomUpdate",
    "Vote",
    "Duel",
    "DuelStatus",
    "Flag",
    "Comment",
    "CommentMention",
    "Relationship",
    "CharacterBlock",
    "PraxisMetaTask",
    "ContactMessage",
    "TauntMessage",
    "FactionDefectionHistory",
    "InvitationLetter",
    "Nudge",
    "FeedDismissal",
    "TermsAcceptance",
]
