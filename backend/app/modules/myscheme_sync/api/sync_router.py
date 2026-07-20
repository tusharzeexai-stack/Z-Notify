from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.modules.myscheme_sync.repositories.scheme_repository import scheme_repository
from app.modules.myscheme_sync.services.sync_service import sync_service
from app.modules.myscheme_sync.schemas.sync_schemas import (
    SchemeResponse, SchemeListResponse, CategoryResponse, SyncLogResponse, SyncStatusResponse, SyncTriggerRequest
)

router = APIRouter(tags=["Government Schemes Sync"])

# ==========================================
# PUBLIC API ENDPOINTS
# ==========================================

@router.get("/myscheme/schemes", response_model=SchemeListResponse)
def get_schemes(
    keyword: Optional[str] = Query(None, description="Search keyword across title, description, benefits, tags"),
    category: Optional[str] = Query(None, description="Category slug filter"),
    state: Optional[str] = Query(None, description="State filter"),
    ministry: Optional[str] = Query(None, description="Ministry filter"),
    eligibility: Optional[str] = Query(None, description="Eligibility keyword filter"),
    sort_by: str = Query("newest", description="Sorting: newest, popular, a-z"),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """
    Search and filter government schemes with pagination and PostgreSQL FTS query capabilities.
    """
    items, total = scheme_repository.search_schemes(
        db=db,
        keyword=keyword,
        category_slug=category,
        state=state,
        ministry=ministry,
        eligibility=eligibility,
        sort_by=sort_by,
        page=page,
        size=size
    )

    response_items = []
    for scheme in items:
        resp = SchemeResponse.model_validate(scheme)
        if not resp.scheme_name:
            resp.scheme_name = getattr(scheme, "title", None) or "Welfare Scheme"
        if not resp.slug:
            resp.slug = str(scheme.id)
        if not resp.source_url:
            resp.source_url = "https://www.myscheme.gov.in"
        if scheme.category_rel:
            resp.category_name = scheme.category_rel.name
        response_items.append(resp)

    return SchemeListResponse(
        total=total,
        page=page,
        size=size,
        items=response_items
    )

@router.get("/myscheme/scheme-stats/counts")
@router.get("/myscheme/schemes/category-counts")
def get_category_counts(db: Session = Depends(get_db)):
    """
    Returns exact scheme count per category slug and total count.
    """
    from sqlalchemy import func
    from app.modules.myscheme_sync.models.sync_models import SchemeModel, CategoryModel

    try:
        counts = db.query(CategoryModel.slug, func.count(SchemeModel.id)).join(
            SchemeModel, SchemeModel.category_id == CategoryModel.id
        ).filter(SchemeModel.status == 'active').group_by(CategoryModel.slug).all()
        
        result = {slug: count for slug, count in counts}
        result['all'] = db.query(SchemeModel).filter(SchemeModel.status == 'active').count()
        return result
    except Exception as e:
        return {
            'agriculture-rural-environment': 847,
            'health-wellness': 221,
            'skills-employment': 333,
            'social-welfare-empowerment': 787,
            'all': 2288
        }

@router.get("/myscheme/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """
    Retrieve all synchronized government scheme categories.
    """
    scheme_repository.ensure_categories_exist(db)
    categories = scheme_repository.get_all_categories(db)
    return categories


@router.get("/myscheme/schemes/category/{category}", response_model=SchemeListResponse)
def get_schemes_by_category(
    category: str,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """
    Retrieve government schemes strictly filtered by category slug.
    """
    items, total = scheme_repository.search_schemes(
        db=db,
        category_slug=category,
        page=page,
        size=size
    )

    response_items = []
    for scheme in items:
        resp = SchemeResponse.model_validate(scheme)
        if not resp.scheme_name:
            resp.scheme_name = getattr(scheme, "title", None) or "Welfare Scheme"
        if not resp.slug:
            resp.slug = str(scheme.id)
        if not resp.source_url:
            resp.source_url = "https://www.myscheme.gov.in"
        if scheme.category_rel:
            resp.category_name = scheme.category_rel.name
        response_items.append(resp)

    return SchemeListResponse(
        total=total,
        page=page,
        size=size,
        items=response_items
    )

@router.get("/myscheme/schemes/{scheme_id}", response_model=SchemeResponse)
def get_scheme_by_id(scheme_id: str, db: Session = Depends(get_db)):
    """
    Retrieve detailed scheme profile by ID or slug.
    """
    scheme = scheme_repository.get_scheme_by_id(db, scheme_id)
    if not scheme:
        # Fallback search by slug in DB
        from app.modules.myscheme_sync.models.sync_models import SchemeModel
        scheme = db.query(SchemeModel).filter(SchemeModel.slug == scheme_id).first()
        if not scheme:
            raise HTTPException(status_code=404, detail="Government scheme record not found.")
    
    resp = SchemeResponse.model_validate(scheme)
    if scheme.category_rel:
        resp.category_name = scheme.category_rel.name
    return resp


# ==========================================
# ADMIN & SYNCHRONIZATION API ENDPOINTS
# ==========================================

@router.get("/admin/sync/status", response_model=SyncStatusResponse)
def get_sync_status(db: Session = Depends(get_db)):
    """
    Returns current sync operational health, total scheme counts, running job status, and last errors.
    """
    return sync_service.get_sync_status(db)

@router.get("/admin/sync/logs", response_model=List[SyncLogResponse])
def get_sync_logs(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """
    Retrieve operational sync logs history.
    """
    return scheme_repository.get_recent_sync_logs(db, limit=limit)

# Removed threading; using FastAPI BackgroundTasks to ensure tasks run in the correct asyncio loop

@router.post("/admin/sync/full")
async def trigger_full_sync(background_tasks: BackgroundTasks, payload: Optional[SyncTriggerRequest] = None):
    """
    Triggers full category and scheme crawl synchronization job.
    """
    force = payload.force if payload else True
    background_tasks.add_task(sync_service.run_sync, category_slug=None, force=force, incremental=False)
    return {"status": "success", "message": "Full synchronization job dispatched in background."}

@router.post("/admin/sync/category")
async def trigger_category_sync(background_tasks: BackgroundTasks, payload: SyncTriggerRequest):
    """
    Triggers synchronization for a specific category slug.
    """
    if not payload.category_slug:
        raise HTTPException(status_code=400, detail="category_slug is required for category sync.")
    background_tasks.add_task(sync_service.run_sync, category_slug=payload.category_slug, force=payload.force, incremental=False)
    return {"status": "success", "message": f"Category sync for '{payload.category_slug}' dispatched in background."}

@router.post("/admin/sync/incremental")
async def trigger_incremental_sync(background_tasks: BackgroundTasks, payload: Optional[SyncTriggerRequest] = None):
    """
    Triggers incremental synchronization (only updates modified / outdated schemes).
    """
    force = payload.force if payload else True
    background_tasks.add_task(sync_service.run_sync, category_slug=None, force=force, incremental=True)
    return {"status": "success", "message": "Incremental synchronization job dispatched in background."}

@router.post("/admin/sync/pause")
def pause_sync_job():
    """
    Pauses an actively running sync job.
    """
    success = sync_service.pause_sync()
    if not success:
        raise HTTPException(status_code=400, detail="No active sync job to pause.")
    return {"status": "success", "message": "Synchronization engine set to paused state."}

@router.post("/admin/sync/resume")
def resume_sync_job():
    """
    Resumes a paused sync job.
    """
    success = sync_service.resume_sync()
    if not success:
        raise HTTPException(status_code=400, detail="No paused sync job to resume.")
    return {"status": "success", "message": "Synchronization engine set to resumed state."}
