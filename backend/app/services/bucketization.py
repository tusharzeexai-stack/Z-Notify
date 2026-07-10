from typing import List

BUCKETS = [
    "Employment",
    "Education",
    "Healthcare",
    "Housing",
    "Welfare",
    "Skill Development",
    "Agriculture",
    "Women Empowerment",
    "Senior Citizens",
    "Disability Support"
]

def classify_notification_bucket(title: str, description: str) -> str:
    """
    Scans titles and descriptions to assign one of the 10 HPNS buckets.
    """
    text = (title + " " + description).lower()
    
    # 1. Agriculture
    if any(k in text for k in ["farmer", "kisan", "crop", "fertilizer", "irrigation", "soil", "agriculture", "harvest", "seed"]):
        return "Agriculture"
        
    # 2. Healthcare
    if any(k in text for k in ["health", "medical", "hospital", "clinic", "doctor", "treatment", "ayushman", "vaccine", "therapy", "disease"]):
        return "Healthcare"
        
    # 3. Disability Support
    if any(k in text for k in ["disability", "disabled", "wheelchair", "divyang", "blind", "deaf", "handicap", "prosthetic"]):
        return "Disability Support"
        
    # 4. Senior Citizens
    if any(k in text for k in ["senior", "pension", "elderly", "old age", "geriatric", "retirement"]):
        return "Senior Citizens"
        
    # 5. Women Empowerment
    if any(k in text for k in ["women", "girl", "female", "beti", "mother", "pregnancy", "matritva", "widow", "mahila"]):
        return "Women Empowerment"
        
    # 6. Employment
    if any(k in text for k in ["job", "vacancy", "hiring", "recruitment", "salary", "employment", "career", "work force", "internship"]):
        return "Employment"
        
    # 7. Education
    if any(k in text for k in ["school", "college", "scholarship", "university", "student", "degree", "education", "literacy", "exam"]):
        return "Education"
        
    # 8. Skill Development
    if any(k in text for k in ["skill", "training", "vocational", "workshop", "apprentice", "upskill", "kaushal"]):
        return "Skill Development"
        
    # 9. Housing
    if any(k in text for k in ["house", "housing", "flat", "awas", "construction", "home loan", "residential"]):
        return "Housing"
        
    # 10. Welfare (Default fallback)
    return "Welfare"
