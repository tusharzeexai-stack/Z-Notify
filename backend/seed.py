import random
import uuid
from app.core.database import SessionLocal, Base, engine
from app.models.all_models import User, Scheme, Job, Service, MedicalFacility, EligibilityRule
from app.core.security import get_password_hash

# Demographics pools
STATES_DISTRICTS = {
    "Maharashtra": ["Pune", "Mumbai City", "Nagpur", "Thane", "Nashik"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi"],
    "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangalore"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Varanasi"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode"]
}

EDUCATION_LEVELS = ["Secondary", "Higher Secondary", "Diploma", "Graduate", "Post Graduate", "Doctorate"]
OCCUPATIONS = ["Student", "Farmer", "Unemployed", "Daily Wage Worker", "Self Employed", "Salaried Professional", "Retired", "Homemaker"]
GENDERS = ["Male", "Female", "Other"]
MARITAL_STATUSES = ["Single", "Married", "Widowed", "Divorced"]
HOUSE_OWNERSHIPS = ["Own House", "Rented", "Homeless", "Government Quarters"]
CASTES = ["General", "OBC", "SC", "ST"]
DISABILITIES = ["None", "Locomotor", "Visual Impairment", "Hearing Impairment", "Mental Disability"]

def main():
    db = SessionLocal()
    print("Database connection opened. Starting seeding...")
    
    # 1. Truncate tables for fresh seed (excluding system tables if any)
    print("Clearing old data...")
    db.query(User).delete()
    db.query(Scheme).delete()
    db.query(Job).delete()
    db.query(Service).delete()
    db.query(MedicalFacility).delete()
    db.query(EligibilityRule).delete()
    db.commit()

    # 2. Add scoring rules
    print("Seeding default scoring weights...")
    rule = EligibilityRule(
        state_weight=30,
        district_weight=20,
        income_weight=20,
        age_weight=15,
        occupation_weight=15,
        is_active=True
    )
    db.add(rule)
    db.flush()

    # 3. Add default users
    print("Seeding system test users (superadmin, admin, citizen)...")
    hashed_pwd = get_password_hash("password")
    
    superadmin = User(
        email="superadmin@company.com",
        name="Super Admin",
        role="super-admin",
        hashed_password=hashed_pwd
    )
    admin = User(
        email="admin@company.com",
        name="Admin Reviewer",
        role="admin",
        hashed_password=hashed_pwd
    )
    citizen = User(
        email="john.doe@company.com",
        name="John Citizen",
        role="employee",
        hashed_password=hashed_pwd,
        age=32,
        gender="Male",
        state="Maharashtra",
        district="Pune",
        pincode="411001",
        education="Graduate",
        occupation="Salaried Professional",
        income=350000.0,
        marital_status="Married",
        house_ownership="Rented",
        caste_category="OBC",
        disability_status="None",
        mobile="+919876543210"
    )
    db.add(superadmin)
    db.add(admin)
    db.add(citizen)

    # 4. Import citizen profiles from CSV or generate if not found
    import csv
    import os
    
    csv_path = "UserProfiledetails_users_202606021836.csv"
    possible_paths = [
        os.path.join("D:\\Z-Notify", csv_path),
        os.path.join("d:\\Z-Notify", csv_path),
        csv_path,
        os.path.join("..", csv_path)
    ]
    
    selected_path = None
    for path in possible_paths:
        if os.path.exists(path):
            selected_path = path
            break
            
    if False:
        print("WARNING: UserProfiledetails CSV not found. Generating default citizen list instead.")
        names = ["Amit", "Priya", "Rahul", "Anjali", "Siddharth", "Neha", "Vikram", "Sneha", "Aditya", "Ritu", "Deepak", "Kiran", "Sanjay", "Meera", "Vijay", "Aisha", "Rajesh", "Pooja", "Arjun", "Kavita"]
        surnames = ["Sharma", "Verma", "Patel", "Mehta", "Singh", "Joshi", "Gupta", "Deshmukh", "Nair", "Iyer", "Rao", "Reddy", "Sen", "Roy", "Das", "Bose", "Choudhury", "Kumar", "Mishra", "Pandey"]
        citizens_list = []
        for i in range(100):
            name = f"{random.choice(names)} {random.choice(surnames)}"
            email = f"citizen{i+1}@hpns.gov.in"
            state = random.choice(list(STATES_DISTRICTS.keys()))
            district = random.choice(STATES_DISTRICTS[state])
            age = random.randint(18, 75)
            gender = random.choice(GENDERS)
            education = random.choice(EDUCATION_LEVELS)
            occupation = random.choice(OCCUPATIONS)
            income = float(random.randint(50000, 500000))
            caste = random.choice(CASTES)
            disability = random.choice(DISABILITIES)
            mobile = f"+91{random.randint(7000000000, 9999999999)}"
            
            citizen_profile = User(
                email=email,
                name=name,
                role="employee",
                hashed_password=hashed_pwd,
                age=age,
                gender=gender,
                state=state,
                district=district,
                pincode=str(random.randint(110001, 850000)),
                education=education,
                occupation=occupation,
                income=income,
                marital_status=random.choice(MARITAL_STATUSES),
                house_ownership=random.choice(HOUSE_OWNERSHIPS),
                caste_category=caste,
                disability_status=disability,
                mobile=mobile
            )
            citizens_list.append(citizen_profile)
        db.add_all(citizens_list)
        db.flush()
    elif False:
        print(f"Reading citizens from {selected_path}...")
        
        # Load active user IDs from Userwise_clicks.csv
        clicks_csv_path = "Userwise_clicks.csv"
        possible_clicks_paths = [
            os.path.join("D:\\Z-Notify", clicks_csv_path),
            os.path.join("d:\\Z-Notify", clicks_csv_path),
            clicks_csv_path,
            os.path.join("..", clicks_csv_path),
            os.path.join("backend", clicks_csv_path)
        ]
        selected_clicks_path = None
        for path in possible_clicks_paths:
            if os.path.exists(path):
                selected_clicks_path = path
                break

        active_user_ids = set()
        if selected_clicks_path:
            print(f"Filtering citizens based on clicks in {selected_clicks_path}...")
            try:
                with open(selected_clicks_path, mode="r", encoding="utf-8") as cf:
                    c_reader = csv.DictReader(cf)
                    for crow in c_reader:
                        u_id = crow.get("user_id")
                        if u_id:
                            try:
                                active_user_ids.add(str(int(float(u_id))))
                            except ValueError:
                                active_user_ids.add(str(u_id))
            except Exception as ce:
                print(f"Error reading clicks file for filtering: {ce}")
        else:
            print("WARNING: Userwise_clicks.csv not found. No filtering will be applied.")

        STATE_MAP = {
            "21": "Madhya Pradesh",
            "22": "Maharashtra",
            "29": "Punjab",
            "9": "Delhi",
            "14": "Karnataka",
            "31": "Tamil Nadu",
            "32": "Telangana",
            "11": "Gujarat",
            "33": "Uttar Pradesh",
            "4": "Bihar",
            "34": "West Bengal",
            "16": "Kerala"
        }

        DISTRICT_MAP = {
            "345": "Balaghat",
            "537": "Tarn Taran",
            "399": "Chandrapur",
            "428": "Yavatmal"
        }

        citizens_list = []
        with open(selected_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                uid = row.get("uid")
                if not uid:
                    continue
                
                integer_id = row.get("id")
                if not integer_id:
                    continue
                try:
                    clean_id = str(int(float(integer_id)))
                except ValueError:
                    clean_id = str(integer_id)
                
                # Only seed the user if they have click history
                if active_user_ids and clean_id not in active_user_ids:
                    continue

                
                integer_id = row.get("id")
                email = row.get("email_id")
                if not email or email.strip() == "":
                    email = f"citizen_{integer_id}@hpns.gov.in"
                    
                name = row.get("name") or "Unnamed Citizen"
                
                age = None
                if row.get("age"):
                    try:
                        age = int(float(row["age"]))
                    except ValueError:
                        pass
                if age is None and row.get("dob"):
                    parts = row["dob"].replace("/", "-").split("-")
                    if len(parts) == 3:
                        try:
                            year = int(parts[2])
                            age = 2026 - year
                        except ValueError:
                            pass
                if age is None:
                    age = 35
                    
                gender = row.get("gender") or "Male"
                
                state_id = row.get("state_id") or ""
                state = STATE_MAP.get(state_id, f"State-{state_id}" if state_id else "Any")
                
                district_id = row.get("district_id") or ""
                district = DISTRICT_MAP.get(district_id, f"District-{district_id}" if district_id else "Any")
                
                pincode = row.get("pincode") or ""
                
                education_id = row.get("education_id") or ""
                education = f"Education-{education_id}" if education_id else "Any"
                
                occupation_id = row.get("occupation_id") or ""
                occupation = f"Occupation-{occupation_id}" if occupation_id else "Any"
                
                personal_income_id = row.get("personal_income_id")
                try:
                    income = float(personal_income_id) * 30000.0 if personal_income_id else 0.0
                except ValueError:
                    income = 0.0
                    
                marital_status_id = row.get("marital_status_id") or ""
                marital_status = f"Marital-{marital_status_id}" if marital_status_id else "Single"
                
                house_ownership_id = row.get("house_ownership_id") or ""
                house_ownership = f"House-{house_ownership_id}" if house_ownership_id else "Own House"
                
                caste_id = row.get("caste_id") or ""
                caste = f"Caste-{caste_id}" if caste_id else "General"
                
                disability_status = "Locomotor" if row.get("differently_abled") == "TRUE" else "None"
                mobile = row.get("mobile_no") or ""
                
                citizen_profile = User(
                    id=uid,
                    email=email,
                    name=name,
                    role="employee",
                    hashed_password=hashed_pwd,
                    age=age,
                    gender=gender,
                    state=state,
                    district=district,
                    pincode=pincode,
                    education=education,
                    occupation=occupation,
                    income=income,
                    marital_status=marital_status,
                    house_ownership=house_ownership,
                    caste_category=caste,
                    disability_status=disability_status,
                    mobile=mobile
                )
                citizens_list.append(citizen_profile)
                
        print(f"Bulk inserting {len(citizens_list)} citizens into the database...")
        db.add_all(citizens_list)
        db.flush()

    # 5. Load welfare schemes from CSV
    print("Generating welfare schemes from CSV...")
    csv_scheme_path = "farmer_schemes_100.csv"
    possible_scheme_paths = [
        os.path.join("D:\\Z-Notify\\frontend\\public", csv_scheme_path),
        os.path.join("d:\\Z-Notify\\frontend\\public", csv_scheme_path),
        os.path.join("..", "frontend", "public", csv_scheme_path),
        os.path.join("frontend", "public", csv_scheme_path),
        csv_scheme_path
    ]
    selected_scheme_path = None
    for path in possible_scheme_paths:
        if os.path.exists(path):
            selected_scheme_path = path
            break

    if selected_scheme_path:
        with open(selected_scheme_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for r in reader:
                title = r.get("Scheme Name", "").strip()
                category = r.get("Category", "").strip()
                who_can_apply = r.get("Who Can Apply", "").strip()
                land_req = r.get("Land Requirement", "").strip()
                other_conditions = r.get("Income / Other Conditions", "").strip()
                benefit = r.get("Key Benefit", "").strip()
                portal = r.get("Official Portal", "").strip()

                if not title:
                    continue

                desc = f"Category: {category}. Who Can Apply: {who_can_apply}. Land Requirement: {land_req}."
                if other_conditions:
                    desc += f" Other Conditions: {other_conditions}."

                state = "Any"
                for s in ["Andhra Pradesh", "Haryana", "Jharkhand", "Madhya Pradesh", "Odisha", "Chhattisgarh", "Karnataka", "Punjab", "Maharashtra"]:
                    if s.lower() in title.lower() or s.lower() in who_can_apply.lower() or s.lower() in other_conditions.lower() or s.lower() in category.lower():
                        state = s
                        break

                gender = "Any"
                if "women" in category.lower() or "women" in who_can_apply.lower():
                    gender = "Female"

                disability_status = "Any"
                if "disability" in category.lower() or "differently-abled" in who_can_apply.lower() or "disabled" in who_can_apply.lower():
                    disability_status = "Locomotor"

                criteria = {
                    "state": state,
                    "district": "Any",
                    "income_max": 99999999.0,
                    "age_min": 0,
                    "age_max": 120,
                    "occupation": "Farmer",
                    "gender": gender,
                    "caste_category": "Any",
                    "disability_status": disability_status
                }

                scheme_obj = Scheme(
                    title=title,
                    description=desc,
                    agency=portal or "Department of Agriculture",
                    benefit_details=benefit,
                    eligibility_criteria=criteria
                )
                db.add(scheme_obj)
    else:
        print("WARNING: farmer_schemes_100.csv not found. No schemes seeded.")

    # 6. Generate 200 jobs (Disabled as per request)
    print("Skipping jobs, services, and medical facilities generation...")

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    main()
