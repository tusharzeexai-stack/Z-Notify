from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str
    source_url: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SchemeDocumentSchema(BaseModel):
    id: Optional[int] = None
    document_name: str

    model_config = ConfigDict(from_attributes=True)


class SchemeFAQSchema(BaseModel):
    id: Optional[int] = None
    question: str
    answer: str

    model_config = ConfigDict(from_attributes=True)


class SchemeBase(BaseModel):
    scheme_name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    eligibility: Optional[str] = None
    documents: Optional[str] = None
    application_process: Optional[str] = None
    official_url: Optional[str] = None
    application_url: Optional[str] = None
    ministry: Optional[str] = None
    department: Optional[str] = None
    state: Optional[str] = None
    tags: Optional[str] = None
    status: str = "active"
    source_url: Optional[str] = None

class SchemeCreate(SchemeBase):
    documents_list: List[str] = Field(default_factory=list)
    faqs_list: List[SchemeFAQSchema] = Field(default_factory=list)

class SchemeResponse(SchemeBase):
    id: str
    last_synced: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    scheme_documents: List[SchemeDocumentSchema] = Field(default_factory=list)
    scheme_faqs: List[SchemeFAQSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SchemeListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[SchemeResponse]


class SyncLogResponse(BaseModel):
    id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    category: str
    status: str
    records_processed: int
    records_updated: int
    records_failed: int
    duration: Optional[float] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SyncStatusResponse(BaseModel):
    enabled: bool
    interval_hours: int
    is_running: bool
    current_log_id: Optional[int] = None
    total_categories: int
    total_schemes: int
    active_schemes: int
    last_sync_time: Optional[datetime] = None
    last_status: str
    last_error: Optional[str] = None


class SyncTriggerRequest(BaseModel):
    category_slug: Optional[str] = None
    force: bool = False
