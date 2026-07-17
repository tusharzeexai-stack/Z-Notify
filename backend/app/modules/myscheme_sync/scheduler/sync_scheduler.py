import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.modules.myscheme_sync.config.sync_config import sync_settings
from app.modules.myscheme_sync.services.sync_service import sync_service
from app.modules.myscheme_sync.utils.logger import sync_logger

class SyncScheduler:
    def __init__(self):
        self.scheduler: AsyncIOScheduler = AsyncIOScheduler()
        self.is_started: bool = False

    def start(self):
        if not sync_settings.SYNC_ENABLED:
            sync_logger.info("Local sync scheduler disabled via SYNC_ENABLED=false setting.")
            return

        if not self.is_started:
            sync_logger.info(f"Starting APScheduler for myscheme_sync (Interval: {sync_settings.SYNC_INTERVAL_HOURS} hours)...")
            self.scheduler.add_job(
                self._scheduled_sync_job,
                "interval",
                hours=sync_settings.SYNC_INTERVAL_HOURS,
                id="myscheme_sync_job",
                replace_existing=True
            )
            self.scheduler.start()
            self.is_started = True
            sync_logger.info("APScheduler started successfully.")

    async def _scheduled_sync_job(self):
        sync_logger.info("APScheduler triggered scheduled background sync job.")
        await sync_service.run_sync(incremental=True)

    def shutdown(self):
        if self.is_started:
            sync_logger.info("Shutting down APScheduler for myscheme_sync...")
            self.scheduler.shutdown(wait=False)
            self.is_started = False
            sync_logger.info("APScheduler shut down complete.")

sync_scheduler = SyncScheduler()
