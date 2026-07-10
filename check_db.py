import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.core.database import SessionLocal
from app.models.all_models import Notification, NotificationBucket, User

def main():
    db = SessionLocal()
    try:
        notifs = db.query(Notification).all()
        print(f"Total Notifications: {len(notifs)}")
        for n in notifs:
            print(f"ID: {n.id} | Title: {n.title[:40]} | UserID: {n.user_id} | CitizenID: {n.citizen_id} | Status: {n.status}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
