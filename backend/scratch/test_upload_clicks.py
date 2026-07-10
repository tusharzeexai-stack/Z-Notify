import requests
import time

def test_upload():
    # 1. Login to get token
    login_url = "http://127.0.0.1:8001/api/auth/login"
    login_data = {
        "email": "superadmin@company.com",
        "password": "password"
    }
    r = requests.post(login_url, json=login_data)
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        return
        
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload only clicks CSV (Single-file)
    upload_url = "http://127.0.0.1:8001/api/users/upload-clicks"
    files_single = {"file": ("Userwise_clicks.csv", open("D:\\Z-Notify\\Userwise_clicks.csv", "rb"), "text/csv")}
    
    print("Testing SINGLE CSV upload (clicks only)...")
    r = requests.post(upload_url, headers=headers, files=files_single)
    if r.status_code != 200:
        print("Single upload failed:", r.status_code, r.text)
        return
    print("[OK] Single CSV upload succeeded! Returned status 200.")
    
    # 3. Upload both clicks and profiles (Dual-file)
    files_dual = {
        "file": ("Userwise_clicks.csv", open("D:\\Z-Notify\\Userwise_clicks.csv", "rb"), "text/csv"),
        "profile_file": ("UserProfiledetails_users_202606021836.csv", open("D:\\Z-Notify\\UserProfiledetails_users_202606021836.csv", "rb"), "text/csv")
    }
    
    print("\nTesting DUAL CSV upload (clicks + profiles)...")
    r = requests.post(upload_url, headers=headers, files=files_dual)
    if r.status_code != 200:
        print("Dual upload failed:", r.status_code, r.text)
        return
        
    print("[OK] Dual CSV upload succeeded! Returned status 200.")
    csv_content = r.text
    lines = csv_content.splitlines()
    if not lines:
        print("Empty CSV returned!")
        return
        
    headers_returned = lines[0].split(",")
    print("\n--- Columns returned in the CSV report ---")
    print(headers_returned)
    print(f"Total columns count: {len(headers_returned)}")
    
    print("\n--- First Row Data Sample ---")
    if len(lines) > 1:
        row_values = lines[1].split(",")
        for h, val in zip(headers_returned, row_values):
            print(f"{h}: {val}")
    else:
        print("No row data returned!")

    # 4. Wait a few seconds for background tasks to complete and check if users are synced
    print("\nWaiting 3 seconds for background user sync task to complete...")
    time.sleep(3)
    
    # Let's search for "Rajendra" who is ID 215456 in the profiles CSV
    search_url = "http://127.0.0.1:8001/api/users?search=Rajendra"
    r = requests.get(search_url, headers=headers)
    if r.status_code == 200:
        results = r.json()
        print(f"\nSearching database for 'Rajendra': found {len(results)} matches.")
        for u in results:
            print(f"- ID: {u['id']}, Name: {u['name']}, Email: {u['email']}, Gender: {u['gender']}, State: {u['state']}, District: {u['district']}")
    else:
        print("Failed to query users:", r.status_code, r.text)

if __name__ == "__main__":
    test_upload()
