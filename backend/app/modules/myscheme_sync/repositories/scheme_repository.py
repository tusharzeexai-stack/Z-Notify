from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from app.modules.myscheme_sync.models.sync_models import (
    CategoryModel, SchemeModel, SchemeDocumentModel, SchemeFAQModel, SyncLogModel
)
from app.modules.myscheme_sync.schemas.sync_schemas import SchemeCreate
from app.modules.myscheme_sync.config.sync_config import sync_settings
from app.modules.myscheme_sync.utils.logger import sync_logger

class SchemeRepository:

    def ensure_categories_exist(self, db: Session) -> Dict[str, CategoryModel]:
        """
        Ensures the 4 predefined categories exist in the database.
        Returns a dictionary mapping category key/slug to CategoryModel.
        """
        categories_map = {}
        for key, info in sync_settings.CATEGORIES.items():
            cat = db.query(CategoryModel).filter(CategoryModel.slug == info["slug"]).first()
            if not cat:
                cat = CategoryModel(
                    name=info["name"],
                    slug=info["slug"],
                    source_url=info["source_url"]
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)
                sync_logger.info(f"Initialized category: {cat.name} ({cat.slug})")
            categories_map[info["slug"]] = cat
            categories_map[key] = cat
        return categories_map

    def get_category_by_slug(self, db: Session, slug: str) -> Optional[CategoryModel]:
        return db.query(CategoryModel).filter(CategoryModel.slug == slug).first()

    def get_all_categories(self, db: Session) -> List[CategoryModel]:
        return db.query(CategoryModel).order_by(CategoryModel.id.asc()).all()

    def upsert_scheme(self, db: Session, scheme_in: SchemeCreate) -> Tuple[SchemeModel, bool]:
        """
        Inserts a new scheme or updates an existing scheme.
        Returns (SchemeModel, is_new).
        """
        existing = db.query(SchemeModel).filter(
            or_(SchemeModel.slug == scheme_in.slug, SchemeModel.source_url == scheme_in.source_url)
        ).first()

        s_title = scheme_in.scheme_name or "Government Welfare Scheme"
        s_agency = scheme_in.ministry or "Government Nodal Ministry"
        s_benefits = scheme_in.benefits or "Financial and social assistance as per government norms."
        s_eligibility = scheme_in.eligibility or "Open to eligible citizens matching category guidelines."
        s_desc = scheme_in.description or "Government welfare scheme information."

        if existing:
            # Update existing scheme attributes
            existing.scheme_name = s_title
            existing.title = s_title
            existing.agency = s_agency
            existing.benefit_details = s_benefits
            existing.eligibility_criteria = s_eligibility
            existing.category_id = scheme_in.category_id
            existing.description = s_desc
            existing.benefits = s_benefits
            existing.eligibility = s_eligibility
            existing.documents = scheme_in.documents
            existing.application_process = scheme_in.application_process
            existing.official_url = scheme_in.official_url
            existing.application_url = scheme_in.application_url
            existing.ministry = scheme_in.ministry
            existing.department = scheme_in.department
            existing.state = scheme_in.state
            existing.tags = scheme_in.tags
            existing.status = "active"
            existing.is_deleted = False
            existing.last_synced = datetime.utcnow()
            existing.updated_at = datetime.utcnow()
            
            # Refresh documents & FAQs
            db.query(SchemeDocumentModel).filter(SchemeDocumentModel.scheme_id == existing.id).delete()
            db.query(SchemeFAQModel).filter(SchemeFAQModel.scheme_id == existing.id).delete()

            for doc_name in scheme_in.documents_list:
                db.add(SchemeDocumentModel(scheme_id=existing.id, document_name=doc_name))

            for faq in scheme_in.faqs_list:
                db.add(SchemeFAQModel(scheme_id=existing.id, question=faq.question, answer=faq.answer))

            db.commit()
            db.refresh(existing)
            return existing, False

        else:
            # Insert new scheme
            new_scheme = SchemeModel(
                scheme_name=s_title,
                title=s_title,
                agency=s_agency,
                benefit_details=s_benefits,
                eligibility_criteria=s_eligibility,
                slug=scheme_in.slug,
                category_id=scheme_in.category_id,
                description=s_desc,
                benefits=s_benefits,
                eligibility=s_eligibility,
                documents=scheme_in.documents,
                application_process=scheme_in.application_process,
                official_url=scheme_in.official_url,
                application_url=scheme_in.application_url,
                ministry=scheme_in.ministry,
                department=scheme_in.department,
                state=scheme_in.state,
                tags=scheme_in.tags,
                status="active",
                is_deleted=False,
                source_url=scheme_in.source_url,
                last_synced=datetime.utcnow()
            )
            db.add(new_scheme)
            db.commit()
            db.refresh(new_scheme)

            for doc_name in scheme_in.documents_list:
                db.add(SchemeDocumentModel(scheme_id=new_scheme.id, document_name=doc_name))

            for faq in scheme_in.faqs_list:
                db.add(SchemeFAQModel(scheme_id=new_scheme.id, question=faq.question, answer=faq.answer))

            db.commit()
            db.refresh(new_scheme)
            return new_scheme, True

    def mark_absent_schemes_inactive(self, db: Session, category_id: int, active_slugs: List[str]):
        """
        Marks schemes belonging to a category as inactive if they were not present in active_slugs.
        """
        if active_slugs:
            db.query(SchemeModel).filter(
                SchemeModel.category_id == category_id,
                SchemeModel.slug.not_in(active_slugs)
            ).update({"status": "inactive"}, synchronize_session=False)
            db.commit()

    def search_schemes(
        self,
        db: Session,
        keyword: Optional[str] = None,
        category_slug: Optional[str] = None,
        state: Optional[str] = None,
        ministry: Optional[str] = None,
        eligibility: Optional[str] = None,
        sort_by: str = "newest",
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[SchemeModel], int]:
        """
        Full-Text & Multi-field search for schemes with pagination.
        """
        query = db.query(SchemeModel).filter(SchemeModel.status == "active")

        if category_slug:
            cat = self.get_category_by_slug(db, category_slug)
            if cat:
                query = query.filter(SchemeModel.category_id == cat.id)

        if keyword:
            term = f"%{keyword}%"
            query = query.filter(
                or_(
                    SchemeModel.scheme_name.ilike(term),
                    SchemeModel.description.ilike(term),
                    SchemeModel.benefits.ilike(term),
                    SchemeModel.eligibility.ilike(term),
                    SchemeModel.tags.ilike(term),
                    SchemeModel.ministry.ilike(term),
                    SchemeModel.state.ilike(term)
                )
            )

        if state and state.lower() != "all":
            query = query.filter(SchemeModel.state.ilike(f"%{state}%"))

        if ministry and ministry.lower() != "all":
            query = query.filter(SchemeModel.ministry.ilike(f"%{ministry}%"))

        if eligibility:
            query = query.filter(SchemeModel.eligibility.ilike(f"%{eligibility}%"))

        # Sorting
        if sort_by == "a-z":
            query = query.order_by(SchemeModel.scheme_name.asc())
        elif sort_by == "popular":
            query = query.order_by(SchemeModel.updated_at.desc(), SchemeModel.id.asc())
        else: # newest
            query = query.order_by(SchemeModel.created_at.desc())

        total = query.count()
        offset = (page - 1) * size
        items = query.offset(offset).limit(size).all()

        return items, total

    def get_scheme_by_id(self, db: Session, scheme_id: str) -> Optional[SchemeModel]:
        return db.query(SchemeModel).filter(SchemeModel.id == scheme_id).first()

    # Log operations
    def create_sync_log(self, db: Session, category: str = "ALL") -> SyncLogModel:
        log = SyncLogModel(
            started_at=datetime.utcnow(),
            category=category,
            status="running"
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def update_sync_log(
        self,
        db: Session,
        log_id: int,
        status: str,
        processed: int,
        updated: int,
        failed: int,
        error_message: Optional[str] = None
    ) -> SyncLogModel:
        log = db.query(SyncLogModel).filter(SyncLogModel.id == log_id).first()
        if log:
            log.status = status
            log.records_processed = processed
            log.records_updated = updated
            log.records_failed = failed
            log.finished_at = datetime.utcnow()
            log.duration = round((log.finished_at - log.started_at).total_seconds(), 2)
            if error_message is not None:
                log.error_message = str(error_message) if str(error_message).strip() else "Execution failed with unspecified exception."
            db.commit()
            db.refresh(log)
        return log

    def get_recent_sync_logs(self, db: Session, limit: int = 20) -> List[SyncLogModel]:
        return db.query(SyncLogModel).order_by(SyncLogModel.started_at.desc()).limit(limit).all()

    def get_latest_sync_log(self, db: Session) -> Optional[SyncLogModel]:
        return db.query(SyncLogModel).order_by(SyncLogModel.started_at.desc()).first()

    def mark_absent_schemes_inactive(self, db: Session, category_id: int, active_slugs: List[str]):
        """
        Marks schemes belonging to category_id as inactive if their slug is not in active_slugs.
        """
        if not active_slugs:
            return
        db.query(SchemeModel).filter(
            SchemeModel.category_id == category_id,
            SchemeModel.slug.notin_(active_slugs)
        ).update({"status": "inactive"}, synchronize_session=False)
        db.commit()

scheme_repository = SchemeRepository()
