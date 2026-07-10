import re

filepath = r"d:\Z-Notify\backend\app\services\generation.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Clear DRAFT notifications as well during regeneration
content = content.replace('["GENERATED", "PENDING_REVIEW"]', '["DRAFT", "GENERATED", "PENDING_REVIEW"]')

# 2. Remove NotificationReview addition in add_notification
content = re.sub(r'^\s*db\.add\(NotificationReview\(notification_id=notif\.id, status="PENDING_REVIEW"\)\)\n', '', content, flags=re.MULTILINE)

# 3. Change status="PENDING_REVIEW" to status="DRAFT" when instantiating Notification
content = content.replace('status="PENDING_REVIEW"', 'status="DRAFT"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated generation.py successfully.")
