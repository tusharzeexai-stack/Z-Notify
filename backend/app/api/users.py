from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker, get_current_user, get_password_hash
from app.models.all_models import User, AuditLog
from app.schemas.all_schemas import UserProfile, UserUpdate, UserCreate, UserAdminEdit
from typing import List, Optional

router = APIRouter(prefix="/users", tags=["users"])

# Super admin and Admin can view all users
admin_required = RoleChecker(["super-admin", "admin"])
super_admin_required = RoleChecker(["super-admin"])

@router.post("", response_model=UserProfile)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    existing = db.query(User).filter(User.email == user_in.email, User.is_deleted == False).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
        
    hashed = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        hashed_password=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        action="USER_CREATED_BY_SUPER_ADMIN",
        user_id=current_user.id,
        details={"email": user.email, "role": user.role}
    )
    db.add(audit)
    db.commit()
    
    return user

@router.put("/{user_id}/admin-edit", response_model=UserProfile)
def admin_edit_user(
    user_id: str,
    user_in: UserAdminEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if user_in.email and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email, User.is_deleted == False).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )
        user.email = user_in.email
        
    if user_in.name is not None:
        user.name = user_in.name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
        
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        action="USER_EDITED_BY_SUPER_ADMIN",
        user_id=current_user.id,
        details={"edited_user_id": user_id, "email": user.email}
    )
    db.add(audit)
    db.commit()
    
    return user

@router.delete("/{user_id}", response_model=UserProfile)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own super-admin account."
        )
        
    user.is_deleted = True
    db.commit()
    
    # Audit log
    audit = AuditLog(
        action="USER_DELETED_BY_SUPER_ADMIN",
        user_id=current_user.id,
        details={"deleted_user_id": user_id, "email": user.email}
    )
    db.add(audit)
    db.commit()
    
    return user

def populate_user_from_csv(user: User, db_user_id: str):
    import os
    import csv

    profile_csv_path = "UserProfiledetails_users_202606021836.csv"
    possible_paths = [
        os.path.join("D:\\Z-Notify", profile_csv_path),
        os.path.join("d:\\Z-Notify", profile_csv_path),
        profile_csv_path,
        os.path.join("..", profile_csv_path),
        os.path.join("backend", profile_csv_path)
    ]
    
    selected_path = None
    for p in possible_paths:
        if os.path.exists(p):
            selected_path = p
            break
            
    if not selected_path:
        return
        
    try:
        clean_id = None
        try:
            clean_id = str(int(float(db_user_id)))
        except ValueError:
            clean_id = str(db_user_id)
            
        with open(selected_path, mode="r", encoding="utf-8") as f:
            p_reader = csv.DictReader(f)
            for pr in p_reader:
                if pr.get("id") == clean_id or pr.get("uid") == db_user_id:
                    user.name = pr.get("name") or user.name
                    
                    age = None
                    if pr.get("age"):
                        try:
                            age = int(float(pr["age"]))
                        except ValueError:
                            pass
                    if age is None and pr.get("dob"):
                        parts = pr["dob"].replace("/", "-").split("-")
                        if len(parts) == 3:
                            try:
                                age = 2026 - int(parts[2])
                            except ValueError:
                                pass
                    if age is not None:
                        user.age = age
                        
                    user.gender = pr.get("gender") or user.gender
                    
                    STATE_MAP = {
                        "21": "Madhya Pradesh", "22": "Maharashtra", "29": "Punjab", "9": "Delhi",
                        "14": "Karnataka", "31": "Tamil Nadu", "32": "Telangana", "11": "Gujarat",
                        "33": "Uttar Pradesh", "4": "Bihar", "34": "West Bengal", "16": "Kerala"
                    }
                    state_id = pr.get("state_id") or ""
                    user.state = STATE_MAP.get(state_id, f"State-{state_id}" if state_id else "Any")
                    
                    DISTRICT_MAP = {
                        "345": "Balaghat", "537": "Tarn Taran", "399": "Chandrapur", "428": "Yavatmal"
                    }
                    district_id = pr.get("district_id") or ""
                    user.district = DISTRICT_MAP.get(district_id, f"District-{district_id}" if district_id else "Any")
                    
                    user.pincode = pr.get("pincode") or user.pincode
                    
                    education_id = pr.get("education_id") or ""
                    user.education = f"Education-{education_id}" if education_id else "Any"
                    
                    occupation_id = pr.get("occupation_id") or ""
                    user.occupation = f"Occupation-{occupation_id}" if occupation_id else "Any"
                    
                    personal_income_id = pr.get("personal_income_id")
                    try:
                        user.income = float(personal_income_id) * 30000.0 if personal_income_id else 0.0
                    except ValueError:
                        user.income = 0.0
                        
                    marital_status_id = pr.get("marital_status_id") or ""
                    user.marital_status = f"Marital-{marital_status_id}" if marital_status_id else "Single"
                    
                    house_ownership_id = pr.get("house_ownership_id") or ""
                    user.house_ownership = f"House-{house_ownership_id}" if house_ownership_id else "Own House"
                    
                    caste_id = pr.get("caste_id") or ""
                    user.caste_category = f"Caste-{caste_id}" if caste_id else "General"
                    
                    user.disability_status = "Locomotor" if str(pr.get("differently_abled", "")).upper() == "TRUE" else "None"
                    user.mobile = pr.get("mobile_no") or user.mobile
                    break
    except Exception as e:
        print(f"Error populating user from CSV: {e}")

@router.get("", response_model=List[UserProfile])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
    search: Optional[str] = Query(None, description="Search by name or email"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    caste_category: Optional[str] = Query(None),
    disability_status: Optional[str] = Query(None)
):
    query = db.query(User).filter(User.is_deleted == False)
    
    if search:
        query = query.filter((User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    if state:
        query = query.filter(User.state.ilike(f"%{state}%"))
    if district:
        query = query.filter(User.district.ilike(f"%{district}%"))
    if role:
        query = query.filter(User.role == role)
    if caste_category:
        query = query.filter(User.caste_category == caste_category)
    if disability_status:
        query = query.filter(User.disability_status == disability_status)
        
    results = query.all()
    # Enrich any users that are missing demographics dynamically
    updated = False
    for u in results:
        if u.role == "employee" and (u.gender is None or u.state is None):
            populate_user_from_csv(u, u.id)
            updated = True
    if updated:
        db.commit()
        
    return results

@router.get("/me", response_model=UserProfile)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/{user_id}", response_model=UserProfile)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user.role == "employee" and (user.gender is None or user.state is None):
        populate_user_from_csv(user, user_id)
        db.commit()
    return user

@router.put("/{user_id}", response_model=UserProfile)
def update_user_profile(
    user_id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check permission (User updates self, or Admin does it)
    if current_user.role not in ["super-admin", "admin"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this profile."
        )
        
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Save old data for audit
    old_data = {
        "name": user.name,
        "age": user.age,
        "state": user.state,
        "district": user.district,
        "income": user.income,
        "occupation": user.occupation
    }
    
    update_data = user_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(user, field, val)
        
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        action="USER_PROFILE_UPDATE",
        user_id=current_user.id,
        details={
            "target_user_id": user.id,
            "old_version": old_data,
            "new_version": update_data
        }
    )
    db.add(audit)
    db.commit()
    
    return user

@router.post("/upload-clicks")
def upload_clicks_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    profile_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    import csv
    import io
    import os
    import uuid
    from fastapi.responses import StreamingResponse

    # Helper maps
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

    def resolve_state(state_val: str) -> str:
        if not state_val:
            return "Any"
        if state_val in STATE_MAP:
            return STATE_MAP[state_val]
        try:
            clean_id = str(int(float(state_val)))
            if clean_id in STATE_MAP:
                return STATE_MAP[clean_id]
        except ValueError:
            pass
        try:
            float(state_val)
            try:
                clean_id = str(int(float(state_val)))
                return f"State-{clean_id}"
            except ValueError:
                return f"State-{state_val}"
        except ValueError:
            return state_val

    def resolve_district(district_val: str) -> str:
        if not district_val:
            return "Any"
        if district_val in DISTRICT_MAP:
            return DISTRICT_MAP[district_val]
        try:
            clean_id = str(int(float(district_val)))
            if clean_id in DISTRICT_MAP:
                return DISTRICT_MAP[clean_id]
        except ValueError:
            pass
        try:
            float(district_val)
            try:
                clean_id = str(int(float(district_val)))
                return f"District-{clean_id}"
            except ValueError:
                return f"District-{district_val}"
        except ValueError:
            return district_val

    def resolve_age(age_str: str, dob_str: str) -> int:
        age_val = None
        if age_str:
            try:
                age_val = int(float(age_str))
            except ValueError:
                pass
        if age_val is None and dob_str:
            parts = dob_str.replace("/", "-").split("-")
            if len(parts) == 3:
                try:
                    age_val = 2026 - int(parts[2])
                except ValueError:
                    pass
        if age_val is None:
            age_val = 35
        return age_val

    # 1. Parse the uploaded clicks file
    try:
        content = file.file.read().decode("utf-8-sig")
        file.file.close()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read click file content: {str(e)}"
        )
        
    try:
        csv_file = io.StringIO(content)
        reader = csv.DictReader(csv_file)
        rows = list(reader)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid clicks CSV formatting: {str(e)}"
        )
        
    if not rows:
        raise HTTPException(
            status_code=400,
            detail="Clicks CSV file is empty"
        )
        
    # Find min and max engagement time for normalization
    engagement_times = []
    for r in rows:
        eng_str = r.get("engagement_time_msec")
        if eng_str:
            try:
                engagement_times.append(float(eng_str))
            except ValueError:
                pass
                
    min_eng = min(engagement_times) if engagement_times else 0.0
    max_eng = max(engagement_times) if engagement_times else 0.0
    eng_range = max_eng - min_eng
    
    # 2. Load profiles lookup from profile_file or UserProfiledetails CSV
    profiles = {}
    profiles_list = []
    
    if profile_file:
        try:
            profile_content = profile_file.file.read().decode("utf-8-sig")
            profile_file.file.close()
            p_file = io.StringIO(profile_content)
            p_reader = csv.DictReader(p_file)
            profiles_list = list(p_reader)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read profile file content: {str(e)}"
            )
    else:
        profile_csv_path = "UserProfiledetails_users_202606021836.csv"
        possible_paths = [
            os.path.join("D:\\Z-Notify", profile_csv_path),
            os.path.join("d:\\Z-Notify", profile_csv_path),
            profile_csv_path,
            os.path.join("..", profile_csv_path),
            os.path.join("backend", profile_csv_path)
        ]
        selected_path = None
        for p in possible_paths:
            if os.path.exists(p):
                selected_path = p
                break
        if selected_path:
            try:
                with open(selected_path, mode="r", encoding="utf-8") as f:
                    p_reader = csv.DictReader(f)
                    profiles_list = list(p_reader)
            except Exception as e:
                print(f"Error loading UserProfiledetails lookup: {e}")

    # Index profiles by all potential identity keys (id, uid, userId, user_id)
    for pr in profiles_list:
        keys_to_index = []
        for key, val in pr.items():
            if not val:
                continue
            k_lower = key.lower()
            if k_lower in ("id", "uid", "userid", "user_id"):
                val_str = str(val).strip()
                keys_to_index.append(val_str)
                try:
                    clean_id = str(int(float(val_str)))
                    keys_to_index.append(clean_id)
                except ValueError:
                    pass
        for k in set(keys_to_index):
            profiles[k] = pr

    # 3. Calculate scores
    scored_records = []
    for r in rows:
        # Resolve user_id from click record. Check variations.
        user_id = None
        for key in r.keys():
            k_lower = key.lower()
            if k_lower in ("user_id", "userid", "uid", "id"):
                user_id = r[key]
                break
        if not user_id:
            continue
            
        def get_val(key):
            for k in r.keys():
                if k.lower() == key.lower():
                    v = r.get(k)
                    try:
                        return float(v) if v else 0.0
                    except ValueError:
                        return 0.0
            return 0.0
                
        article_click = get_val("article_click")
        complete_scheme_profile_click = get_val("complete_scheme_profile_click")
        jobs_card_click = get_val("jobs_card_click")
        jobs_options_click = get_val("jobs_options_click")
        scheme_category_click = get_val("scheme_category_click")
        scheme_click = get_val("scheme_click")
        service_options_click = get_val("service_options_click")
        sub_service_card_click = get_val("sub_service_card_click")
        sub_service_click = get_val("sub_service_click")
        article_view = get_val("article_view")
        eng_msec = get_val("engagement_time_msec")
        
        # Normalized engagement time
        eng_norm = (eng_msec - min_eng) / eng_range if eng_range > 0 else 0.0
        
        # Formulas
        content_score = article_click + article_view + (eng_norm * 10)
        scheme_score = scheme_click + (scheme_category_click * 1.5) + (complete_scheme_profile_click * 2.0)
        job_score = jobs_card_click + (jobs_options_click * 1.5)
        service_score = service_options_click + sub_service_click + sub_service_card_click
        total_score = content_score + scheme_score + job_score + service_score
        
        # Get demographic info
        p = None
        user_id_str = str(user_id).strip()
        p = profiles.get(user_id_str)
        if not p:
            try:
                clean_id = str(int(float(user_id_str)))
                p = profiles.get(clean_id)
            except ValueError:
                pass

        name = p.get("name") if p else "Unknown Citizen"
        
        age = None
        if p:
            age = resolve_age(p.get("age"), p.get("dob"))
        if age is None:
            age = 35

        # Calculate primary category
        scores_map = {
            "Content": content_score,
            "Scheme": scheme_score,
            "Job": job_score,
            "Service": service_score
        }
        max_cat = max(scores_map, key=scores_map.get)
        primary_category = max_cat if scores_map[max_cat] > 0 else "None"
        
        # Calculate notification tag
        notification_tag = f"{primary_category} Alert" if primary_category != "None" else "No Alert"
        
        # Calculate engagement time in minutes
        engagement_time_min = round(eng_msec / 60000.0, 2)
        
        # Get notification click count
        notification_click = int(get_val("notification_click"))
        
        # Get other demographic profile fields
        preferred_language = p.get("preferred_language", "") if p else ""
        mobile_no = p.get("mobile_no", "") if p else ""
        bpl_category = p.get("bpl_category", "") if p else ""
        
        personal_income_id = p.get("personal_income_id") or p.get("personal_income") or p.get("income") if p else None
        try:
            personal_income = float(personal_income_id) * 30000.0 if personal_income_id else 0.0
        except ValueError:
            try:
                personal_income = float(personal_income_id) if personal_income_id else 0.0
            except ValueError:
                personal_income = 0.0
            
        family_income_id = p.get("family_income_id") or p.get("family_income") if p else None
        try:
            family_income = float(family_income_id) * 30000.0 if family_income_id else 0.0
        except ValueError:
            try:
                family_income = float(family_income_id) if family_income_id else 0.0
            except ValueError:
                family_income = 0.0
            
        family_type_id = p.get("family_type_id", "") if p else ""
        
        occupation_id = p.get("occupation_id") or p.get("occupation") if p else ""
        Occupation = f"Occupation-{occupation_id}" if (occupation_id and str(occupation_id).isdigit()) else (occupation_id or "Any")
        
        working_status_id = p.get("working_status_id") or p.get("working_status") if p else ""
        Working_status = f"Working-{working_status_id}" if (working_status_id and str(working_status_id).isdigit()) else (working_status_id or "Any")
        
        district_id = p.get("district_id") or p.get("district") if p else ""
        district = resolve_district(district_id)
        
        pincode = p.get("pincode", "") if p else ""
        
        house_ownership_id = p.get("house_ownership_id") or p.get("house_ownership") if p else ""
        house_ownership = f"House-{house_ownership_id}" if (house_ownership_id and str(house_ownership_id).isdigit()) else (house_ownership_id or "Own House")

        gender = p.get("gender") if p else "Male"
        marital_status_id = p.get("marital_status_id") or p.get("marital_status") if p else ""
        marital_status = f"Marital-{marital_status_id}" if (marital_status_id and str(marital_status_id).isdigit()) else (marital_status_id or "Single")
        caste_id = p.get("caste_id") or p.get("caste_category") or p.get("caste") if p else ""
        caste_category = f"Caste-{caste_id}" if (caste_id and str(caste_id).isdigit()) else (caste_id or "General")
        differently_abled = p.get("differently_abled") or p.get("disability_status") if p else ""
        disability_status = "Locomotor" if str(differently_abled).upper() in ("TRUE", "YES") else "None"
        state_id = p.get("state_id") or p.get("state") if p else ""
        state = resolve_state(state_id)
        education_id = p.get("education_id") or p.get("education") if p else ""
        education = f"Education-{education_id}" if (education_id and str(education_id).isdigit()) else (education_id or "Any")

        scored_records.append({
            "user_id": user_id,
            "name": name,
            "age": age,
            "primary_category": primary_category,
            "notification_tag": notification_tag,
            "content_score": round(content_score, 2),
            "scheme_score": round(scheme_score, 2),
            "job_score": round(job_score, 2),
            "service_score": round(service_score, 2),
            "engagement_time_min": engagement_time_min,
            "notification_click": notification_click,
            "preferred_language": preferred_language,
            "mobile_no": mobile_no,
            "bpl_category": bpl_category,
            "personal_income": personal_income,
            "family_income": family_income,
            "family_type_id": family_type_id,
            "Occupation": Occupation,
            "Working_status": Working_status,
            "district": district,
            "pincode": pincode,
            "house_ownership": house_ownership,
            "gender": gender,
            "marital_status": marital_status,
            "caste_category": caste_category,
            "disability_status": disability_status,
            "state": state,
            "education": education,
            "total_score": round(total_score, 2)
        })
        
    scored_records.sort(key=lambda x: x["total_score"], reverse=True)

    if profiles_list and profile_file:
        background_tasks.add_task(background_upsert_users, profiles_list)

    output_io = io.StringIO()
    writer_fieldnames = [
        "user_id", "name", "age", "primary_category", "notification_tag",
        "content_score", "scheme_score", "job_score", "service_score",
        "engagement_time_min", "notification_click", "preferred_language",
        "mobile_no", "bpl_category", "personal_income", "family_income",
        "family_type_id", "Occupation", "Working_status", "district",
        "pincode", "house_ownership",
        "gender", "marital_status", "caste_category", "disability_status", "state", "education"
    ]
    csv_writer = csv.DictWriter(output_io, fieldnames=writer_fieldnames)
    csv_writer.writeheader()
    
    for rec in scored_records:
        rec_to_write = {k: rec[k] for k in writer_fieldnames}
        csv_writer.writerow(rec_to_write)
    
    output_io.seek(0)
    
    response = StreamingResponse(
        iter([output_io.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=citizen_engagement_scores.csv"
    return response


def background_upsert_users(profiles_list: list):
    from app.core.database import SessionLocal
    from app.core.security import get_password_hash
    from app.models.all_models import User
    import uuid

    db = SessionLocal()
    try:
        default_password_hash = get_password_hash("ZNotifyDefault123!")
        
        STATE_MAP = {
            "21": "Madhya Pradesh", "22": "Maharashtra", "29": "Punjab", "9": "Delhi",
            "14": "Karnataka", "31": "Tamil Nadu", "32": "Telangana", "11": "Gujarat",
            "33": "Uttar Pradesh", "4": "Bihar", "34": "West Bengal", "16": "Kerala"
        }
        DISTRICT_MAP = {
            "345": "Balaghat", "537": "Tarn Taran", "399": "Chandrapur", "428": "Yavatmal"
        }

        def resolve_state(state_val: str) -> str:
            if not state_val:
                return "Any"
            if state_val in STATE_MAP:
                return STATE_MAP[state_val]
            try:
                clean_id = str(int(float(state_val)))
                if clean_id in STATE_MAP:
                    return STATE_MAP[clean_id]
            except ValueError:
                pass
            try:
                float(state_val)
                try:
                    clean_id = str(int(float(state_val)))
                    return f"State-{clean_id}"
                except ValueError:
                    return f"State-{state_val}"
            except ValueError:
                return state_val

        def resolve_district(district_val: str) -> str:
            if not district_val:
                return "Any"
            if district_val in DISTRICT_MAP:
                return DISTRICT_MAP[district_val]
            try:
                clean_id = str(int(float(district_val)))
                if clean_id in DISTRICT_MAP:
                    return DISTRICT_MAP[clean_id]
            except ValueError:
                pass
            try:
                float(district_val)
                try:
                    clean_id = str(int(float(district_val)))
                    return f"District-{clean_id}"
                except ValueError:
                    return f"District-{district_val}"
            except ValueError:
                return district_val

        def resolve_age(age_str: str, dob_str: str) -> int:
            age_val = None
            if age_str:
                try:
                    age_val = int(float(age_str))
                except ValueError:
                    pass
            if age_val is None and dob_str:
                parts = dob_str.replace("/", "-").split("-")
                if len(parts) == 3:
                    try:
                        age_val = 2026 - int(parts[2])
                    except ValueError:
                        pass
            if age_val is None:
                age_val = 35
            return age_val

        # Query all existing users to perform in-memory lookup
        existing_users = db.query(User).filter(User.is_deleted == False).all()
        users_by_id = {u.id: u for u in existing_users}
        users_by_email = {u.email: u for u in existing_users}

        for pr in profiles_list:
            uid = None
            raw_id = None
            for key in pr.keys():
                k_lower = key.lower()
                if k_lower == 'uid':
                    uid = pr[key]
                elif k_lower in ('id', 'userid', 'user_id'):
                    raw_id = pr[key]
            
            user = None
            if uid:
                user = users_by_id.get(str(uid))
            if not user and raw_id:
                try:
                    clean_raw_id = str(int(float(raw_id)))
                    user = users_by_id.get(clean_raw_id)
                except ValueError:
                    user = users_by_id.get(str(raw_id))
            
            user_id_for_email = uid or raw_id
            if user_id_for_email:
                email_val = f"{user_id_for_email}@znotify.com"
                if not user:
                    user = users_by_email.get(email_val)
            
            is_new = False
            if not user:
                is_new = True
                user_id_to_set = uid or (str(raw_id) if raw_id else str(uuid.uuid4()))
                user_email_to_set = email_val if email_val else f"{str(uuid.uuid4())}@znotify.com"
                
                user = User(
                    id=user_id_to_set,
                    email=user_email_to_set,
                    name=pr.get("name") or "Unknown Citizen",
                    role="employee",
                    hashed_password=default_password_hash
                )
                users_by_id[user.id] = user
                users_by_email[user.email] = user
            else:
                if pr.get("name"):
                    user.name = pr["name"]
            
            age_val = resolve_age(pr.get("age"), pr.get("dob"))
            user.age = age_val
            
            user.gender = pr.get("gender") or user.gender or "Male"
            
            state_val = pr.get("state_id") or pr.get("state") or ""
            user.state = resolve_state(state_val)
            
            district_val = pr.get("district_id") or pr.get("district") or ""
            user.district = resolve_district(district_val)
            
            user.pincode = pr.get("pincode") or user.pincode
            
            education_id = pr.get("education_id") or pr.get("education") or ""
            if education_id:
                user.education = f"Education-{education_id}" if str(education_id).isdigit() else education_id
            
            occupation_id = pr.get("occupation_id") or pr.get("occupation") or ""
            if occupation_id:
                user.occupation = f"Occupation-{occupation_id}" if str(occupation_id).isdigit() else occupation_id
            
            personal_income_id = pr.get("personal_income_id") or pr.get("personal_income") or pr.get("income")
            if personal_income_id:
                try:
                    user.income = float(personal_income_id) * 30000.0
                except ValueError:
                    try:
                        user.income = float(personal_income_id)
                    except ValueError:
                        pass
            
            marital_status_id = pr.get("marital_status_id") or pr.get("marital_status") or ""
            if marital_status_id:
                user.marital_status = f"Marital-{marital_status_id}" if str(marital_status_id).isdigit() else marital_status_id
            
            house_ownership_id = pr.get("house_ownership_id") or pr.get("house_ownership") or ""
            if house_ownership_id:
                user.house_ownership = f"House-{house_ownership_id}" if str(house_ownership_id).isdigit() else house_ownership_id
            
            caste_id = pr.get("caste_id") or pr.get("caste_category") or pr.get("caste")
            if caste_id:
                user.caste_category = f"Caste-{caste_id}" if str(caste_id).isdigit() else caste_id
            
            diff_abled = pr.get("differently_abled") or pr.get("disability_status")
            if diff_abled:
                user.disability_status = "Locomotor" if str(diff_abled).upper() in ("TRUE", "YES") else "None"
            
            user.mobile = pr.get("mobile_no") or pr.get("mobile") or user.mobile
            
            if is_new:
                db.add(user)
            
        db.commit()
    except Exception as e:
        print(f"Error in background_upsert_users: {e}")
        db.rollback()
    finally:
        db.close()


