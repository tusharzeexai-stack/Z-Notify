import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.all_models import User

def clear_mock_data():
    db = SessionLocal()
    try:
        # Delete all employee users except john.doe
        deleted = db.query(User).filter(User.role == 'employee', User.email != 'john.doe@company.com').delete()
        db.commit()
        print(f"Successfully deleted {deleted} mock citizens from the database.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_mock_data()
