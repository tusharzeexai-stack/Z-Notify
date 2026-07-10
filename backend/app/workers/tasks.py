import time
from datetime import datetime
import logging
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.all_models import Notification, NotificationDelivery, User

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def send_notification_task(self, notification_id: str, channel: str):
    """
    Background worker simulating push, SMS, or WhatsApp message delivery.
    """
    logger.info(f"Starting delivery task for notification={notification_id} channel={channel}")
    db = SessionLocal()
    try:
        # 1. Fetch notification and user details
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if not notification:
            logger.error(f"Notification {notification_id} not found in database.")
            return f"Error: Notification {notification_id} not found"
            
        user = db.query(User).filter(User.id == notification.user_id).first()
        if not user:
            logger.error(f"User {notification.user_id} not found.")
            return f"Error: User {notification.user_id} not found"

        # 2. Check or create delivery log
        delivery = db.query(NotificationDelivery).filter(
            NotificationDelivery.notification_id == notification_id,
            NotificationDelivery.channel == channel
        ).first()
        
        if not delivery:
            delivery = NotificationDelivery(
                notification_id=notification_id,
                channel=channel,
                status="QUEUED"
            )
            db.add(delivery)
            db.flush()

        content = notification.personalized_content or notification.description
        destination = ""
        success = True
        err_msg = None

        # 3. Channel Dispatches
        if channel.upper() == "SMS":
            destination = user.mobile or "Unknown Mobile"
            logger.info(f"Simulating Twilio SMS dispatch to {destination}...")
            # Simulate latency
            time.sleep(0.5)
            if not user.mobile:
                success = False
                err_msg = "Twilio SMS failed: Missing mobile phone number in profile."
                
        elif channel.upper() == "FCM":
            destination = user.email or "Unknown FCM Token"
            logger.info(f"Simulating Firebase Push Notification to {destination}...")
            time.sleep(0.4)
            
        elif channel.upper() == "WHATSAPP":
            destination = user.mobile or "Unknown WhatsApp ID"
            logger.info(f"Simulating Meta Business WhatsApp API message to {destination}...")
            time.sleep(0.6)
            if not user.mobile:
                success = False
                err_msg = "WhatsApp dispatch failed: Mobile number missing."
        else:
            success = False
            err_msg = f"Unknown delivery channel: {channel}"

        # 4. Save Status
        if success:
            delivery.status = "DELIVERED"
            delivery.sent_at = datetime.utcnow()
            logger.info(f"Successfully sent notification={notification_id} to={destination} via={channel}")
            
            # If all queued dispatches are done, we can update overall status
            notification.status = "DELIVERED"
        else:
            delivery.status = "FAILED"
            delivery.error_message = err_msg
            delivery.retry_count += 1
            logger.warning(f"Failed sending notification={notification_id} error={err_msg}")
            
            if delivery.retry_count < 3:
                # Retry celery task
                logger.info(f"Retrying notification dispatch (attempt {delivery.retry_count})...")
                self.retry(countdown=5 * delivery.retry_count)
            else:
                notification.status = "FAILED"
                
        db.commit()
        return f"Status: {delivery.status} for channel {channel}"
        
    except Exception as exc:
        db.rollback()
        logger.error(f"Exception during celery dispatch task: {exc}")
        try:
            self.retry(exc=exc, countdown=10)
        except Exception:
            pass
        return f"Exception: {str(exc)}"
    finally:
        db.close()
