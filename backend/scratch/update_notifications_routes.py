import re

filepath = r"d:\Z-Notify\backend\app\api\notifications.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "from app.schemas.all_schemas import NotificationResponse, NotificationGenerateRequest",
    "from app.schemas.all_schemas import NotificationResponse, NotificationGenerateRequest, UserDraftActionRequest, SavedGenerationSummary"
)

content = content.replace(
    "from app.models.all_models import User, Notification, AuditLog",
    "from app.models.all_models import User, Notification, AuditLog, NotificationReview"
)

# 2. Add new routes before list_notifications
new_routes = """
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
    users = db.query(User).join(Notification).filter(
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
            notifications=[NotificationResponse.model_validate(n) for n in notifs]
        ))
    return results
"""

content = content.replace(
    "@router.get(\"\", response_model=List[NotificationResponse])",
    new_routes + "\n@router.get(\"\", response_model=List[NotificationResponse])"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated notifications.py successfully.")
