from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, Notification, NotificationReview, AdminComment, AuditLog
from app.schemas.all_schemas import ReviewAction, ReviewResponse
from datetime import datetime
from typing import List

router = APIRouter(prefix="/review", tags=["review"])

reviewer_required = RoleChecker(["super-admin", "admin"])

@router.get("/queue", response_model=List[ReviewResponse])
def get_review_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(reviewer_required)
):
    """
    Returns pending review tasks.
    """
    reviews = db.query(NotificationReview).join(Notification).filter(
        Notification.is_deleted == False
    ).order_by(NotificationReview.assigned_at.desc()).all()
    
    return reviews

@router.post("/approve")
def approve_notification(
    action: ReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(reviewer_required)
):
    notif = db.query(Notification).filter(Notification.id == action.notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    review = db.query(NotificationReview).filter(NotificationReview.notification_id == notif.id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review task not found")
        
    # Update state
    notif.status = "APPROVED"
    notif.updated_by = current_user.id
    
    if action.employee_id:
        emp = db.query(User).filter(User.id == action.employee_id, User.is_deleted == False).first()
        if not emp:
            raise HTTPException(status_code=400, detail="Employee not found")
        notif.user_id = action.employee_id
        
    review.status = "APPROVED"
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.utcnow()
    
    # Save optional comment
    if action.comment:
        comment_log = AdminComment(
            review_id=review.id,
            admin_id=current_user.id,
            comment=action.comment
        )
        db.add(comment_log)
        
    # Audit trail
    audit = AuditLog(
        action="REVIEW_APPROVE",
        user_id=current_user.id,
        details={"notification_id": notif.id, "employee_id": action.employee_id}
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification approved successfully", "notification_id": notif.id}

@router.post("/reject")
def reject_notification(
    action: ReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(reviewer_required)
):
    notif = db.query(Notification).filter(Notification.id == action.notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    review = db.query(NotificationReview).filter(NotificationReview.notification_id == notif.id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review task not found")
        
    # Update state
    notif.status = "REJECTED"
    notif.updated_by = current_user.id
    
    review.status = "REJECTED"
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.utcnow()
    
    # Save comment (required for rejection/flagging is good practice)
    if action.comment:
        comment_log = AdminComment(
            review_id=review.id,
            admin_id=current_user.id,
            comment=action.comment
        )
        db.add(comment_log)
        
    audit = AuditLog(
        action="REVIEW_REJECT",
        user_id=current_user.id,
        details={"notification_id": notif.id, "reason": action.comment}
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification rejected successfully", "notification_id": notif.id}

@router.post("/flag")
def flag_notification(
    action: ReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(reviewer_required)
):
    notif = db.query(Notification).filter(Notification.id == action.notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    review = db.query(NotificationReview).filter(NotificationReview.notification_id == notif.id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review task not found")
        
    # Update state
    notif.status = "FLAGGED"
    notif.priority = action.risk_level or "high" # Elevate priority on high risk
    notif.updated_by = current_user.id
    
    review.status = "FLAGGED"
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.utcnow()
    
    # Save comment
    if action.comment:
        comment_log = AdminComment(
            review_id=review.id,
            admin_id=current_user.id,
            comment=action.comment
        )
        db.add(comment_log)
        
    audit = AuditLog(
        action="REVIEW_FLAG",
        user_id=current_user.id,
        details={
            "notification_id": notif.id,
            "reason": action.comment,
            "risk_level": action.risk_level
        }
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification flagged successfully", "notification_id": notif.id}
