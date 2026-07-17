from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker, get_current_user
from app.models.all_models import User, Notification, AuditLog, NotificationReview
from app.schemas.all_schemas import NotificationResponse, NotificationGenerateRequest, UserDraftActionRequest, SavedGenerationSummary
from app.services.generation import generate_user_notifications
from typing import List, Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])

super_admin_required = RoleChecker(["super-admin"])
admin_required = RoleChecker(["super-admin", "admin"])

@router.get("/gemini-status")
def get_gemini_status():
    from app.core.config import settings
    has_key = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here")
    masked = None
    if has_key:
        k = settings.GEMINI_API_KEY
        masked = k[:6] + "..." + k[-4:] if len(k) > 10 else "..."
    return {"has_key": has_key, "masked_key": masked}

@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_recommendations(
    req: NotificationGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    user = db.query(User).filter(User.id == req.user_id, User.is_deleted == False).first()
    
    # Extract data if available
    req_name = req.user_data.get("Name", f"Citizen {req.user_id[:5]}") if req.user_data else f"Citizen {req.user_id[:5]}"
    req_age = None
    if req.user_data and req.user_data.get("Age"):
        try:
            req_age = int(req.user_data.get("Age"))
        except ValueError:
            pass
            
    if not user:
        # Create a stub user since mock data was deleted but frontend still requests generations for them
        user = User(
            id=req.user_id,
            email=f"mock_{req.user_id}@citizen.com",
            role="employee",
            name=req_name,
            age=req_age,
            hashed_password="mock"
        )
        db.add(user)
    else:
        # Update existing user if user_data is provided
        if req.user_data:
            user.name = req_name
            if req_age is not None:
                user.age = req_age
                
    from app.api.users import populate_user_from_csv
    populate_user_from_csv(user, req.user_id)
    db.commit()
        
    count = generate_user_notifications(user_id=req.user_id, db=db, creator_id=current_user.id, gemini_api_key=req.gemini_api_key, scores=req.scores, user_data=req.user_data)
    
    # Audit log
    audit = AuditLog(
        action="NOTIFICATION_GENERATE",
        user_id=current_user.id,
        details={"target_user_id": req.user_id, "notifications_created": count}
    )
    db.add(audit)
    db.commit()
    
    # Fetch newly generated notifications to return them in the response
    generated = db.query(Notification).filter(
        Notification.user_id == req.user_id
    ).order_by(Notification.generated_at.desc()).limit(count).all()
    
    return {
        "message": f"Successfully generated {count} recommendations for user.", 
        "count": count,
        "notifications": [NotificationResponse.model_validate(n) for n in reversed(generated)]
    }

@router.post("/regenerate", status_code=status.HTTP_200_OK)
def regenerate_recommendations(
    req: NotificationGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    user = db.query(User).filter(User.id == req.user_id, User.is_deleted == False).first()
    if not user:
        user = User(
            id=req.user_id,
            email=f"mock_{req.user_id}@citizen.com",
            role="employee",
            name=f"Citizen {req.user_id[:5]}",
            hashed_password="mock"
        )
        db.add(user)
        db.commit()
        
    from app.api.users import populate_user_from_csv
    populate_user_from_csv(user, req.user_id)
    db.commit()
        
    count = generate_user_notifications(user_id=req.user_id, db=db, creator_id=current_user.id, scores=req.scores, user_data=req.user_data)
    
    audit = AuditLog(
        action="NOTIFICATION_REGENERATE",
        user_id=current_user.id,
        details={"target_user_id": req.user_id, "notifications_regenerated": count}
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Successfully regenerated {count} recommendations for user.", "count": count}


@router.post("/save_drafts", status_code=status.HTTP_200_OK)
def save_drafts(
    req: UserDraftActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    drafts = db.query(Notification).filter(
        Notification.user_id == req.user_id,
        Notification.status == "DRAFT",
        Notification.is_deleted == False
    ).all()
    for notif in drafts:
        notif.status = "SAVED"
    db.commit()
    return {"message": f"Successfully saved {len(drafts)} drafts for user.", "count": len(drafts)}

@router.post("/send_to_review", status_code=status.HTTP_200_OK)
def send_to_review(
    req: UserDraftActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    saved = db.query(Notification).filter(
        Notification.user_id == req.user_id,
        Notification.status == "SAVED",
        Notification.is_deleted == False
    ).all()
    for notif in saved:
        notif.status = "PENDING_REVIEW"
        db.add(NotificationReview(notification_id=notif.id, status="PENDING_REVIEW"))
    db.commit()
    return {"message": f"Successfully sent {len(saved)} notifications to review queue.", "count": len(saved)}

@router.get("/saved_generations", response_model=List[SavedGenerationSummary])
def get_saved_generations(
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    # Fetch all users who have notifications in SAVED, PENDING_REVIEW, FLAGGED states
    users = db.query(User).join(Notification, User.id == Notification.user_id).filter(
        Notification.status.in_(["SAVED", "PENDING_REVIEW", "FLAGGED"]),
        Notification.is_deleted == False
    ).distinct().all()
    
    results = []
    for user in users:
        notifs = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.status.in_(["SAVED", "PENDING_REVIEW", "FLAGGED"]),
            Notification.is_deleted == False
        ).order_by(Notification.generated_at.desc()).all()
        
        if not notifs:
            continue
            
        # Determine aggregate status (if any flagged, it's FLAGGED. If any pending, it's PENDING_REVIEW. Else SAVED)
        statuses = [n.status for n in notifs]
        if "FLAGGED" in statuses:
            agg_status = "FLAGGED"
        elif "PENDING_REVIEW" in statuses:
            agg_status = "PENDING_REVIEW"
        else:
            agg_status = "SAVED"
            
        results.append(SavedGenerationSummary(
            user_id=user.id,
            name=user.name,
            age=user.age,
            status=agg_status,
            notifications_count=len(notifs),
            notifications=[NotificationResponse.model_validate(n) for n in notifs],
            gender=user.gender,
            state=user.state,
            district=user.district,
            pincode=user.pincode,
            education=user.education,
            occupation=user.occupation,
            income=user.income,
            marital_status=user.marital_status,
            house_ownership=user.house_ownership,
            caste_category=user.caste_category,
            disability_status=user.disability_status,
            mobile=user.mobile
        ))
    return results

@router.delete("/saved_generations/{user_id}", status_code=status.HTTP_200_OK)
def delete_saved_generations(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.status.in_(["SAVED", "PENDING_REVIEW", "FLAGGED", "DRAFT"]),
        Notification.is_deleted == False
    ).all()
    
    for n in notifs:
        n.is_deleted = True
        
    db.commit()
    return {"message": f"Successfully deleted {len(notifs)} generated notifications for user {user_id}."}

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id_filter: Optional[str] = Query(None, alias="user_id"),
    category_filter: Optional[str] = Query(None, alias="category")
):
    query = db.query(Notification).filter(Notification.is_deleted == False)
    
    # RBAC logic: Citizens can only see their own APPROVED or DELIVERED notifications.
    if current_user.role not in ["super-admin", "admin"]:
        query = query.filter(
            Notification.user_id == current_user.id,
            Notification.status.in_(["APPROVED", "DELIVERED", "QUEUED"])
        )
    else:
        # Admins can filter by user_id
        if user_id_filter:
            query = query.filter(Notification.user_id == user_id_filter)
        # Admins can filter by status
        if status_filter:
            query = query.filter(Notification.status.ilike(status_filter))
            
    if category_filter:
        query = query.filter(Notification.category.ilike(category_filter))
        
    # Order by generated_at desc
    query = query.order_by(Notification.generated_at.desc())
    return query.all()

@router.get("/{notif_id}", response_model=NotificationResponse)
def get_notification(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.is_deleted == False).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if current_user.role not in ["super-admin", "admin"] and notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this notification")
        
    return notif

@router.delete("/{notif_id}", status_code=status.HTTP_200_OK)
def delete_notification(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.is_deleted == False).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_deleted = True
    
    
    # Audit log
    audit = AuditLog(
        action="NOTIFICATION_DELETE",
        user_id=current_user.id,
        details={"notification_id": notif_id}
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification deleted successfully"}


@router.post("/{notif_id}/regenerate", status_code=status.HTTP_200_OK)
def regenerate_single_notification(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    from datetime import datetime
    
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.is_deleted == False).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    user = db.query(User).filter(User.id == notif.user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from app.services.personalization import personalize_notification_content
    clean_title = notif.title
    for prefix in ["Welfare: ", "Job: ", "Service: ", "Health: ", "Announcement: ", "Content: "]:
        if clean_title.startswith(prefix):
            clean_title = clean_title[len(prefix):]
            break
            
    new_content = personalize_notification_content(
        user,
        clean_title,
        notif.raw_content,
        notif.category,
        notif.eligibility_score,
        notif.reason_for_match,
        None
    )
    
    notif.personalized_content = new_content
    notif.status = "FLAGGED"
    notif.is_updated = True
    
    review = db.query(NotificationReview).filter(NotificationReview.notification_id == notif.id).first()
    if review:
        review.status = "FLAGGED"
        review.updated_at = datetime.utcnow()
    else:
        db.add(NotificationReview(notification_id=notif.id, status="FLAGGED"))
        
    audit = AuditLog(
        action="NOTIFICATION_REGENERATE_SINGLE",
        user_id=current_user.id,
        details={"notification_id": notif_id, "user_id": notif.user_id}
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification regenerated successfully", "personalized_content": new_content}


@router.post("/{notif_id}/send-to-admin", status_code=status.HTTP_200_OK)
def send_flagged_to_admin(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    from datetime import datetime
    
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.is_deleted == False).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.status = "PENDING_REVIEW"
    notif.updated_by = current_user.id
    
    review = db.query(NotificationReview).filter(NotificationReview.notification_id == notif.id).first()
    if review:
        review.status = "PENDING_REVIEW"
        review.updated_at = datetime.utcnow()
    else:
        db.add(NotificationReview(notification_id=notif.id, status="PENDING_REVIEW"))
        
    audit = AuditLog(
        action="NOTIFICATION_SEND_TO_ADMIN",
        user_id=current_user.id,
        details={"notification_id": notif_id, "user_id": notif.user_id}
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Notification successfully sent to admin review queue", "notification_id": notif_id}



