import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

class AuditMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class User(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(String(50), default="employee", nullable=False)  # super-admin, admin, employee
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Demographics
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)
    state = Column(String(255), index=True, nullable=True)
    district = Column(String(255), index=True, nullable=True)
    pincode = Column(String(20), nullable=True)
    education = Column(String(255), nullable=True)
    occupation = Column(String(255), nullable=True)
    income = Column(Float, nullable=True)
    marital_status = Column(String(50), nullable=True)
    house_ownership = Column(String(100), nullable=True)
    caste_category = Column(String(100), nullable=True)
    disability_status = Column(String(100), nullable=True)
    mobile = Column(String(50), nullable=True)
    
    # Relationships
    notifications = relationship("Notification", foreign_keys="[Notification.user_id]", back_populates="user")
    reviews = relationship("NotificationReview", foreign_keys="[NotificationReview.reviewer_id]", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="user")

class Scheme(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "schemes"
    __table_args__ = {"extend_existing": True}
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    agency = Column(String(255), nullable=True)
    benefit_details = Column(Text, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)  # String or JSON matching criteria

class Job(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    department = Column(String(255), nullable=False)
    salary = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    eligibility_criteria = Column(JSON, nullable=False)

class Service(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "services"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    department = Column(String(255), nullable=False)
    eligibility_criteria = Column(JSON, nullable=False)

class MedicalFacility(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "medical_facilities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    services_offered = Column(JSON, nullable=False)

class EligibilityRule(Base, AuditMixin):
    __tablename__ = "eligibility_rules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    state_weight = Column(Integer, default=30)
    district_weight = Column(Integer, default=20)
    income_weight = Column(Integer, default=20)
    age_weight = Column(Integer, default=15)
    occupation_weight = Column(Integer, default=15)
    is_active = Column(Boolean, default=True)

class Notification(Base, SoftDeleteMixin, AuditMixin):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    citizen_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    raw_content = Column(Text, nullable=True)
    personalized_content = Column(Text, nullable=True)
    category = Column(String(100), index=True, nullable=False)
    priority = Column(String(50), default="medium", nullable=False)  # low, medium, high, critical
    eligibility_score = Column(Float, nullable=False)
    reason_for_match = Column(Text, nullable=True)
    source = Column(String(255), nullable=False)  # scheme, job, service, medical
    status = Column(String(50), default="GENERATED", index=True, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_updated = Column(Boolean, default=False, nullable=False)
    
    # Audit trail trackers
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    review = relationship("NotificationReview", back_populates="notification", uselist=False)
    buckets = relationship("NotificationBucket", back_populates="notification")
    deliveries = relationship("NotificationDelivery", back_populates="notification")

class NotificationReview(Base, AuditMixin):
    __tablename__ = "notification_reviews"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    notification_id = Column(String(36), ForeignKey("notifications.id"), unique=True, nullable=False)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="PENDING_REVIEW", index=True, nullable=False)  # PENDING_REVIEW, APPROVED, REJECTED, FLAGGED
    assigned_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    notification = relationship("Notification", back_populates="review")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews")
    comments = relationship("AdminComment", back_populates="review")

class NotificationBucket(Base, AuditMixin):
    __tablename__ = "notification_buckets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    notification_id = Column(String(36), ForeignKey("notifications.id"), nullable=False)
    bucket_name = Column(String(100), index=True, nullable=False)
    
    # Relationship
    notification = relationship("Notification", back_populates="buckets")

class NotificationDelivery(Base, AuditMixin):
    __tablename__ = "notification_delivery"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    notification_id = Column(String(36), ForeignKey("notifications.id"), nullable=False)
    channel = Column(String(50), nullable=False)  # FCM, SMS, WhatsApp
    status = Column(String(50), default="QUEUED", index=True, nullable=False)  # QUEUED, DELIVERED, FAILED
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    
    # Relationship
    notification = relationship("Notification", back_populates="deliveries")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    action = Column(String(255), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    details = Column(JSON, nullable=True)  # Store old/new version data
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    user = relationship("User", back_populates="audit_logs")

class AdminComment(Base, AuditMixin):
    __tablename__ = "admin_comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    review_id = Column(String(36), ForeignKey("notification_reviews.id"), nullable=False)
    admin_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    review = relationship("NotificationReview", back_populates="comments")

class UserActivity(Base):
    __tablename__ = "user_activity"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    event_type = Column(String(100), nullable=False)  # login, read, dismiss
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    metric_name = Column(String(100), index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
