import requests
import sys

API_BASE = "http://127.0.0.1:8000/api"

def main():
    print("--- STARTING E2E BACKEND INTEGRATION TEST ---")
    
    # 1. Login as Super Admin
    print("\n1. Logging in as Super Admin...")
    login_payload = {
        "email": "superadmin@company.com",
        "password": "password"
    }
    res = requests.post(f"{API_BASE}/auth/login", json=login_payload)
    if res.status_code != 200:
        print(f"Failed to log in as Super Admin: {res.status_code} - {res.text}")
        sys.exit(1)
        
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Logged in successfully. Token received.")
    
    # 2. Get Citizen John Doe's User ID
    print("\n2. Fetching John Doe's user profile...")
    res = requests.get(f"{API_BASE}/users", headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to fetch users list: {res.status_code} - {res.text}")
        sys.exit(1)
        
    users = res.json()
    john_doe = next((u for u in users if u["email"] == "john.doe@company.com"), None)
    if not john_doe:
        print("John Doe citizen profile not found in database!")
        sys.exit(1)
        
    john_id = john_doe["id"]
    print(f"John Doe user ID: {john_id}")
    
    # 3. Fetch Scoring Weights
    print("\n3. Fetching scoring weights...")
    res = requests.get(f"{API_BASE}/rules", headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to fetch rules: {res.status_code} - {res.text}")
        sys.exit(1)
    print("Scoring weights:", res.json())
    
    # 4. Trigger bulk generator matching for John Doe
    print("\n4. Triggering recommendation generator for John Doe...")
    gen_payload = {"user_id": john_id}
    res = requests.post(f"{API_BASE}/notifications/generate", json=gen_payload, headers=admin_headers)
    if res.status_code != 201:
        print(f"Failed to generate notifications: {res.status_code} - {res.text}")
        sys.exit(1)
    print("Generation complete response:", res.json())
    
    # 4.1 Save drafts
    print("\n4.1 Saving drafts for John Doe...")
    res = requests.post(f"{API_BASE}/notifications/save_drafts", json=gen_payload, headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to save drafts: {res.status_code} - {res.text}")
        sys.exit(1)
    print("Save drafts response:", res.json())
    
    # 4.2 Send to review queue
    print("\n4.2 Promoting saved drafts to review queue for John Doe...")
    res = requests.post(f"{API_BASE}/notifications/send_to_review", json=gen_payload, headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to send to review: {res.status_code} - {res.text}")
        sys.exit(1)
    print("Send to review response:", res.json())
    
    # 5. Fetch Review Queue
    print("\n5. Checking Review Queue...")
    res = requests.get(f"{API_BASE}/review/queue", headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to fetch review queue: {res.status_code} - {res.text}")
        sys.exit(1)
        
    reviews = res.json()
    print(f"Found {len(reviews)} items pending review.")
    
    johns_review = next((r for r in reviews if r["notification"]["user_id"] == john_id), None)
    if not johns_review:
        print("No pending review item found for John Doe!")
        sys.exit(1)
        
    notif_id = johns_review["notification_id"]
    print(f"Targeting notification for approval: ID = {notif_id}")
    
    # 6. Approve the recommendation in the Review Queue
    print("\n6. Approving recommendation...")
    approve_payload = {
        "notification_id": notif_id,
        "comment": "Approved through E2E integration test suite verification script.",
        "risk_level": "low"
    }
    res = requests.post(f"{API_BASE}/review/approve", json=approve_payload, headers=admin_headers)
    if res.status_code != 200:
        print(f"Failed to approve notification: {res.status_code} - {res.text}")
        sys.exit(1)
    print("Approval response:", res.json())
    
    # 7. Login as Citizen John Doe
    print("\n7. Logging in as Citizen (john.doe@company.com)...")
    citizen_payload = {
        "email": "john.doe@company.com",
        "password": "password"
    }
    res = requests.post(f"{API_BASE}/auth/login", json=citizen_payload)
    if res.status_code != 200:
        print(f"Failed to log in as citizen: {res.status_code} - {res.text}")
        sys.exit(1)
        
    citizen_token = res.json()["access_token"]
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    print("Citizen logged in successfully.")
    
    # 8. Check citizen's notifications inbox
    print("\n8. Fetching citizen alert inbox...")
    res = requests.get(f"{API_BASE}/notifications", headers=citizen_headers)
    if res.status_code != 200:
        print(f"Failed to fetch citizen's notifications: {res.status_code} - {res.text}")
        sys.exit(1)
        
    notifs = res.json()
    print(f"Citizen's inbox count: {len(notifs)} matching items found.")
    approved_notif = next((n for n in notifs if n["id"] == notif_id), None)
    if not approved_notif:
        print("Approved notification did not appear in citizen's inbox!")
        sys.exit(1)
        
    print(f"Success! Approved alert '{approved_notif['title']}' is present in citizen's inbox.")
    print("E2E INTEGRATION VERIFICATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
