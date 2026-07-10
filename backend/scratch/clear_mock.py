import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import Notification, NotificationReview, User, NotificationBucket, AdminComment
import sqlite3

DATABASE_URL = "sqlite:///./znotify.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def clear_mock_reviews():
    db = SessionLocal()
    
    reviews = db.query(NotificationReview).all()
    count = 0
    for r in reviews:
        notif = db.query(Notification).filter(Notification.id == r.notification_id).first()
        if notif:
            user = db.query(User).filter(User.id == notif.user_id).first()
            if user and (user.email == 'john.doe@company.com' or 'mock' in user.email):
                # Delete buckets
                db.query(NotificationBucket).filter(NotificationBucket.notification_id == notif.id).delete()
                # Delete comments
                db.query(AdminComment).filter(AdminComment.review_id == r.id).delete()
                # Delete review
                db.delete(r)
                # Delete notification
                db.delete(notif)
                count += 1
                
    db.commit()
    print(f"Deleted {count} mock reviews, buckets, comments, and notifications.")
    db.close()

if __name__ == "__main__":
    clear_mock_reviews()
