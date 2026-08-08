from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
import enum
from app.db.postgres import Base


class FlashcardType(str, enum.Enum):
    standard = "standard"
    definition = "definition"
    formula = "formula"


class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Flashcard Set")
    card_type: Mapped[FlashcardType] = mapped_column(Enum(FlashcardType), default=FlashcardType.standard)
    cards: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FlashcardRecall(Base):
    __tablename__ = "flashcard_recalls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    card_index: Mapped[int] = mapped_column(Integer, nullable=False)
    known: Mapped[bool] = mapped_column(Boolean, default=False)
    recorded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
