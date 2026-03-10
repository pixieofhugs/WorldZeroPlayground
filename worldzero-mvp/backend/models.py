from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    google_id = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    characters = relationship("Character", back_populates="account")
    votes = relationship("Vote", back_populates="voter_account")


class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    username = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    level = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    all_time_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    account = relationship("Account", back_populates="characters")
    task_signups = relationship("CharacterTask", back_populates="character")
    submissions = relationship("Submission", back_populates="character")
    votes_cast = relationship("Vote", back_populates="voter_character")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    point_value = Column(Integer, nullable=False)
    level_required = Column(Integer, default=0)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    signups = relationship("CharacterTask", back_populates="task")
    submissions = relationship("Submission", back_populates="task")


class CharacterTask(Base):
    __tablename__ = "character_tasks"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    signed_up_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="in_progress")

    character = relationship("Character", back_populates="task_signups")
    task = relationship("Task", back_populates="signups")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    title = Column(String, nullable=False)
    body_text = Column(Text, nullable=False)
    score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = relationship("Task", back_populates="submissions")
    character = relationship("Character", back_populates="submissions")
    votes = relationship("Vote", back_populates="submission")


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    voter_character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    voter_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    stars = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("submission_id", "voter_character_id", name="uq_vote_per_character"),
    )

    submission = relationship("Submission", back_populates="votes")
    voter_character = relationship("Character", back_populates="votes_cast")
    voter_account = relationship("Account", back_populates="votes")
