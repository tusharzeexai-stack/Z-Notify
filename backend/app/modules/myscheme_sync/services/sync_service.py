import asyncio
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.myscheme_sync.config.sync_config import sync_settings
from app.modules.myscheme_sync.crawler.playwright_crawler import crawler_instance
from app.modules.myscheme_sync.parser.scheme_parser import scheme_parser
from app.modules.myscheme_sync.repositories.scheme_repository import scheme_repository
from app.modules.myscheme_sync.models.sync_models import CategoryModel, SchemeModel
from app.modules.myscheme_sync.schemas.sync_schemas import SyncStatusResponse
from app.modules.myscheme_sync.utils.logger import sync_logger

class SyncService:
    def __init__(self):
        self.is_running: bool = False
        self.is_paused: bool = False
        self.current_log_id: Optional[int] = None
        self._sync_lock = asyncio.Lock()

    def get_sync_status(self, db: Session) -> SyncStatusResponse:
        scheme_repo = scheme_repository
        cats = db.query(CategoryModel).count()
        total_schemes = db.query(SchemeModel).count()
        active_schemes = db.query(SchemeModel).filter(SchemeModel.status == "active").count()
        
        latest_log = scheme_repo.get_latest_sync_log(db)
        last_sync_time = latest_log.finished_at if (latest_log and latest_log.finished_at) else (latest_log.started_at if latest_log else None)
        last_status = "running" if self.is_running else (latest_log.status if latest_log else "idle")
        last_error = latest_log.error_message if latest_log else None

        return SyncStatusResponse(
            enabled=sync_settings.SYNC_ENABLED,
            interval_hours=sync_settings.SYNC_INTERVAL_HOURS,
            is_running=self.is_running,
            current_log_id=self.current_log_id,
            total_categories=cats,
            total_schemes=total_schemes,
            active_schemes=active_schemes,
            last_sync_time=last_sync_time,
            last_status=last_status,
            last_error=last_error
        )

    async def run_sync(
        self,
        category_slug: Optional[str] = None,
        incremental: bool = False,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Runs synchronization engine asynchronously across configured categories.
        """
        if self.is_running and not force:
            sync_logger.warning("Sync request ignored: Synchronization process is already running.")
            return {"status": "error", "message": "Sync engine is already running."}

        async with self._sync_lock:
            self.is_running = True
            self.is_paused = False
            
            db = SessionLocal()
            log_record = None
            try:
                # Ensure baseline categories exist
                categories_map = scheme_repository.ensure_categories_exist(db)
                
                target_categories = []
                if category_slug:
                    cat = scheme_repository.get_category_by_slug(db, category_slug)
                    if cat:
                        target_categories.append(cat)
                else:
                    target_categories = scheme_repository.get_all_categories(db)

                sync_tag = category_slug.upper() if category_slug else ("INCREMENTAL" if incremental else "FULL")
                log_record = scheme_repository.create_sync_log(db, category=sync_tag)
                self.current_log_id = log_record.id

                sync_logger.info(f"Starting {sync_tag} Sync job (ID: {log_record.id})...")

                processed_count = 0
                updated_count = 0
                failed_count = 0

                await crawler_instance.initialize()

                for cat in target_categories:
                    if self.is_paused:
                        sync_logger.info("Sync job execution paused by admin request.")
                        break

                    sync_logger.info(f"Processing category: {cat.name} ({cat.slug})")
                    
                    # Discover scheme links
                    links = await crawler_instance.fetch_category_scheme_links(cat.source_url)
                    discovered_slugs = []

                    for item in links:
                        if self.is_paused:
                            break

                        scheme_url = item["url"]
                        slug = item["slug"]
                        discovered_slugs.append(slug)

                        # Skip unchanged records in incremental mode
                        if incremental:
                            existing = scheme_repository.get_scheme_by_id(db, slug)
                            if existing and (datetime.utcnow() - existing.last_synced).total_seconds() < (sync_settings.SYNC_INTERVAL_HOURS * 3600):
                                sync_logger.info(f"Skipping unchanged scheme in incremental mode: {slug}")
                                processed_count += 1
                                continue

                        try:
                            # Use fast metadata parser directly from v6 search engine result
                            parsed_scheme = scheme_parser.parse_from_meta(item, cat.id, cat.slug)

                            # Save to Database
                            _, is_new = scheme_repository.upsert_scheme(db, parsed_scheme)
                            
                            processed_count += 1
                            if not is_new:
                                updated_count += 1

                        except Exception as scheme_err:
                            db.rollback()
                            failed_count += 1
                            sync_logger.error(f"Failed processing scheme {scheme_url}: {scheme_err}")


                        # Update log progress periodically
                        scheme_repository.update_sync_log(
                            db, log_record.id, "running", processed_count, updated_count, failed_count
                        )

                    # Mark absent schemes inactive if full sync
                    if not incremental and not category_slug and discovered_slugs:
                        scheme_repository.mark_absent_schemes_inactive(db, cat.id, discovered_slugs)

                final_status = "paused" if self.is_paused else ("failed" if (failed_count > 0 and processed_count == 0) else "completed")
                scheme_repository.update_sync_log(
                    db, log_record.id, final_status, processed_count, updated_count, failed_count
                )
                
                sync_logger.info(f"Sync job {log_record.id} finished with status '{final_status}'. Processed: {processed_count}, Updated: {updated_count}, Failed: {failed_count}")
                return {
                    "status": "success",
                    "log_id": log_record.id,
                    "processed": processed_count,
                    "updated": updated_count,
                    "failed": failed_count
                }

            except Exception as e:
                db.rollback()
                err_msg = f"{type(e).__name__}: {str(e)}" if str(e).strip() else repr(e)
                sync_logger.exception(f"Fatal error during sync job {log_record.id if log_record else 'unknown'}: {err_msg}")
                if log_record:
                    scheme_repository.update_sync_log(
                        db, log_record.id, "failed", processed_count if 'processed_count' in locals() else 0, updated_count if 'updated_count' in locals() else 0, max(failed_count if 'failed_count' in locals() else 0, 1), error_message=err_msg
                    )
                return {"status": "error", "message": err_msg}

            finally:
                self.is_running = False
                self.current_log_id = None
                await crawler_instance.close()
                db.close()

    def pause_sync(self):
        if self.is_running:
            self.is_paused = True
            sync_logger.info("Pause flag set for active sync job.")
            return True
        return False

    def resume_sync(self):
        if self.is_paused:
            self.is_paused = False
            sync_logger.info("Resume flag set for sync job.")
            return True
        return False

sync_service = SyncService()
