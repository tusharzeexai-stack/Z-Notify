from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, Notification, NotificationDelivery, AuditLog
from app.schemas.all_schemas import DeliverySendRequest, DeliveryResponse
from app.workers.tasks import send_notification_task
from typing import List

router = APIRouter(prefix="/delivery", tags=["delivery"])

admin_required = RoleChecker(["super-admin", "admin"])

@router.post("/send", status_code=status.HTTP_202_ACCEPTED)
def queue_notification_delivery(
    req: DeliverySendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    notif = db.query(Notification).filter(Notification.id == req.notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notif.status not in ["APPROVED", "DELIVERED", "FAILED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Notification must be APPROVED before dispatching. Current state: {notif.status}"
        )
        
    # 1. Update Notification state to QUEUED
    notif.status = "QUEUED"
    
    # 2. Add/Reset Delivery Table entry
    delivery = db.query(NotificationDelivery).filter(
        NotificationDelivery.notification_id == req.notification_id,
        NotificationDelivery.channel == req.channel
    ).first()
    
    if not delivery:
        delivery = NotificationDelivery(
            notification_id=req.notification_id,
            channel=req.channel,
            status="QUEUED",
            retry_count=0
        )
        db.add(delivery)
    else:
        delivery.status = "QUEUED"
        delivery.error_message = None
        delivery.retry_count = 0
        
    db.commit()
    db.refresh(delivery)
    
    # 3. Trigger Celery Task
    task = send_notification_task.delay(req.notification_id, req.channel)
    
    # 4. Audit Log
    audit = AuditLog(
        action="DELIVERY_DISPATCH",
        user_id=current_user.id,
        details={
            "notification_id": req.notification_id,
            "channel": req.channel,
            "celery_task_id": task.id
        }
    )
    db.add(audit)
    db.commit()
    
    return {
        "message": f"Dispatch job queued via Celery on channel: {req.channel}",
        "delivery_id": delivery.id,
        "task_id": task.id
    }

@router.get("/logs", response_model=List[DeliveryResponse])
def get_delivery_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Returns full delivery audit log for configuration screen.
    """
    logs = db.query(NotificationDelivery).order_by(NotificationDelivery.created_at.desc()).all()
    return logs
