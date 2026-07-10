from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, Notification, NotificationReview, NotificationDelivery
from app.schemas.all_schemas import AnalyticsDashboardResponse
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

admin_required = RoleChecker(["super-admin", "admin"])

@router.get("", response_model=AnalyticsDashboardResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Counts
    total_users = db.query(User).filter(User.is_deleted == False, User.role == "employee").count()
    total_notif = db.query(Notification).filter(Notification.is_deleted == False).count()
    
    pending = db.query(Notification).filter(Notification.is_deleted == False, Notification.status == "PENDING_REVIEW").count()
    approved = db.query(Notification).filter(Notification.is_deleted == False, Notification.status == "APPROVED").count()
    rejected = db.query(Notification).filter(Notification.is_deleted == False, Notification.status == "REJECTED").count()
    flagged = db.query(Notification).filter(Notification.is_deleted == False, Notification.status == "FLAGGED").count()
    delivered = db.query(Notification).filter(Notification.is_deleted == False, Notification.status == "DELIVERED").count()

    # Graphs
    # 1. Daily volume trend (past 14 days)
    daily_volume = []
    today = datetime.utcnow().date()
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count_success = db.query(Notification).filter(
            Notification.is_deleted == False,
            Notification.status == "DELIVERED",
            Notification.generated_at >= datetime.combine(day, datetime.min.time()),
            Notification.generated_at < datetime.combine(next_day, datetime.min.time())
        ).count()
        count_failed = db.query(Notification).filter(
            Notification.is_deleted == False,
            Notification.status == "FAILED",
            Notification.generated_at >= datetime.combine(day, datetime.min.time()),
            Notification.generated_at < datetime.combine(next_day, datetime.min.time())
        ).count()
        daily_volume.append({
            "date": day.strftime("%b %d"),
            "success": count_success,
            "failed": count_failed
        })

    # Rates
    total_reviewed = approved + rejected + flagged
    approval_rate = round((approved / total_reviewed) * 100.0, 1) if total_reviewed > 0 else 0.0
    
    total_delivery_attempts = db.query(NotificationDelivery).count()
    total_delivery_success = db.query(NotificationDelivery).filter(NotificationDelivery.status == "DELIVERED").count()
    delivery_rate = round((total_delivery_success / total_delivery_attempts) * 100.0, 1) if total_delivery_attempts > 0 else 0.0

    # Category distribution
    cat_data = db.query(
        Notification.category,
        func.count(Notification.id)
    ).filter(Notification.is_deleted == False).group_by(Notification.category).all()
    
    category_distribution = []
    colors = ["#e088ff", "#cc88ee", "#4edea3", "#007650", "#e8aaff", "#ffb4ab"]
    for idx, (cat, count) in enumerate(cat_data):
        category_distribution.append({
            "name": cat,
            "value": count,
            "color": colors[idx % len(colors)]
        })

    # Top schemes/jobs matched
    top_schemes_query = db.query(
        Notification.title,
        func.count(Notification.id)
    ).filter(Notification.is_deleted == False, Notification.category == "Welfare").group_by(Notification.title).order_by(func.count(Notification.id).desc()).limit(5).all()
    
    top_schemes = [{"name": title.replace("Welfare: ", ""), "matches": count} for title, count in top_schemes_query]

    top_jobs_query = db.query(
        Notification.title,
        func.count(Notification.id)
    ).filter(Notification.is_deleted == False, Notification.category == "Employment").group_by(Notification.title).order_by(func.count(Notification.id).desc()).limit(5).all()
    top_jobs = [{"name": title.replace("Job: ", ""), "matches": count} for title, count in top_jobs_query]

    # District Analytics
    district_query = db.query(
        User.district,
        func.count(Notification.id)
    ).join(Notification, User.id == Notification.user_id).filter(
        User.is_deleted == False,
        Notification.is_deleted == False
    ).group_by(User.district).order_by(func.count(Notification.id).desc()).limit(6).all()
    
    district_analytics = [{"district": dist or "Unknown", "notifications": count} for dist, count in district_query]

    return {
        "total_users": total_users,
        "notifications_generated": total_notif,
        "pending_reviews": pending,
        "approved": approved,
        "rejected": rejected,
        "flagged": flagged,
        "delivered": delivered,
        "daily_volume": daily_volume,
        "approval_rate": approval_rate,
        "delivery_rate": delivery_rate,
        "category_distribution": category_distribution,
        "top_schemes": top_schemes,
        "top_jobs": top_jobs,
        "district_analytics": district_analytics
    }
