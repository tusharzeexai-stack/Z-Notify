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

    # 5. Generate 200 welfare schemes
    print("Generating 200 welfare schemes...")
    scheme_sectors = ["Agriculture", "Education", "Healthcare", "Women Welfare", "Housing", "Social Security"]
    scheme_templates = [
        {"title": "Kisan Credit Support Scheme", "sector": "Agriculture", "desc": "Provides short term credit limit for purchase of seeds, fertilizers, and pesticide tools.", "agency": "Ministry of Agriculture"},
        {"title": "Ayushman Bharat Arogya Card", "sector": "Healthcare", "desc": "Free health coverage up to INR 5,000,000 per family per year for secondary and tertiary care hospitalization.", "agency": "National Health Authority"},
        {"title": "National Graduate Fellowship Program", "sector": "Education", "desc": "Direct stipend transfer to underprivileged students pursuing post-graduate research degrees.", "agency": "Department of Higher Education"},
        {"title": "Pradhan Mantri Awas Griha Sahayata", "sector": "Housing", "desc": "Financial subsidy of up to INR 1.5 Lakhs for construction of pucca houses in rural areas.", "agency": "Ministry of Rural Development"},
        {"title": "Mahila Udyami Loan Subvention", "sector": "Women Welfare", "desc": "Zero interest loans and micro-credit facility for women self-help groups starting local businesses.", "agency": "Ministry of Women and Child Development"},
        {"title": "Divyangjan Assistive Aid Program", "sector": "Social Security", "desc": "Provides free motorized wheel chairs, hearing implants, and visual aid kits to disabled citizens.", "agency": "Department of Empowerment of Persons with Disabilities"}
    ]
    
    for i in range(200):
        tpl = random.choice(scheme_templates)
        title = f"{tpl['title']} (Batch-{i+1})"
        desc = f"{tpl['desc']} This is program version {i+1} under active review."
        
        # Construct eligibility criteria
        criteria = {
            "state": random.choice(["Any", "Maharashtra", "Karnataka", "Uttar Pradesh", "Delhi"]),
            "district": "Any",
            "income_max": float(random.choice([150000, 300000, 500000, 800000])),
            "age_min": random.choice([18, 21, 0]),
            "age_max": random.choice([45, 60, 100]),
            "occupation": random.choice(["Any", "Farmer", "Student", "Unemployed"]),
            "gender": "Any" if tpl["sector"] != "Women Welfare" else "Female",
            "caste_category": "Any",
            "disability_status": "Any" if tpl["sector"] != "Social Security" else "Locomotor"
        }
        
        scheme_obj = Scheme(
            title=title,
            description=desc,
            agency=tpl["agency"],
            benefit_details=f"Provides financial cover, training resources, and certificate rewards value up to INR {random.randint(10000, 200000)}.",
            eligibility_criteria=criteria
        )
        db.add(scheme_obj)

    # 6. Generate 200 jobs
    print("Generating 200 government job postings...")
    job_roles = ["Technical Clerk", "Data Entry Operator", "Junior Research Assistant", "Forest Ranger", "Sub-Inspector Aide", "Aanganwadi Supervisor", "Post Office Clerk", "Assistant Section Officer"]
    departments = ["Department of Posts", "Ministry of Railways", "Staff Selection Commission", "Department of Revenue", "Forestry Division", "Health Services Board"]
    
    for i in range(200):
        role = random.choice(job_roles)
        dept = random.choice(departments)
        title = f"{role} (Code-{i+1000})"
        desc = f"Applications are invited for the post of {role} under {dept}. High security clearance, documentation, and medical checks mandatory."
        
        criteria = {
            "state": "Any",
            "district": "Any",
            "income_max": 99999999.0, # Job is not limited by income max, usually
            "age_min": 18,
            "age_max": random.choice([28, 35, 40]),
            "occupation": "Any",
            "gender": "Any",
            "education": random.choice(["Secondary", "Higher Secondary", "Graduate"]),
            "caste_category": "Any",
            "disability_status": "None"
        }
        
        job_obj = Job(
            title=title,
            description=desc,
            department=dept,
            salary=f"INR {random.randint(25000, 75000)} per month (Grade Pay level 4)",
            location=random.choice(["Any", "Mumbai", "Bengaluru", "Noida", "Chennai"]),
            eligibility_criteria=criteria
        )
        db.add(job_obj)

    # 7. Generate 100 services
    print("Generating 100 services...")
    service_titles = ["Pesticide Subsidy Passbook", "Digital Land Records Registry", "Fertilizer Procurement Token", "Student Bus Pass Portal", "Maternal Care Health Token", "Disability Bus Pass Issue"]
    for i in range(100):
        t = random.choice(service_titles)
        service_obj = Service(
            title=f"{t} Service-ID {i+1}",
            description=f"Citizen service portal to process applications for {t}. Full eligibility score check required for fast tracking.",
            department=random.choice(departments),
            eligibility_criteria={
                "state": "Any",
                "district": "Any",
                "income_max": float(random.choice([200000, 400000, 1000000])),
                "age_min": 18,
                "age_max": 80,
                "occupation": "Any"
            }
        )
        db.add(service_obj)

    # 8. Generate 100 medical facilities
    print("Generating 100 medical facilities...")
    facility_names = ["Apollo Clinic", "Ayush Wellness Center", "Fortis Med-Center", "Sub-Divisional Civil Hospital", "PHC Primary Health Unit", "Max Care Center"]
    facility_types = ["Primary Health Center", "Community Health Center", "General Hospital", "Super Specialty Hospital"]
    
    for i in range(100):
        n = random.choice(facility_names)
        t = random.choice(facility_types)
        state = random.choice(list(STATES_DISTRICTS.keys()))
        dist = random.choice(STATES_DISTRICTS[state])
        
        medical_obj = MedicalFacility(
            name=f"{n} ({dist}-{i+1})",
            type=t,
            location=f"{random.randint(10, 99)} MG Road, {dist}, {state}",
            services_offered={
                "state": state,
                "district": dist,
                "income_max": 99999999.0, # Free or subsidised clinic based on demographic
                "age_min": 0,
                "age_max": 120,
                "services": ["Outpatient (OPD)", "Immunization", "Maternity ward", "Emergency care"]
            }
        )
        db.add(medical_obj)

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    main()
