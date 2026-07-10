from sqlalchemy.orm import Session
from app.models.all_models import User, EligibilityRule
from app.core.config import settings
from typing import Dict, Any, Tuple

def calculate_eligibility_score(user: User, criteria: Dict[str, Any], db: Session) -> Tuple[float, str]:
    # 1. Fetch active weights
    rule = db.query(EligibilityRule).filter(EligibilityRule.is_active == True).first()
    w_state = rule.state_weight if rule else settings.DEFAULT_WEIGHT_STATE
    w_district = rule.district_weight if rule else settings.DEFAULT_WEIGHT_DISTRICT
    w_income = rule.income_weight if rule else settings.DEFAULT_WEIGHT_INCOME
    w_age = rule.age_weight if rule else settings.DEFAULT_WEIGHT_AGE
    w_occupation = rule.occupation_weight if rule else settings.DEFAULT_WEIGHT_OCCUPATION
    
    # Base check for hard filters (Gender, Disability, caste)
    if not criteria:
        return 100.0, "No eligibility criteria specified. Automatically matches."
        
    reasons = []
    score = 0.0
    total_possible_weight = w_state + w_district + w_income + w_age + w_occupation
    
    # A. Hard Filters
    # Gender check
    c_gender = criteria.get("gender")
    if c_gender and c_gender.lower() not in ["any", "all", ""]:
        if user.gender and user.gender.lower() != c_gender.lower():
            return 0.0, f"Gender mismatch (Requires: {c_gender}, User: {user.gender})"
            
    # Disability check
    c_disability = criteria.get("disability_status")
    if c_disability and c_disability.lower() not in ["any", "none", ""]:
        if user.disability_status and user.disability_status.lower() != c_disability.lower():
            return 0.0, f"Disability status mismatch (Requires: {c_disability})"
            
    # Caste check
    c_caste = criteria.get("caste_category")
    if c_caste and c_caste.lower() not in ["any", "all", ""]:
        if user.caste_category and user.caste_category.lower() != c_caste.lower():
            return 0.0, f"Caste category mismatch (Requires: {c_caste})"

    # B. Weighted matching
    # State matching
    c_state = criteria.get("state")
    if not c_state or c_state.lower() in ["any", "all", ""]:
        score += w_state
        reasons.append("State: Eligible (Any State)")
    elif user.state and user.state.lower() == c_state.lower():
        score += w_state
        reasons.append(f"State: Match ({user.state})")
    else:
        reasons.append(f"State: Mismatch (Requires {c_state})")

    # District matching
    c_district = criteria.get("district")
    if not c_district or c_district.lower() in ["any", "all", ""]:
        score += w_district
        reasons.append("District: Eligible (Any District)")
    elif user.district and user.district.lower() == c_district.lower():
        score += w_district
        reasons.append(f"District: Match ({user.district})")
    else:
        reasons.append(f"District: Mismatch (Requires {c_district})")

    # Income matching
    c_income_max = criteria.get("income_max")
    if c_income_max is None:
        score += w_income
        reasons.append("Income: Eligible (No Limit)")
    elif user.income is not None and user.income <= float(c_income_max):
        score += w_income
        reasons.append(f"Income: Match (User: {user.income} <= Max: {c_income_max})")
    else:
        reasons.append(f"Income: Exceeds Limit (User: {user.income} > Max: {c_income_max})")

    # Age matching
    c_age_min = criteria.get("age_min")
    c_age_max = criteria.get("age_max")
    age_ok = True
    if c_age_min is not None and user.age is not None and user.age < int(c_age_min):
        age_ok = False
    if c_age_max is not None and user.age is not None and user.age > int(c_age_max):
        age_ok = False
        
    if age_ok:
        score += w_age
        reasons.append(f"Age: Match (User: {user.age})")
    else:
        reasons.append(f"Age: Out of range (User: {user.age}, Range: {c_age_min}-{c_age_max})")

    # Occupation matching
    c_occupation = criteria.get("occupation")
    if not c_occupation or c_occupation.lower() in ["any", "all", ""]:
        score += w_occupation
        reasons.append("Occupation: Eligible (Any Occupation)")
    elif user.occupation and user.occupation.lower() == c_occupation.lower():
        score += w_occupation
        reasons.append(f"Occupation: Match ({user.occupation})")
    else:
        reasons.append(f"Occupation: Mismatch (Requires {c_occupation})")

    # Normalize score to 100 max
    final_score = (score / total_possible_weight) * 100.0 if total_possible_weight > 0 else 0.0
    reason_str = " | ".join(reasons)
    
    return round(final_score, 1), reason_str
