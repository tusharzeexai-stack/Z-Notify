from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# Auth
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "employee"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserAdminEdit(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None

# User Profile Demographics
class UserProfile(BaseModel):
    id: str
    email: str
    role: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    income: Optional[float] = None
    marital_status: Optional[str] = None
    house_ownership: Optional[str] = None
    caste_category: Optional[str] = None
    disability_status: Optional[str] = None
    mobile: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    income: Optional[float] = None
    marital_status: Optional[str] = None
    house_ownership: Optional[str] = None
    caste_category: Optional[str] = None
    disability_status: Optional[str] = None
    mobile: Optional[str] = None

# Eligibility weights
class RuleUpdate(BaseModel):
    state_weight: int
    district_weight: int
    income_weight: int
    age_weight: int
    occupation_weight: int

class RuleResponse(BaseModel):
    id: str
    state_weight: int
    district_weight: int
    income_weight: int
    age_weight: int
    occupation_weight: int
    is_active: bool

    class Config:
        from_attributes = True

# Items
class SchemeCreate(BaseModel):
    title: str
    description: str
    agency: str
    benefit_details: Optional[str] = None
    eligibility_criteria: Dict[str, Any]

class SchemeResponse(BaseModel):
    id: str
    title: str
    description: str
    agency: str
    benefit_details: Optional[str] = None
    eligibility_criteria: Dict[str, Any]

    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    sl_no: str
    job_type: Optional[str] = None
    job_category: Optional[str] = None
    job_subcategory: Optional[str] = None
    education_qualification: Optional[str] = None
    occupation: Optional[str] = None
    job_role_position: Optional[str] = None
    name_of_company_person: Optional[str] = None
    salary_range: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    exp_required: Optional[str] = None
    job_contact_number: Optional[str] = None
    job_contact_email: Optional[str] = None
    job_url: Optional[str] = None
    mode_of_contact: Optional[str] = None
    expiry_date: Optional[str] = None
    user_id_ref: Optional[str] = None
    status: Optional[str] = None
    reason_for_rejection: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    sl_no: str
    job_type: Optional[str] = None
    job_category: Optional[str] = None
    job_subcategory: Optional[str] = None
    education_qualification: Optional[str] = None
    occupation: Optional[str] = None
    job_role_position: Optional[str] = None
    name_of_company_person: Optional[str] = None
    salary_range: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    exp_required: Optional[str] = None
    job_contact_number: Optional[str] = None
    job_contact_email: Optional[str] = None
    job_url: Optional[str] = None
    mode_of_contact: Optional[str] = None
    expiry_date: Optional[str] = None
    user_id_ref: Optional[str] = None
    status: Optional[str] = None
    reason_for_rejection: Optional[str] = None

    class Config:
        from_attributes = True

class ServiceCreate(BaseModel):
    title: str
    description: str
    department: str
    eligibility_criteria: Dict[str, Any]

class ServiceResponse(BaseModel):
    id: str
    title: str
    description: str
    department: str
    eligibility_criteria: Dict[str, Any]

    class Config:
        from_attributes = True

class MedicalFacilityCreate(BaseModel):
    name: str
    type: str
    location: str
    services_offered: Dict[str, Any]

class MedicalFacilityResponse(BaseModel):
    id: str
    name: str
    type: str
    location: str
    services_offered: Dict[str, Any]

    class Config:
        from_attributes = True

# Notifications
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    citizen_id: Optional[str] = None
    title: str
    description: str
    raw_content: Optional[str] = None
    personalized_content: Optional[str] = None
    category: str
    priority: str
    eligibility_score: float
    reason_for_match: Optional[str] = None
    source: str
    status: str
    generated_at: datetime
    is_updated: bool

    class Config:
        from_attributes = True

class NotificationGenerateRequest(BaseModel):
    user_id: str
    gemini_api_key: Optional[str] = None
    scores: Optional[Dict[str, float]] = None
    user_data: Optional[Dict[str, Any]] = None

class UserDraftActionRequest(BaseModel):
    user_id: str

class SavedGenerationSummary(BaseModel):
    user_id: str
    name: str
    age: Optional[int]
    status: str
    notifications_count: int
    notifications: List[NotificationResponse]
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    income: Optional[float] = None
    marital_status: Optional[str] = None
    house_ownership: Optional[str] = None
    caste_category: Optional[str] = None
    disability_status: Optional[str] = None
    mobile: Optional[str] = None

# Reviews
class ReviewAction(BaseModel):
    notification_id: str
    comment: Optional[str] = None
    risk_level: Optional[str] = "medium"
    employee_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    review_id: str
    admin_id: str
    comment: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: str
    notification_id: str
    reviewer_id: Optional[str]
    status: str
    assigned_at: datetime
    reviewed_at: Optional[datetime]
    notification: NotificationResponse
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True

# Deliveries
class DeliverySendRequest(BaseModel):
    notification_id: str
    channel: str  # FCM, SMS, WhatsApp

class DeliveryResponse(BaseModel):
    id: str
    notification_id: str
    channel: str
    status: str
    retry_count: int
    error_message: Optional[str]
    sent_at: Optional[datetime]

    class Config:
        from_attributes = True

# Audit Trail
class AuditLogResponse(BaseModel):
    id: str
    action: str
    user_id: Optional[str]
    details: Optional[Dict[str, Any]]
    timestamp: datetime

    class Config:
        from_attributes = True

# Analytics Dashboard response
class AnalyticsDashboardResponse(BaseModel):
    total_users: int
    notifications_generated: int
    pending_reviews: int
    approved: int
    rejected: int
    flagged: int
    delivered: int
    
    # Graphs data
    daily_volume: List[Dict[str, Any]]
    approval_rate: float
    delivery_rate: float
    category_distribution: List[Dict[str, Any]]
    top_schemes: List[Dict[str, Any]]
    top_jobs: List[Dict[str, Any]]
    district_analytics: List[Dict[str, Any]]
