from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, AuditLog
from app.schemas.all_schemas import AuditLogResponse
from typing import List

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

super_admin_required = RoleChecker(["super-admin"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return logs
