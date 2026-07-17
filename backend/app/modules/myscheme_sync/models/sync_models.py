import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, Boolean, ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    schemes = relationship("SchemeModel", back_populates="category_rel", cascade="all, delete-orphan")


class SchemeModel(Base):
    __tablename__ = "schemes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scheme_name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=True)
    agency = Column(String(255), nullable=True)
    benefit_details = Column(Text, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)

    description = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)  # JSON or formatted markdown/text
    eligibility = Column(Text, nullable=True)  # JSON or formatted markdown/text
    documents = Column(Text, nullable=True)  # JSON or CSV list
    application_process = Column(Text, nullable=True)
    
    official_url = Column(String(500), nullable=True)
    application_url = Column(String(500), nullable=True)
    ministry = Column(String(255), nullable=True, index=True)
    department = Column(String(255), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    tags = Column(Text, nullable=True)
    
    status = Column(String(50), default="active", index=True)  # active, inactive
    is_deleted = Column(Boolean, default=False, nullable=False)
    source_url = Column(String(500), nullable=False, index=True)
    last_synced = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category_rel = relationship("CategoryModel", back_populates="schemes")
    scheme_documents = relationship("SchemeDocumentModel", back_populates="scheme_rel", cascade="all, delete-orphan")
    scheme_faqs = relationship("SchemeFAQModel", back_populates="scheme_rel", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_schemes_category_status", "category_id", "status"),
        Index("idx_schemes_state_ministry", "state", "ministry"),
        {"extend_existing": True}
    )


class SchemeDocumentModel(Base):
    __tablename__ = "scheme_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False)
    document_name = Column(Text, nullable=False)

    scheme_rel = relationship("SchemeModel", back_populates="scheme_documents")


class SchemeFAQModel(Base):
    __tablename__ = "scheme_faqs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    scheme_rel = relationship("SchemeModel", back_populates="scheme_faqs")


class SyncLogModel(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    category = Column(String(100), default="ALL")
    status = Column(String(50), default="running")  # running, completed, failed, paused
    records_processed = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    duration = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
