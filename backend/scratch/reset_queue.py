import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import Notification, NotificationReview, AdminComment
import sqlite3

DATABASE_URL = "sqlite:///./znotify.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_review_queue():
    db = SessionLocal()
    
    # Get all notifications that are in PENDING_REVIEW
    notifs = db.query(Notification).filter(Notification.status == "PENDING_REVIEW").all()
    count = 0
    for n in notifs:
        n.status = "SAVED"
        count += 1
        
    # Delete all pending reviews and their comments
    reviews = db.query(NotificationReview).filter(NotificationReview.status == "PENDING_REVIEW").all()
    review_count = 0
    for r in reviews:
        db.query(AdminComment).filter(AdminComment.review_id == r.id).delete()
        db.delete(r)
        review_count += 1
        
    db.commit()
    print(f"Reset {count} notifications to SAVED and deleted {review_count} review tasks.")
    db.close()

if __name__ == "__main__":
    reset_review_queue()
