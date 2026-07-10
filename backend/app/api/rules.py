from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import RoleChecker
from app.models.all_models import User, EligibilityRule, Scheme, Job, Service, MedicalFacility, AuditLog
from app.schemas.all_schemas import RuleResponse, RuleUpdate, SchemeCreate, SchemeResponse, JobCreate, JobResponse, ServiceCreate, ServiceResponse, MedicalFacilityCreate, MedicalFacilityResponse
from typing import List

router = APIRouter(tags=["rules-and-inventories"])

admin_required = RoleChecker(["super-admin", "admin"])

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
def get_schemes(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
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
def get_jobs(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return db.query(Job).filter(Job.is_deleted == False).all()

@router.post("/jobs", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    job = Job(
        title=job_in.title,
        description=job_in.description,
        department=job_in.department,
        salary=job_in.salary,
        location=job_in.location,
        eligibility_criteria=job_in.eligibility_criteria
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

# --- Services CRUD ---
@router.get("/services", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
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
def get_facilities(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
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
