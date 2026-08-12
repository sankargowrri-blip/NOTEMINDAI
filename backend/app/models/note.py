from __future__ import annotations
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum
from app.db.postgres import Base


class NoteStatus(str, enum.Enum):
    pending = "pending"
    enhancing = "enhancing"
    ocr_processing = "ocr_processing"
    refining = "refining"
    ready = "ready"
    error = "error"


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled Note")
    slug: Mapped[str] = mapped_column(String(300), nullable=True)
    status: Mapped[NoteStatus] = mapped_column(Enum(NoteStatus), default=NoteStatus.pending)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    original_file_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    enhanced_file_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    refined_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    formatted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    file_size_mb: Mapped[float] = mapped_column(Float, default=0.0)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_favourite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    semester: Mapped[str | None] = mapped_column(String(50), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(100), nullable=True)
    chapter: Mapped[str | None] = mapped_column(String(100), nullable=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship("User", back_populates="notes")  # noqa
    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="notes")  # noqa
    
    # Explicit relationships for cascade help if needed
    quizzes: Mapped[list["Quiz"]] = relationship("Quiz", back_populates="note", cascade="all, delete-orphan")
    attempts: Mapped[list["QuizAttempt"]] = relationship("QuizAttempt", back_populates="note", cascade="all, delete-orphan")
    flashcard_sets: Mapped[list["FlashcardSet"]] = relationship("FlashcardSet", back_populates="note", cascade="all, delete-orphan")


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    notes: Mapped[list["Note"]] = relationship("Note", back_populates="folder")
