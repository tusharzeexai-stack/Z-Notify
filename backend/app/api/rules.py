from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import io
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, EligibilityRule, Scheme, Job, Service, MedicalFacility, AuditLog
from app.schemas.all_schemas import RuleResponse, RuleUpdate, SchemeCreate, SchemeResponse, JobCreate, JobResponse, ServiceCreate, ServiceResponse, MedicalFacilityCreate, MedicalFacilityResponse
from typing import List

router = APIRouter(tags=["rules-and-inventories"])

admin_required = RoleChecker(["super-admin", "admin"])
any_user = RoleChecker(["super-admin", "admin", "employee"])

# --- Scoring Weights ---
@router.get("/rules", response_model=RuleResponse)
def get_scoring_weights(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    rule = db.query(EligibilityRule).filter(EligibilityRule.is_active == True).first()
    if not rule:
        # Create default weights
        rule = EligibilityRule(
            state_weight=30,
            district_weight=20,
            income_weight=20,
            age_weight=15,
            occupation_weight=15
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
    return rule

@router.put("/rules", response_model=RuleResponse)
def update_scoring_weights(
    rule_in: RuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    rule = db.query(EligibilityRule).filter(EligibilityRule.is_active == True).first()
    if not rule:
        rule = EligibilityRule()
        db.add(rule)
        
    old_weights = {
        "state": rule.state_weight,
        "district": rule.district_weight,
        "income": rule.income_weight,
        "age": rule.age_weight,
        "occupation": rule.occupation_weight
    }
    
    rule.state_weight = rule_in.state_weight
    rule.district_weight = rule_in.district_weight
    rule.income_weight = rule_in.income_weight
    rule.age_weight = rule_in.age_weight
    rule.occupation_weight = rule_in.occupation_weight
    
    db.commit()
    db.refresh(rule)
    
    # Audit log
    audit = AuditLog(
        action="WEIGHTS_RULE_UPDATE",
        user_id=current_user.id,
        details={
            "old_version": old_weights,
            "new_version": rule_in.model_dump()
        }
    )
    db.add(audit)
    db.commit()
    
    return rule

# --- Welfare Schemes CRUD ---
@router.get("/schemes", response_model=List[SchemeResponse])
def get_schemes(db: Session = Depends(get_db), current_user: User = Depends(any_user)):
    return db.query(Scheme).filter(Scheme.is_deleted == False).all()

@router.post("/schemes", response_model=SchemeResponse)
def create_scheme(
    scheme_in: SchemeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    scheme = Scheme(
        title=scheme_in.title,
        description=scheme_in.description,
        agency=scheme_in.agency,
        benefit_details=scheme_in.benefit_details,
        eligibility_criteria=scheme_in.eligibility_criteria
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme

# --- Jobs CRUD ---
@router.get("/jobs", response_model=List[JobResponse])
def get_jobs(db: Session = Depends(get_db), current_user: User = Depends(any_user)):
    return db.query(Job).filter(Job.is_deleted == False).all()

@router.post("/jobs", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    job = Job(
        sl_no=job_in.sl_no,
        job_type=job_in.job_type,
        job_category=job_in.job_category,
        job_subcategory=job_in.job_subcategory,
        education_qualification=job_in.education_qualification,
        occupation=job_in.occupation,
        job_role_position=job_in.job_role_position,
        name_of_company_person=job_in.name_of_company_person,
        salary_range=job_in.salary_range,
        state=job_in.state,
        city=job_in.city,
        district=job_in.district,
        exp_required=job_in.exp_required,
        job_contact_number=job_in.job_contact_number,
        job_contact_email=job_in.job_contact_email,
        job_url=job_in.job_url,
        mode_of_contact=job_in.mode_of_contact,
        expiry_date=job_in.expiry_date,
        user_id_ref=job_in.user_id_ref,
        status=job_in.status,
        reason_for_rejection=job_in.reason_for_rejection
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.post("/jobs/upload")
async def upload_jobs_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    if not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xls or .xlsx) are supported.")
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # We need exact column mapping. Keep original column names if possible.
        added_count = 0
        skipped_count = 0
        
        for index, row in df.iterrows():
            # Filter approved status
            status_val = str(row.get("Status", "")).strip().lower()
            if "approved" not in status_val:
                skipped_count += 1
                continue
                
            sl_no = str(row.get("Sl. No.", "")).strip()
            if not sl_no or sl_no == "nan":
                import uuid
                sl_no = str(uuid.uuid4())
                
            # Deduplication
            exists = db.query(Job).filter(Job.sl_no == sl_no).first()
            if exists:
                skipped_count += 1
                continue
                
            def safe_str(val):
                s = str(val).strip()
                return s if s != "nan" else None
                
            job = Job(
                sl_no=sl_no,
                job_type=safe_str(row.get("Job Type")),
                job_category=safe_str(row.get("Job Category")),
                job_subcategory=safe_str(row.get("Job Subcategory")),
                education_qualification=safe_str(row.get("Education Qualification")),
                occupation=safe_str(row.get("Occupation")),
                job_role_position=safe_str(row.get("Job Role / Position")),
                name_of_company_person=safe_str(row.get("Name of Company / Person")),
                salary_range=safe_str(row.get("Salary Range")),
                state=safe_str(row.get("State")),
                city=safe_str(row.get("City")),
                district=safe_str(row.get("District")),
                exp_required=safe_str(row.get("Exp. Required")),
                job_contact_number=safe_str(row.get("Job Contact Number")),
                job_contact_email=safe_str(row.get("Job Contact Email")),
                job_url=safe_str(row.get("Job Url")),
                mode_of_contact=safe_str(row.get("Mode Of Contact")),
                expiry_date=safe_str(row.get("Expiry Date")),
                user_id_ref=safe_str(row.get("User Id")),
                status=safe_str(row.get("Status")),
                reason_for_rejection=safe_str(row.get("Reason for Rejection"))
            )
            db.add(job)
            added_count += 1
            
        db.commit()
        return {"status": "success", "added": added_count, "skipped": skipped_count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Excel file: {str(e)}")

# --- Services CRUD ---
@router.get("/services", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db), current_user: User = Depends(any_user)):
    return db.query(Service).filter(Service.is_deleted == False).all()

@router.post("/services", response_model=ServiceResponse)
def create_service(
    service_in: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    service = Service(
        title=service_in.title,
        description=service_in.description,
        department=service_in.department,
        eligibility_criteria=service_in.eligibility_criteria
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

# --- Medical Facilities CRUD ---
@router.get("/medical-facilities", response_model=List[MedicalFacilityResponse])
def get_facilities(db: Session = Depends(get_db), current_user: User = Depends(any_user)):
    return db.query(MedicalFacility).filter(MedicalFacility.is_deleted == False).all()

@router.post("/medical-facilities", response_model=MedicalFacilityResponse)
def create_facility(
    fac_in: MedicalFacilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    facility = MedicalFacility(
        name=fac_in.name,
        type=fac_in.type,
        location=fac_in.location,
        services_offered=fac_in.services_offered
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility
