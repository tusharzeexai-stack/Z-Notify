import sqlite3

conn = sqlite3.connect("znotify.db")
cursor = conn.cursor()

# Search for User- prefixed buckets
cursor.execute("SELECT * FROM notification_buckets WHERE bucket_name LIKE 'User-%'")
rows = cursor.fetchall()
print(f"Found {len(rows)} user-specific bucket records:")
for r in rows[:10]:
    print(r)

conn.close()
