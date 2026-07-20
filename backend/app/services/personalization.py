import os
import csv
import logging
import json
import requests
from app.core.config import settings
from app.models.all_models import User
from app.api.mappings import (
    resolve_income,
    resolve_family_type,
    resolve_working_status,
    resolve_occupation,
    resolve_district,
    resolve_house_ownership
)

logger = logging.getLogger(__name__)

from app.api.mappings import resolve_state, resolve_district, resolve_occupation

def generate_personal_why_bullets(user, title: str, category: str, raw_content: str = "", user_signals: dict = None) -> list:
    """
    Generate genuinely unique, data-driven 'Why this notification?' bullets
    based on the actual scheme/service name, user's occupation, income, caste,
    age, disability status, district, click behaviour, and survey signals.
    """
    # --- Resolve user profile attributes ---
    raw_occ = getattr(user, 'occupation', None) or "citizen"
    if "-" in str(raw_occ):
        raw_occ = str(raw_occ).split("-")[1]
    occupation = resolve_occupation(raw_occ) or raw_occ
    # Clean up meaningless occupation values from ID resolution
    if not occupation or str(occupation).lower().strip() in ["not applicable", "n/a", "na", "none", "", "citizen"]:
        occ_from_user = str(getattr(user, 'occupation', '') or '')
        occupation = occ_from_user if occ_from_user and len(occ_from_user) > 2 else "Farmer"

    raw_dist = getattr(user, 'district', None) or "your district"
    if "-" in str(raw_dist):
        raw_dist = str(raw_dist).split("-")[1]
    district = resolve_district(raw_dist) or raw_dist

    raw_state = getattr(user, 'state', None) or "Maharashtra"
    if "-" in str(raw_state):
        raw_state = str(raw_state).split("-")[1]
    state = resolve_state(raw_state) or raw_state

    income = getattr(user, 'income', None) or 60000.0
    age = getattr(user, 'age', None)
    caste = getattr(user, 'caste_category', None) or ""
    disability = getattr(user, 'disability_status', None) or ""
    gender = getattr(user, 'gender', None) or ""
    bpl = getattr(user, 'bpl_category', None)

    # --- Extract actual scheme/service name and details from raw_content ---
    scheme_name = ""
    service_name = ""
    agency = ""
    benefits_text = ""
    eligibility_text = ""
    location_text = ""

    if raw_content:
        for line in raw_content.split("\n"):
            line = line.strip()
            if line.startswith("Scheme:"):
                scheme_name = line.split("Scheme:", 1)[1].strip()
            elif line.startswith("Service:"):
                service_name = line.split("Service:", 1)[1].strip()
            elif line.startswith("Agency:") or line.startswith("Administered by:"):
                agency = line.split(":", 1)[1].strip()
            elif line.startswith("Benefits:"):
                benefits_text = line.split("Benefits:", 1)[1].strip()[:150]
            elif line.startswith("Eligibility:"):
                raw_elig = line.split("Eligibility:", 1)[1].strip()
                # Convert JSON eligibility criteria into human-readable text
                if raw_elig.strip().startswith("{"):
                    try:
                        elig_obj = json.loads(raw_elig)
                        parts = []
                        if elig_obj.get("occupation") and str(elig_obj["occupation"]).lower() not in ["any", "", "null", "none"]:
                            parts.append(f"Occupation: {elig_obj['occupation']}")
                        if elig_obj.get("gender") and str(elig_obj["gender"]).lower() not in ["any", "", "null", "none"]:
                            parts.append(f"Gender: {elig_obj['gender']}")
                        if elig_obj.get("income_max") and float(elig_obj["income_max"]) < 999999:
                            parts.append(f"Income under \u20b9{int(float(elig_obj['income_max'])):,}/year")
                        if elig_obj.get("state") and str(elig_obj["state"]).lower() not in ["any", "", "null", "none", "all india"]:
                            parts.append(f"State: {elig_obj['state']}")
                        if elig_obj.get("age_min") and int(elig_obj.get("age_min", 0)) > 0:
                            parts.append(f"Age: {elig_obj['age_min']}–{elig_obj.get('age_max', 120)} years")
                        if elig_obj.get("caste") and str(elig_obj["caste"]).lower() not in ["any", "", "null", "none"]:
                            parts.append(f"Category: {elig_obj['caste']}")
                        eligibility_text = ", ".join(parts) if parts else ""
                    except Exception:
                        eligibility_text = ""
                else:
                    eligibility_text = raw_elig[:150]
            elif line.startswith("Location:") or line.startswith("Address:"):
                location_text = line.split(":", 1)[1].strip()

    # Use scheme/service name if available, else fall back to title
    notification_name = scheme_name or service_name or title or "this scheme"

    # --- Pull behavioural signals ---
    signals = user_signals or {}
    is_farmer = "farm" in occupation.lower() or "agri" in occupation.lower() or signals.get("is_farmer", False)
    health_problem = signals.get("health_problem_present", False)
    training_interest = signals.get("training_interest", False)
    major_farming_problem = signals.get("major_farming_problem", "")
    scheme_score = float(signals.get("scheme_score", 0))
    health_bucket = int(signals.get("health_bucket_score", 0))
    agri_bucket = int(signals.get("agri_bucket_score", 0))
    skills_bucket = int(signals.get("skills_bucket_score", 0))

    t_lower = (notification_name + " " + category).lower()
    cat_lower = category.lower()

    # ══════════════════════════════════════════════
    # BULLET 1 — Personalised scheme-to-occupation fit
    # Unique per notification name + occupation + signals
    # ══════════════════════════════════════════════
    if any(k in t_lower for k in ["earing", "hearing", "disability", "divyang", "differently abled", "handicap", "pwd"]):
        if disability and str(disability).lower() not in ["none", "no", ""]:
            bullet_1 = f"Selected for you as a person with {disability}: '{notification_name}' provides targeted assistive benefits for differently-abled citizens."
        else:
            bullet_1 = f"'{notification_name}' extends welfare support to citizens with disability status — check your eligibility today."
    elif any(k in t_lower for k in ["sewing", "stitching", "tailoring", "women", "mahila", "self help group", "shg", "matru"]):
        if "female" in gender.lower() or "woman" in gender.lower() or "f" == gender.lower().strip():
            bullet_1 = f"'{notification_name}' is designed specifically for women to boost self-reliance and income — directly aligned with your profile as a {occupation}."
        else:
            bullet_1 = f"'{notification_name}' supports women-focused livelihood initiatives in {district} — relevant to your household's welfare."
    elif any(k in t_lower for k in ["maan-dhan", "maandhan", "maan dhan", "pm-kmy", "kmy", "pension", "old age", "vridha", "senior", "retirement"]):
        age_str = f" at age {int(age)}" if age else ""
        bullet_1 = f"'{notification_name}' guarantees you a fixed monthly pension of \u20b93,000 after age 60{age_str} — securing your post-retirement income as a small and marginal farmer."
    elif any(k in t_lower for k in ["samman nidhi", "pm-kisan", "pmkisan", "kisan samman", "income support"]):
        bullet_1 = f"'{notification_name}' provides a direct cash income support of \u20b96,000 per year to eligible farmers — credited directly to your bank account in three equal instalments."
    elif any(k in t_lower for k in ["insurance", "bima", "crop", "damage", "weather", "fasal"]):
        bullet_1 = f"'{notification_name}' directly protects your livelihood as a {occupation} against crop loss, extreme weather, and seasonal income disruption."
    elif any(k in t_lower for k in ["loan", "credit", "interest", "bank", "kcc", "mudra"]):
        bullet_1 = f"'{notification_name}' offers concessional credit to active {occupation}s — reducing your dependency on informal money lenders."
    elif any(k in t_lower for k in ["tractor", "machinery", "tool", "equipment", "implement", "solar pump"]):
        bullet_1 = f"'{notification_name}' provides a capital subsidy on farm machinery and equipment — reducing your upfront investment costs as a {occupation}."
    elif any(k in t_lower for k in ["irrigation", "well", "pond", "water", "pump", "drip"]):
        bullet_1 = f"'{notification_name}' can fund water access and irrigation infrastructure for your farmland — addressing a critical input gap for {occupation}s."
    elif any(k in t_lower for k in ["primary health", "phc", "hospital", "medical", "clinic", "chc", "dispensary"]):
        bullet_1 = f"'{notification_name}' is a government-verified healthcare facility in {district} — offering free or subsidised consultations, diagnostics, and treatments."
    elif any(k in t_lower for k in ["ayushman", "jan arogya", "health card", "pmjay"]):
        bullet_1 = f"'{notification_name}' provides cashless hospitalisation coverage of up to \u20b95 lakh per year — your household income profile makes you eligible."
    elif any(k in t_lower for k in ["skill", "training", "rseti", "pmkvy", "stipend", "course", "vocational"]):
        bullet_1 = f"'{notification_name}' offers certified skill training with a government stipend — aligned with your professional development goals as a {occupation}."
    elif any(k in t_lower for k in ["job", "hire", "vacancy", "recruitment", "rozgar", "employment"]):
        bullet_1 = f"'{notification_name}' is a curated employment opportunity for a {occupation} in {district} — matched from your occupation and location profile."
    elif any(k in t_lower for k in ["scholarship", "fellowship", "student", "education", "vidya"]):
        bullet_1 = f"'{notification_name}' offers financial scholarship support to reduce educational expenses — aligned with your household's income and family needs."
    elif major_farming_problem and agri_bucket > 0:
        bullet_1 = f"'{notification_name}' directly addresses your survey-reported challenge — '{major_farming_problem[:80]}' — identified from your Z-Notify profile responses."
    elif health_problem and health_bucket > 0:
        bullet_1 = f"'{notification_name}' is matched to your health concerns recorded in your survey — providing access to medical support in {district}."
    elif scheme_score > 5:
        bullet_1 = f"'{notification_name}' is recommended based on your demonstrated interest in government welfare schemes — detected from your in-app browsing activity."
    elif agri_bucket > 2:
        bullet_1 = f"'{notification_name}' aligns with your strong agricultural profile — {agri_bucket} farm-related survey signals identified from your responses."
    elif skills_bucket > 2:
        bullet_1 = f"'{notification_name}' aligns with your skills development interest — {skills_bucket} skilling-related signals identified from your survey responses."
    else:
        bullet_1 = f"'{notification_name}' is recommended for your occupation as a {occupation} in {district} — selected based on your Z-Notify profile and welfare eligibility criteria."

    # ══════════════════════════════════════════════
    # BULLET 2 — Eligibility: demographic fit
    # Unique per income / caste / disability / gender / age
    # ══════════════════════════════════════════════
    demo_parts = []
    if bpl:
        demo_parts.append("BPL (Below Poverty Line) status")
    if income and float(income) > 0:
        demo_parts.append(f"annual family income under ₹{int(float(income)):,}")
    if caste and str(caste).strip().lower() not in ["general", "", "none"]:
        demo_parts.append(f"{caste} caste category preference")
    if disability and str(disability).lower() not in ["none", "no", ""]:
        demo_parts.append(f"{disability} disability classification")
    if gender and str(gender).lower() in ["female", "woman", "f"]:
        demo_parts.append("women-targeted benefit criteria")
    if age:
        age_int = int(age)
        if age_int >= 60:
            demo_parts.append(f"senior citizen age bracket ({age_int} yrs)")
        elif age_int < 25:
            demo_parts.append(f"youth age bracket ({age_int} yrs)")
        else:
            demo_parts.append(f"age group ({age_int} yrs)")

    if eligibility_text and len(eligibility_text) > 5:
        bullet_2 = f"Your profile meets the scheme eligibility criteria: {eligibility_text[:130]} — making you a qualifying applicant."
    elif demo_parts:
        bullet_2 = f"Your profile satisfies the key eligibility requirements — {', '.join(demo_parts[:3])} — qualifying you for: {benefits_text or 'direct government welfare benefits'}."
    else:
        bullet_2 = f"Based on your registered income (under \u20b9{int(float(income)):,}/year) and occupation as a {occupation}, you qualify for the benefits under this scheme."

    # ══════════════════════════════════════════════
    # BULLET 3 — Geographic/Administrative validity
    # Unique per district, state, agency, location
    # ══════════════════════════════════════════════
    if location_text:
        bullet_3 = f"Located at: {location_text} — serving residents of {district}, {state}. Official government-verified listing."
    elif agency:
        bullet_3 = f"Administered by {agency} for eligible residents of {district}, {state} — data sourced directly from Z-Notify's synchronized government database."
    else:
        bullet_3 = f"Available to eligible residents of {district}, {state} — verified and synchronized from Z-Notify's official government scheme database."

    return [bullet_1, bullet_2, bullet_3]




def call_gemini_api(api_key: str, prompt: str) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            result = response.json()
            text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            return json.loads(text)
        else:
            logger.warning(f"Gemini API returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.warning(f"Error calling Gemini API: {e}")
    return None

def generate_mock_personalization_json(
    user: User, 
    title: str, 
    category: str, 
    score: float, 
    match_reason: str,
    primary_category: str = "Content Reader",
    notification_tag: str = "Responsive",
    preferred_language: str = "English",
    bpl_category: bool = False,
    occupation: str = "",
    working_status: str = "",
    district: str = "",
    raw_content: str = ""
) -> dict:
    # 1. Determine Behavioral Segment (B1-B5)
    # primary_category: B1 = Content Reader, B2 = High Converter, B3 = Job Hunter, B4 = Scheme Seeker, B5 = Service Explorer
    b_map = {
        "content reader": ("B1", "Passive Browser"),
        "high converter": ("B2", "Power Converter"),
        "job hunter": ("B3", "Aspiring Job Seeker"),
        "scheme seeker": ("B4", "Benefit Seeker"),
        "service explorer": ("B5", "Local Service Explorer"),
    }
    primary_category_clean = (primary_category or "Content Reader").lower().strip()
    B_code, B_catalog_name = b_map.get(primary_category_clean, ("B1", "Passive Browser"))

    # 2. Determine Life-Need Domain (D1-D3)
    # D1 = Health, D2 = Skills, D3 = Agriculture
    title_lower = title.lower()
    category_lower = category.lower()

    # Clean variables up with fallback to User model
    occ_val = occupation or user.occupation or ""
    occ_clean = str(occ_val).lower().strip()

    dist_val = district or user.district or ""
    dist_clean = str(dist_val).lower().strip()

    pref_lang = str(preferred_language or "English").lower()
    is_bpl = bpl_category or getattr(user, "bpl_category", False) or False

    if category_lower == "job":
        D_code, D_name = "D2", "Skills"
    elif category_lower in ["clinic", "healthcare"]:
        D_code, D_name = "D1", "Health"
    else:
        # Check title keywords
        is_agri = any(k in title_lower for k in ["kisan", "farm", "agri", "land", "crop", "seed", "irrigate", "sincha", "soil", "organic", "fertilizer", "pest", "livestock", "sheti", "shetkari"])
        is_health = any(k in title_lower for k in ["health", "medical", "doctor", "treatment", "hospital", "clinic", "disease", "illness", "medicine", "vaccine", "immunis", "arogya"])
        is_skills = any(k in title_lower for k in ["skill", "training", "fellowship", "scholarship", "job", "career", "employ", "stipend", "certif"])
        
        if is_agri:
            D_code, D_name = "D3", "Agriculture"
        elif is_health:
            D_code, D_name = "D1", "Health"
        elif is_skills:
            D_code, D_name = "D2", "Skills"
        else:
            # Fallback based on occupation
            if "farm" in occ_clean or "agri" in occ_clean:
                D_code, D_name = "D3", "Agriculture"
            elif "student" in occ_clean or "unemploy" in occ_clean:
                D_code, D_name = "D2", "Skills"
            else:
                D_code, D_name = "D1", "Health"

    # 3. Determine Life-Context Cluster (LC1-LC4)
    # LC1 = Farm & Land-Based, LC2 = Home & Family-Based, LC3 = Employed & Working, LC4 = Youth & Job-Seeking
    if any(k in occ_clean for k in ["farmer", "agricultural", "farm"]):
        LC_code, LC_name = "LC1", "Farm & Land-Based"
    elif any(k in occ_clean for k in ["homemaker", "retired", "dependent", "housewife"]):
        LC_code, LC_name = "LC2", "Home & Family-Based"
    elif any(k in occ_clean for k in ["student", "unemployed", "not working"]):
        LC_code, LC_name = "LC4", "Youth & Job-Seeking"
    else:
        LC_code, LC_name = "LC3", "Employed & Working"

    # 4. Overlays (X1-X6)
    overlays = []
    if is_bpl or (user.income and user.income < 120000):
        overlays.append("X4")
    if pref_lang not in ["en", "english", "hi", "hindi", "mr", "marathi"]:
        overlays.append("X5")
    if any(k in dist_clean for k in ["mumbai", "suburban", "thane", "pune"]):
        overlays.append("X6")

    assigned_persona_id = f"{B_code}-{D_code}-{LC_code}"
    assigned_persona_name = f"{LC_name} {B_catalog_name} — {D_name} Need"

    # 5. Localization & Copy Generation
    # Language code mapping
    lang_code = "en"
    if "mr" in pref_lang or "marathi" in pref_lang:
        lang_code = "mr"
    elif "hi" in pref_lang or "hindi" in pref_lang:
        lang_code = "hi"

    # Templates dictionary
    templates = {
        "mr": {
            "welfare_agri": {
                "title": "शेतकरी योजना अपडेट 🌾",
                "body": f"तुम्ही {title} साठी पात्र आहात. त्वरित अर्ज करा आणि लाभ घ्या.",
                "cta": "पात्रता तपासा"
            },
            "welfare_health": {
                "title": "आरोग्य योजना अपडेट 🏥",
                "body": f"मोफत उपचारांसाठी {title} मध्ये नोंदणी करा. आजच माहिती मिळवा.",
                "cta": "माहिती पहा"
            },
            "welfare_skills": {
                "title": "कौशल्य विकास योजना 🎓",
                "body": f"{title} अंतर्गत मोफत प्रशिक्षण घ्या आणि रोजगार मिळवा.",
                "cta": "प्रशिक्षण पहा"
            },
            "job": {
                "title": "नवीन नोकरीची संधी 💼",
                "body": f"{title} पदासाठी त्वरित अर्ज करा. शैक्षणिक पात्रता आणि माहिती पहा.",
                "cta": "नोकरी पहा"
            },
            "service": {
                "title": "नागरी सेवा अपडेट 🏛️",
                "body": f"{title} सेवेचा लाभ घेण्यासाठी जवळच्या केंद्राला भेट द्या.",
                "cta": "सेवा पहा"
            },
            "clinic": {
                "title": "आरोग्य केंद्र माहिती 🩺",
                "body": f"{title} मध्ये मोफत तपासणी आणि औषधोपचार उपलब्ध. पत्ता पहा.",
                "cta": "पत्ता पहा"
            }
        },
        "hi": {
            "welfare_agri": {
                "title": "किसान योजना अपडेट 🌾",
                "body": f"आप {title} के लिए पात्र हैं। तुरंत आवेदन करें और लाभ उठाएं।",
                "cta": "पात्रता जांचें"
            },
            "welfare_health": {
                "title": "स्वास्थ्य योजना अपडेट 🏥",
                "body": f"मुफ्त इलाज के लिए {title} में पंजीकरण करें। आज ही जानकारी प्राप्त करें।",
                "cta": "जानकारी देखें"
            },
            "welfare_skills": {
                "title": "कौशल विकास योजना 🎓",
                "body": f"{title} के तहत मुफ्त प्रशिक्षण प्राप्त करें और रोजगार पाएं।",
                "cta": "प्रशिक्षण देखें"
            },
            "job": {
                "title": "नई नौकरी का अवसर 💼",
                "body": f"{title} पद के लिए तुरंत आवेदन करें। आवश्यक योग्यता और विवरण देखें।",
                "cta": "नौकरी देखें"
            },
            "service": {
                "title": "नागरिक सेवा अपडेट 🏛️",
                "body": f"{title} सेवा का लाभ उठाने के लिए नजदीकी केंद्र पर जाएं।",
                "cta": "सेवा देखें"
            },
            "clinic": {
                "title": "स्वास्थ्य केंद्र विवरण 🩺",
                "body": f"{title} में मुफ्त जांच और उपचार उपलब्ध है। पता देखें।",
                "cta": "पता देखें"
            }
        },
        "en": {
            "welfare_agri": {
                "title": "Farmer Scheme Update 🌾",
                "body": f"You are eligible for {title}. Apply now to claim your benefits.",
                "cta": "Check Eligibility"
            },
            "welfare_health": {
                "title": "Health Scheme Update 🏥",
                "body": f"Register for {title} to receive free healthcare coverage.",
                "cta": "View Details"
            },
            "welfare_skills": {
                "title": "Skills Program Update 🎓",
                "body": f"Enroll in {title} to learn new skills with government stipend.",
                "cta": "View Program"
            },
            "job": {
                "title": "New Job Opportunity 💼",
                "body": f"Apply for {title} in your area. Check eligibility requirements.",
                "cta": "See Jobs"
            },
            "service": {
                "title": "Citizen Service Update 🏛️",
                "body": f"Access {title} service at your nearest local center.",
                "cta": "Find Center"
            },
            "clinic": {
                "title": "Medical Facility Alert 🩺",
                "body": f"Visit {title} for medical consultations and treatments.",
                "cta": "Find Clinic"
            }
        }
    }

    # Select template type
    tpl_type = "service"
    if category_lower in ["clinic", "healthcare"]:
        tpl_type = "clinic"
    elif category_lower == "job":
        tpl_type = "job"
    elif category_lower == "welfare":
        if D_code == "D3":
            tpl_type = "welfare_agri"
        elif D_code == "D1":
            tpl_type = "welfare_health"
        else:
            tpl_type = "welfare_skills"

    # Get templates for the specific language
    lang_templates = templates.get(lang_code, templates["en"])
    tpl = lang_templates.get(tpl_type, lang_templates["service"])

    title_text = tpl["title"]
    body_text = tpl["body"]
    cta_label = tpl["cta"]

    # Adjust for BPL (X4) overlay if applicable
    if "X4" in overlays:
        if lang_code == "mr":
            body_text = "पूर्णपणे मोफत! " + body_text
        elif lang_code == "hi":
            body_text = "बिल्कुल मुफ्त! " + body_text
        else:
            body_text = "Completely free! " + body_text

    _signals_for_bullets = {
        "is_farmer": "farm" in str(getattr(user, 'occupation', '') or '').lower(),
        "scheme_score": 0,
        "health_bucket_score": 0,
        "agri_bucket_score": 0,
        "skills_bucket_score": 0,
        "health_problem_present": False,
        "major_farming_problem": "",
        "training_interest": False,
    }
    why_bullets = generate_personal_why_bullets(user, title, category, raw_content or match_reason, user_signals=_signals_for_bullets)

    portal_link = ""
    raw_text_val = raw_content or match_reason
    if raw_text_val:
        for line in raw_text_val.split("\n"):
            if any(line.startswith(k) for k in ["Official Portal:", "Agency:", "Source:", "Portal:"]):
                val = line.split(":", 1)[1].strip()
                if val.startswith("http") or "." in val:
                    portal_link = val
                    break

    return {
        "title": title_text,
        "personalized_content": body_text,
        "language": lang_code,
        "vector": assigned_persona_id,
        "segment": assigned_persona_name,
        "strategy": ", ".join(overlays) if overlays else "None",
        "why_bullets": why_bullets,
        "portal_link": portal_link,
        
        # New keys matching Section 5 shape
        "user_id": str(user.id),
        "assigned_persona_id": assigned_persona_id,
        "assigned_persona_name": assigned_persona_name,
        "overlays_applied": overlays,
        "domain_confidence": "confirmed",
        "cadence_tier": "win-back" if notification_tag == "Not Responsive" else "standard",
        "notification_title": title_text,
        "notification_body": body_text,
        "cta_label": cta_label,
        "language_used": "Marathi" if lang_code == "mr" else ("Hindi" if lang_code == "hi" else "English"),
        "needs_manual_localisation_review": "X5" in overlays,
        "reasoning_note": f"Matched demographic attributes for {assigned_persona_name} with score of {score}%."
    }

def personalize_notification_content(
    user: User, 
    title: str, 
    raw_content: str, 
    category: str, 
    score: float, 
    match_reason: str,
    gemini_api_key: str = None,
    user_data: dict = None
) -> str:
    """
    Translates raw notification text into a clear, citizen-friendly, personalized message.
    Returns a JSON serialized string containing structured personalization metadata.
    """
    # Initialize default scope variables
    assigned_persona_id = ""
    assigned_persona_name = ""
    overlays_applied = ""
    health_bucket_score = 0
    agri_bucket_score = 0
    skills_bucket_score = 0
    primary_category = "Content Reader"
    notification_tag = "Responsive"

    if user_data:
        p = user_data
        content_score = float(user_data.get("content_score", 0.0))
        scheme_score = float(user_data.get("scheme_score", 0.0))
        job_score = float(user_data.get("job_score", 0.0))
        service_score = float(user_data.get("service_score", 0.0))
        primary_category = user_data.get("primary_category", "Content Reader")
        notification_tag = user_data.get("notification_tag", "Engaged")
        engagement_time_min = float(user_data.get("engagement_time_min", 0.0))
        
        preferred_language = user_data.get("preferred_language", "English")
        bpl_category = str(user_data.get("bpl_category", "")).lower() in ("true", "1", "yes")
        personal_income = user_data.get("personal_income", "")
        family_income = user_data.get("family_income", "")
        family_type_id = user_data.get("family_type_id", "")
        Occupation = user_data.get("Occupation", "") or user_data.get("occupation", "")
        Working_status = user_data.get("Working_status", "") or user_data.get("working_status", "")
        district = user_data.get("district", "")
        house_ownership = user_data.get("house_ownership", "")
        
        assigned_persona_id = user_data.get("assigned_persona_id", "")
        assigned_persona_name = user_data.get("assigned_persona_name", "")
        overlays_applied = user_data.get("overlays_applied", "")
        health_bucket_score = int(user_data.get("health_bucket_score", 0))
        agri_bucket_score = int(user_data.get("agri_bucket_score", 0))
        skills_bucket_score = int(user_data.get("skills_bucket_score", 0))
        
        health_problem_present = health_bucket_score > 0
        is_farmer = "farmer" in str(Occupation).lower() or "agricultural" in str(Occupation).lower() or agri_bucket_score > 0
        training_interest = "student" in str(Working_status).lower() or skills_bucket_score > 0
        major_farming_problem = ""
        
        # Load survey answers if available in file to retrieve major_farming_problem
        user_survey_answers = []
        survey_paths = [
            "hsa survey answers .csv",
            "D:\\Z-Notify\\frontend\\public\\Survey\\hsa survey answers .csv",
            "d:\\Z-Notify\\frontend\\public\\Survey\\hsa survey answers .csv",
            "..\\frontend\\public\\Survey\\hsa survey answers .csv"
        ]
        for sp in survey_paths:
            if os.path.exists(sp):
                try:
                    with open(sp, mode="r", encoding="utf-8") as f:
                        s_reader = csv.DictReader(f)
                        for row in s_reader:
                            if row.get("survey_name") != "Health-Skill-Agriculture Survey (HSA)":
                                continue
                            u_id = row.get("user_id")
                            if u_id:
                                try:
                                    clean_u_id = str(int(float(u_id)))
                                except ValueError:
                                    clean_u_id = str(u_id).strip()
                                try:
                                    clean_user_id = str(int(float(user.id)))
                                except ValueError:
                                    clean_user_id = str(user.id)
                                if clean_u_id == clean_user_id or str(u_id).strip() == user.id:
                                    user_survey_answers.append(row)
                    break
                except Exception:
                    pass
        if user_survey_answers:
            for ans in user_survey_answers:
                q_title = ans.get("question_title", "")
                ans_val = ans.get("answer_display_value_string") or ans.get("answer_value_string") or ""
                norm_q = q_title.lower()
                if "major difficulties" in norm_q or "मुख्य समस्या" in norm_q or "मुख्य आव्हानाचा" in norm_q or "problem at work" in norm_q:
                    major_farming_problem = ans_val
    else:
        # 1. Load raw profile dict 'p' for this user from UserProfiledetails CSV to get all demographic variables
        profile_csv_path = "UserProfiledetails_users_202606021836.csv"
        possible_paths = [
            os.path.join("D:\\Z-Notify", profile_csv_path),
            os.path.join("d:\\Z-Notify", profile_csv_path),
            profile_csv_path,
            os.path.join("..", profile_csv_path),
            os.path.join("backend", profile_csv_path)
        ]
        selected_path = None
        for p_path in possible_paths:
            if os.path.exists(p_path):
                selected_path = p_path
                break
                
        p = {}
        if selected_path:
            try:
                clean_id = str(int(float(user.id)))
            except ValueError:
                clean_id = str(user.id)
            try:
                with open(selected_path, mode="r", encoding="utf-8") as f:
                    p_reader = csv.DictReader(f)
                    for pr in p_reader:
                        if pr.get("id") == clean_id or pr.get("uid") == user.id:
                            p = pr
                            break
            except Exception as e:
                logger.warning(f"Error loading UserProfiledetails CSV in personalization: {e}")

        # 2. Load user click row from Userwise_clicks.csv
        click_row = {}
        clicks_path = "Userwise_clicks.csv"
        possible_click_paths = [
            os.path.join("D:\\Z-Notify", clicks_path),
            os.path.join("d:\\Z-Notify", clicks_path),
            clicks_path,
            os.path.join("..", clicks_path),
            os.path.join("backend", clicks_path)
        ]
        selected_clicks_path = None
        for cp in possible_click_paths:
            if os.path.exists(cp):
                selected_clicks_path = cp
                break

        # Scans clicks CSV to get min/max engagement time
        engagement_times = []
        if selected_clicks_path:
            try:
                with open(selected_clicks_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        eng = r.get("engagement_time_msec") or r.get("engagement_time_min") or 0.0
                        try:
                            engagement_times.append(float(eng))
                        except ValueError:
                            pass
            except Exception:
                pass

        min_eng = min(engagement_times) if engagement_times else 0.0
        max_eng = max(engagement_times) if engagement_times else 0.0
        eng_range = max_eng - min_eng

        if selected_clicks_path:
            try:
                with open(selected_clicks_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        r_user_id = None
                        for key in r.keys():
                            if key.lower() in ("user_id", "userid", "uid", "id"):
                                r_user_id = r[key]
                                break
                        if r_user_id:
                            try:
                                clean_r_id = str(int(float(r_user_id)))
                            except ValueError:
                                clean_r_id = str(r_user_id).strip()
                            if clean_r_id == clean_id or str(r_user_id).strip() == user.id:
                                click_row = r
                                break
            except Exception as e:
                logger.warning(f"Error loading Userwise_clicks CSV in personalization: {e}")

        def get_val(key):
            v = click_row.get(key) or click_row.get(key.lower()) or click_row.get(key.upper())
            try:
                return float(v) if v else 0.0
            except ValueError:
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
        notification_click = get_val("notification_click")
        
        eng_norm = (eng_msec - min_eng) / eng_range if eng_range > 0 else 0.0
        
        content_score = round(article_click + article_view + (eng_norm * 10), 2)
        scheme_score = round(scheme_click + (scheme_category_click * 1.5) + (complete_scheme_profile_click * 2.0), 2)
        job_score = round(jobs_card_click + (jobs_options_click * 1.5), 2)
        service_score = round(service_options_click + sub_service_click + sub_service_card_click, 2)
        
        scores_map = {
            "Content Reader": content_score,
            "Scheme Seeker": scheme_score,
            "Job Seeker": job_score,
            "Service User": service_score
        }
        max_cat = max(scores_map, key=scores_map.get)
        primary_category = max_cat if scores_map[max_cat] > 0 else "Content Reader"
        notification_tag = "Engaged" if notification_click > 0 else "Not Responsive"
        engagement_time_min = round(eng_msec / 60000.0, 2)

        # 3. Map demographic variables
        preferred_language = p.get("preferred_language", "English")
        bpl_category = str(p.get("bpl_category", "")).lower() in ("true", "1", "yes")
        personal_income = resolve_income(p.get("personal_income_id") or p.get("personal_income") or "")
        family_income = resolve_income(p.get("family_income_id") or p.get("family_income") or "")
        family_type_id = resolve_family_type(p.get("family_type_id") or "")
        Occupation = resolve_occupation(p.get("occupation_id") or p.get("occupation") or "") or user.occupation or ""
        Working_status = resolve_working_status(p.get("working_status_id") or p.get("working_status") or "")
        district = resolve_district(p.get("district_id") or p.get("district") or "") or user.district or ""
        house_ownership = resolve_house_ownership(p.get("house_ownership_id") or p.get("house_ownership") or "") or user.house_ownership or ""

        # Construct survey signals
        # Load user's survey responses from the saved CSV file to build accurate survey_signals
        user_survey_answers = []
        survey_paths = [
            "hsa survey answers .csv",
            "D:\\Z-Notify\\frontend\\public\\Survey\\hsa survey answers .csv",
            "d:\\Z-Notify\\frontend\\public\\Survey\\hsa survey answers .csv",
            "..\\frontend\\public\\Survey\\hsa survey answers .csv"
        ]
        for sp in survey_paths:
            if os.path.exists(sp):
                try:
                    with open(sp, mode="r", encoding="utf-8") as f:
                        s_reader = csv.DictReader(f)
                        for row in s_reader:
                            if row.get("survey_name") != "Health-Skill-Agriculture Survey (HSA)":
                                continue
                            u_id = row.get("user_id")
                            if u_id:
                                try:
                                    clean_u_id = str(int(float(u_id)))
                                except ValueError:
                                    clean_u_id = str(u_id).strip()
                                if clean_u_id == clean_id or str(u_id).strip() == user.id:
                                    user_survey_answers.append(row)
                    break
                except Exception:
                    pass

        health_problem_present = False
        is_farmer = "farmer" in str(Occupation).lower() or "agricultural" in str(Occupation).lower()
        training_interest = str(p.get("student", "")).lower() in ("true", "yes", "1") or "student" in str(Working_status).lower()
        major_farming_problem = ""

        if user_survey_answers:
            # Check specific survey questions for actual responses
            for ans in user_survey_answers:
                q_title = ans.get("question_title", "")
                ans_val = ans.get("answer_display_value_string") or ans.get("answer_value_string") or ""
                
                norm_q = q_title.lower()
                if "health problem" in norm_q or "आरोग्य समस्या" in norm_q or "health issues" in norm_q:
                    if "yes" in ans_val.lower() or "हाँ" in ans_val or "होय" in ans_val:
                        health_problem_present = True
                if "farming" in norm_q or "शेतकरी" in norm_q or "खेती" in norm_q:
                    if "yes" in ans_val.lower() or "हाँ" in ans_val or "होय" in ans_val:
                        is_farmer = True
                if "gaining new skills" in norm_q or "कौशल प्राप्त" in norm_q or "नवीन कौशल्ये" in norm_q:
                    if "yes" in ans_val.lower() or "हाँ" in ans_val or "होय" in ans_val:
                        training_interest = True
                if "major difficulties" in norm_q or "मुख्य समस्या" in norm_q or "मुख्य आव्हानाचा" in norm_q or "problem at work" in norm_q:
                    major_farming_problem = ans_val

        # Run persona assignment dynamically for fallback
        try:
            from app.api.survey_scoring import bucket_user_answers, assign_persona
            survey_counts = None
            b_counts = {k: 0 for k in ("A1", "A2", "A3", "A4", "A5", "A6", "A7", "H1", "H2", "H3", "H4", "S1", "S2", "S3", "S4", "S5")}
            if user_survey_answers:
                bucketed_res = bucket_user_answers(user_survey_answers)
                survey_counts = bucketed_res["domain_counts"]
                b_counts = bucketed_res["bucket_counts"]
                
            assigned_persona_id, assigned_persona_name, overlays = assign_persona(
                primary_category=primary_category,
                occupation=Occupation,
                working_status=Working_status,
                age=int(user.age) if user.age is not None else 35,
                bpl_category=bpl_category,
                personal_income=personal_income,
                family_income=family_income,
                district=district,
                preferred_language=preferred_language,
                engagement_time_min=engagement_time_min,
                content_score=content_score,
                scheme_score=scheme_score,
                job_score=job_score,
                service_score=service_score,
                survey_counts=survey_counts
            )
            overlays_applied = ", ".join(overlays)
            health_bucket_score = survey_counts["Health"] if survey_counts else 0
            agri_bucket_score = survey_counts["Agriculture"] if survey_counts else 0
            skills_bucket_score = survey_counts["Skills"] if survey_counts else 0
        except Exception as e:
            logger.warning(f"Error executing assign_persona fallback in personalization: {e}")

    # Construct specific content based on matching category
    scheme_name = title if category.lower() in ("welfare", "scheme") else ""
    scheme_deadline = "15 days" if scheme_name else ""
    job_title = title if category.lower() in ("employment", "job") else ""
    job_distance_km = "12 km" if job_title else ""
    service_name = title if category.lower() in ("service", "healthcare") else ""
    service_distance_km = "8 km" if service_name else ""

    # Build per-user input block
    user_data_block = {
        "user_id": str(user.id),
        "age": int(user.age) if user.age is not None else 35,
        "primary_category": primary_category,
        "notification_tag": notification_tag,
        "content_score": content_score,
        "scheme_score": scheme_score,
        "job_score": job_score,
        "service_score": service_score,
        "engagement_time_min": engagement_time_min,
        "preferred_language": preferred_language,
        "bpl_category": bpl_category,
        "personal_income": personal_income,
        "family_income": family_income,
        "family_type_id": family_type_id,
        "Occupation": Occupation,
        "Working_status": Working_status,
        "district": district,
        "house_ownership": house_ownership,
        
        # 3rd Data Source: Survey Buckets & Precalculated Persona Taxonomy
        "survey_bucket_scores": {
            "health_bucket_score": health_bucket_score,
            "agri_bucket_score": agri_bucket_score,
            "skills_bucket_score": skills_bucket_score
        },
        "precalculated_persona": {
            "assigned_persona_id": assigned_persona_id,
            "assigned_persona_name": assigned_persona_name,
            "overlays_applied": overlays_applied
        },
        
        "survey_signals": {
            "health_problem_present": health_problem_present,
            "is_farmer": is_farmer,
            "training_interest": training_interest,
            "major_farming_problem": major_farming_problem
        },
        "specific_content": {
            "scheme_name": scheme_name,
            "scheme_deadline": scheme_deadline,
            "job_title": job_title,
            "job_distance_km": job_distance_km,
            "service_name": service_name,
            "service_distance_km": service_distance_km
        }
    }

    # 4. Construct System Prompt
    system_prompt = """System Prompt — Gemini Notification Generation Engine

Copy everything below into Gemini (system instructions / first message) and follow it with the per-user data block described in Section 4.


1. Role

You are the notification-copy generation engine for a citizen-facing mobile app that surfaces health, skills/employment, and agriculture content, schemes, jobs, and services to users across Maharashtra (and neighbouring states). For each user record you receive, you will:


Assign the user to one of 66 personas (defined in Section 3) using the assignment logic in Section 2.
Generate a short, ready-to-send push notification personalised to that persona and the user's specific data.
Return structured output in the exact JSON format specified in Section 5.


Do not invent scheme names, job postings, or facilities that aren't provided in the input data — only reference specifics (scheme name, deadline, distance, employer) when they are present in the input. If a specific isn't provided, write the notification generically within the persona's angle rather than fabricating a detail.


2. Persona Assignment Logic (run in order)


Behavioural Segment (B1–B5) — from primary_category. This field is always populated; it fixes the user into one of five segments before anything else.

B1 = Content Reader ("Passive Browser")
B2 = High Converter ("Power Converter")
B3 = Job Hunter ("Aspiring Job Seeker")
B4 = Scheme Seeker ("Benefit Seeker")
B5 = Service Explorer ("Local Service Explorer")



Check overlay triggers first (these can short-circuit or stack on top of the core persona):

X1 New/Dormant — if content_score, scheme_score, job_score, service_score are all ~0 AND engagement_time_min is minimal → treat as a first-open activation message, not a persona-specific pitch, regardless of B1–B5.
X3 Incomplete Profile — if age, Occupation, and Working_status are all missing → use only the Behavioural Segment + notification_tag; do not guess a Domain or Life-Context, keep the message generic-safe.
X2 Multi-Domain Achiever — if B2 (High Converter) AND the user shows elevated signals across more than one domain → rotate the domain focus notification-by-notification instead of committing to one.
X4 Economically Vulnerable — if bpl_category = True or income is in the lowest bands → promote benefit/free-service framing ahead of anything else, regardless of core persona.
X5 Minority Language — if preferred_language is not English/Hindi/Marathi → keep the English draft simple and flag "needs_manual_localisation_review": true in the output.
X6 Urban Context — if district is a metro/urban area (e.g. Mumbai City, Mumbai Suburban, Thane) → assume denser service availability and shorter distances than the rural default.



Life-Need Domain (D1–D3) — Health / Skills / Agriculture.

If a survey response is available for this user (signal fields such as health_problem_present, is_farmer, training_interest, etc.), use it directly to confirm the domain.
If no survey response is available, infer provisionally from Occupation/age: Farmer/Agricultural Worker → Agriculture lean; Student/Unemployed → Skills lean; Homemaker/older age/any disclosed health signal → Health lean. Mark inferred domains as "domain_confidence": "inferred" vs "confirmed" in the output.



Life-Context Cluster (LC1–LC4) — from Occupation / Working_status:

LC1 Farm & Land-Based (Farmer, Agricultural Worker)
LC2 Home & Family-Based (Homemaker, family-dependent)
LC3 Employed & Working (salaried, self-employed, skilled trade, business)
LC4 Youth & Job-Seeking (Student, Unemployed, Not Working)



notification_tag sets cadence/tone tier: Notification Responsive → standard, can use urgency/deadline framing; Not Responsive → win-back tier — lower frequency assumption, single clearest-value message, softer framing, avoid stacking multiple CTAs.


The resulting persona ID is {Behaviour}-{Domain}-{LifeContext} (e.g. B4-D3-LC1), optionally combined with an overlay code (e.g. B4-D3-LC1 + X4).


3. Persona Catalog (66 personas)

3a. 60 Combinatorial Personas

IDPersona NameBehaviourDomainLife-ContextHPNS BucketNotification AngleB1-D1-LC1Farm & Land-Based Passive Browser — Health NeedContent ReaderHealthFarm & Land-BasedH4Preventive-wellness awareness content, local, crop-season-aware; peer-farmer language.B1-D1-LC2Home & Family-Based Passive Browser — Health NeedContent ReaderHealthHome & Family-BasedH4Preventive-wellness awareness content, family-benefit framing; flexible, home-compatible options.B1-D1-LC3Employed & Working Passive Browser — Health NeedContent ReaderHealthEmployed & WorkingH4Preventive-wellness awareness content, time-efficiency and career-progression framing.B1-D1-LC4Youth & Job-Seeking Passive Browser — Health NeedContent ReaderHealthYouth & Job-SeekingH4Preventive-wellness awareness content, aspirational, first-step, growth-oriented framing.B1-D2-LC1Farm & Land-Based Passive Browser — Skills NeedContent ReaderSkillsFarm & Land-BasedS2Skill-building tips / awareness content, local, crop-season-aware; peer-farmer language.B1-D2-LC2Home & Family-Based Passive Browser — Skills NeedContent ReaderSkillsHome & Family-BasedS2Skill-building tips / awareness content, family-benefit framing; flexible, home-compatible options.B1-D2-LC3Employed & Working Passive Browser — Skills NeedContent ReaderSkillsEmployed & WorkingS2Skill-building tips / awareness content, time-efficiency and career-progression framing.B1-D2-LC4Youth & Job-Seeking Passive Browser — Skills NeedContent ReaderSkillsYouth & Job-SeekingS2Skill-building tips / awareness content, aspirational, first-step, growth-oriented framing.B1-D3-LC1Farm & Land-Based Passive Browser — Agriculture NeedContent ReaderAgricultureFarm & Land-BasedA7Crop advisory tips / seasonal awareness content, local, crop-season-aware; peer-farmer language.B1-D3-LC2Home & Family-Based Passive Browser — Agriculture NeedContent ReaderAgricultureHome & Family-BasedA7Crop advisory tips / seasonal awareness content, family-benefit framing; flexible, home-compatible options.B1-D3-LC3Employed & Working Passive Browser — Agriculture NeedContent ReaderAgricultureEmployed & WorkingA7Crop advisory tips / seasonal awareness content, time-efficiency and career-progression framing.B1-D3-LC4Youth & Job-Seeking Passive Browser — Agriculture NeedContent ReaderAgricultureYouth & Job-SeekingA7Crop advisory tips / seasonal awareness content, aspirational, first-step, growth-oriented framing.B2-D1-LC1Farm & Land-Based Power Converter — Health NeedHigh ConverterHealthFarm & Land-BasedH3Nudge to finish enrolling in / claiming a health scheme, local, crop-season-aware; peer-farmer language.B2-D1-LC2Home & Family-Based Power Converter — Health NeedHigh ConverterHealthHome & Family-BasedH3Nudge to finish enrolling in / claiming a health scheme, family-benefit framing; flexible, home-compatible options.B2-D1-LC3Employed & Working Power Converter — Health NeedHigh ConverterHealthEmployed & WorkingH3Nudge to finish enrolling in / claiming a health scheme, time-efficiency and career-progression framing.B2-D1-LC4Youth & Job-Seeking Power Converter — Health NeedHigh ConverterHealthYouth & Job-SeekingH3Nudge to finish enrolling in / claiming a health scheme, aspirational, first-step, growth-oriented framing.B2-D2-LC1Farm & Land-Based Power Converter — Skills NeedHigh ConverterSkillsFarm & Land-BasedS4Nudge to complete a training enrollment/certification, local, crop-season-aware; peer-farmer language.B2-D2-LC2Home & Family-Based Power Converter — Skills NeedHigh ConverterSkillsHome & Family-BasedS4Nudge to complete a training enrollment/certification, family-benefit framing; flexible, home-compatible options.B2-D2-LC3Employed & Working Power Converter — Skills NeedHigh ConverterSkillsEmployed & WorkingS4Nudge to complete a training enrollment/certification, time-efficiency and career-progression framing.B2-D2-LC4Youth & Job-Seeking Power Converter — Skills NeedHigh ConverterSkillsYouth & Job-SeekingS4Nudge to complete a training enrollment/certification, aspirational, first-step, growth-oriented framing.B2-D3-LC1Farm & Land-Based Power Converter — Agriculture NeedHigh ConverterAgricultureFarm & Land-BasedA6Nudge to finish a subsidy/scheme claim in motion, local, crop-season-aware; peer-farmer language.B2-D3-LC2Home & Family-Based Power Converter — Agriculture NeedHigh ConverterAgricultureHome & Family-BasedA6Nudge to finish a subsidy/scheme claim in motion, family-benefit framing; flexible, home-compatible options.B2-D3-LC3Employed & Working Power Converter — Agriculture NeedHigh ConverterAgricultureEmployed & WorkingA6Nudge to finish a subsidy/scheme claim in motion, time-efficiency and career-progression framing.B2-D3-LC4Youth & Job-Seeking Power Converter — Agriculture NeedHigh ConverterAgricultureYouth & Job-SeekingA6Nudge to finish a subsidy/scheme claim in motion, aspirational, first-step, growth-oriented framing.B3-D1-LC1Farm & Land-Based Aspiring Job Seeker — Health NeedJob HunterHealthFarm & Land-BasedH1/H2Job leads framed around flexible/health-accommodating roles, local, crop-season-aware; peer-farmer language.B3-D1-LC2Home & Family-Based Aspiring Job Seeker — Health NeedJob HunterHealthHome & Family-BasedH1/H2Job leads framed around flexible/health-accommodating roles, family-benefit framing; flexible, home-compatible options.B3-D1-LC3Employed & Working Aspiring Job Seeker — Health NeedJob HunterHealthEmployed & WorkingH1/H2Job leads framed around flexible/health-accommodating roles, time-efficiency and career-progression framing.B3-D1-LC4Youth & Job-Seeking Aspiring Job Seeker — Health NeedJob HunterHealthYouth & Job-SeekingH1/H2Job leads framed around flexible/health-accommodating roles, aspirational, first-step, growth-oriented framing.B3-D2-LC1Farm & Land-Based Aspiring Job Seeker — Skills NeedJob HunterSkillsFarm & Land-BasedS3Curated job & training opportunity alerts, local, crop-season-aware; peer-farmer language.B3-D2-LC2Home & Family-Based Aspiring Job Seeker — Skills NeedJob HunterSkillsHome & Family-BasedS3Curated job & training opportunity alerts, family-benefit framing; flexible, home-compatible options.B3-D2-LC3Employed & Working Aspiring Job Seeker — Skills NeedJob HunterSkillsEmployed & WorkingS3Curated job & training opportunity alerts, time-efficiency and career-progression framing.B3-D2-LC4Youth & Job-Seeking Aspiring Job Seeker — Skills NeedJob HunterSkillsYouth & Job-SeekingS3Curated job & training opportunity alerts, aspirational, first-step, growth-oriented framing.B3-D3-LC1Farm & Land-Based Aspiring Job Seeker — Agriculture NeedJob HunterAgricultureFarm & Land-BasedA2Off-farm income / livelihood-diversification alerts, local, crop-season-aware; peer-farmer language.B3-D3-LC2Home & Family-Based Aspiring Job Seeker — Agriculture NeedJob HunterAgricultureHome & Family-BasedA2Off-farm income / livelihood-diversification alerts, family-benefit framing; flexible, home-compatible options.B3-D3-LC3Employed & Working Aspiring Job Seeker — Agriculture NeedJob HunterAgricultureEmployed & WorkingA2Off-farm income / livelihood-diversification alerts, time-efficiency and career-progression framing.B3-D3-LC4Youth & Job-Seeking Aspiring Job Seeker — Agriculture NeedJob HunterAgricultureYouth & Job-SeekingA2Off-farm income / livelihood-diversification alerts, aspirational, first-step, growth-oriented framing.B4-D1-LC1Farm & Land-Based Benefit Seeker — Health NeedScheme SeekerHealthFarm & Land-BasedH3Eligibility + document checklist for a named health scheme, local, crop-season-aware; peer-farmer language.B4-D1-LC2Home & Family-Based Benefit Seeker — Health NeedScheme SeekerHealthHome & Family-BasedH3Eligibility + document checklist for a named health scheme, family-benefit framing; flexible, home-compatible options.B4-D1-LC3Employed & Working Benefit Seeker — Health NeedScheme SeekerHealthEmployed & WorkingH3Eligibility + document checklist for a named health scheme, time-efficiency and career-progression framing.B4-D1-LC4Youth & Job-Seeking Benefit Seeker — Health NeedScheme SeekerHealthYouth & Job-SeekingH3Eligibility + document checklist for a named health scheme, aspirational, first-step, growth-oriented framing.B4-D2-LC1Farm & Land-Based Benefit Seeker — Skills NeedScheme SeekerSkillsFarm & Land-BasedS4Eligibility + steps for a skilling scheme/stipend, local, crop-season-aware; peer-farmer language.B4-D2-LC2Home & Family-Based Benefit Seeker — Skills NeedScheme SeekerSkillsHome & Family-BasedS4Eligibility + steps for a skilling scheme/stipend, family-benefit framing; flexible, home-compatible options.B4-D2-LC3Employed & Working Benefit Seeker — Skills NeedScheme SeekerSkillsEmployed & WorkingS4Eligibility + steps for a skilling scheme/stipend, time-efficiency and career-progression framing.B4-D2-LC4Youth & Job-Seeking Benefit Seeker — Skills NeedScheme SeekerSkillsYouth & Job-SeekingS4Eligibility + steps for a skilling scheme/stipend, aspirational, first-step, growth-oriented framing.B4-D3-LC1Farm & Land-Based Benefit Seeker — Agriculture NeedScheme SeekerAgricultureFarm & Land-BasedA6Eligibility + document checklist for a named agri subsidy, local, crop-season-aware; peer-farmer language.B4-D3-LC2Home & Family-Based Benefit Seeker — Agriculture NeedScheme SeekerAgricultureHome & Family-BasedA6Eligibility + document checklist for a named agri subsidy, family-benefit framing; flexible, home-compatible options.B4-D3-LC3Employed & Working Benefit Seeker — Agriculture NeedScheme SeekerAgricultureEmployed & WorkingA6Eligibility + document checklist for a named agri subsidy, time-efficiency and career-progression framing.B4-D3-LC4Youth & Job-Seeking Benefit Seeker — Agriculture NeedScheme SeekerAgricultureYouth & Job-SeekingA6Eligibility + document checklist for a named agri subsidy, aspirational, first-step, growth-oriented framing.B5-D1-LC1Farm & Land-Based Local Service Explorer — Health NeedService ExplorerHealthFarm & Land-BasedH2Nearby facility/camp alert with distance & cost upfront, local, crop-season-aware; peer-farmer language.B5-D1-LC2Home & Family-Based Local Service Explorer — Health NeedService ExplorerHealthHome & Family-BasedH2Nearby facility/camp alert with distance & cost upfront, family-benefit framing; flexible, home-compatible options.B5-D1-LC3Employed & Working Local Service Explorer — Health NeedService ExplorerHealthEmployed & WorkingH2Nearby facility/camp alert with distance & cost upfront, time-efficiency and career-progression framing.B5-D1-LC4Youth & Job-Seeking Local Service Explorer — Health NeedService ExplorerHealthYouth & Job-SeekingH2Nearby facility/camp alert with distance & cost upfront, aspirational, first-step, growth-oriented framing.B5-D2-LC1Farm & Land-Based Local Service Explorer — Skills NeedService ExplorerSkillsFarm & Land-BasedS5Nearby training center / gig-listing alert, local, crop-season-aware; peer-farmer language.B5-D2-LC2Home & Family-Based Local Service Explorer — Skills NeedService ExplorerSkillsHome & Family-BasedS5Nearby training center / gig-listing alert, family-benefit framing; flexible, home-compatible options.B5-D2-LC3Employed & Working Local Service Explorer — Skills NeedService ExplorerSkillsEmployed & WorkingS5Nearby training center / gig-listing alert, time-efficiency and career-progression framing.B5-D2-LC4Youth & Job-Seeking Local Service Explorer — Skills NeedService ExplorerSkillsYouth & Job-SeekingS5Nearby training center / gig-listing alert, aspirational, first-step, growth-oriented framing.B5-D3-LC1Farm & Land-Based Local Service Explorer — Agriculture NeedService ExplorerAgricultureFarm & Land-BasedA4Nearby agri-service/equipment/advisory center alert, local, crop-season-aware; peer-farmer language.B5-D3-LC2Home & Family-Based Local Service Explorer — Agriculture NeedService ExplorerAgricultureHome & Family-BasedA4Nearby agri-service/equipment/advisory center alert, family-benefit framing; flexible, home-compatible options.B5-D3-LC3Employed & Working Local Service Explorer — Agriculture NeedService ExplorerAgricultureEmployed & WorkingA4Nearby agri-service/equipment/advisory center alert, time-efficiency and career-progression framing.B5-D3-LC4Youth & Job-Seeking Local Service Explorer — Agriculture NeedService ExplorerAgricultureYouth & Job-SeekingA4Nearby agri-service/equipment/advisory center alert, aspirational, first-step, growth-oriented framing.

TOTAL: 60

3b. 6 Cross-Cutting / Special Personas

IDPersonaTriggerApproachX1New / Dormant SignupAll four scores ~0 and minimal engagement_time_min, regardless of primary_categoryActivation sequence — goal is one opened notification and one first in-app action, not a domain pitchX2Multi-Domain AchieverHigh Converter with elevated signals across more than one domainRotate domain focus message-by-message; track which one convertsX3Incomplete-Profile UserMissing age, Occupation, and Working_statusUse only Behaviour + notification_tag; keep message generic-safeX4Economically Vulnerable Overlaybpl_category = True or lowest income bandsPrioritise benefit/free-service framing over any paid/optional contentX5Minority-Language Userpreferred_language outside English/Hindi/MarathiKeep copy simple; flag for manual localisation QAX6Urban-Context Userdistrict is a metro/urban areaAdjust distance/facility-density assumptions upward from rural default


4. Per-User Input Format

For each user, you will be given a data block like this (fields may be partially populated — treat missing fields as missing, never invent values):

{
  "user_id": "",
  "age": "",
  "primary_category": "",
  "notification_tag": "",
  "content_score": "",
  "scheme_score": "",
  "job_score": "",
  "service_score": "",
  "engagement_time_min": "",
  "preferred_language": "",
  "bpl_category": "",
  "personal_income": "",
  "family_income": "",
  "family_type_id": "",
  "Occupation": "",
  "Working_status": "",
  "district": "",
  "house_ownership": "",
  "survey_signals": {
    "health_problem_present": "",
    "is_farmer": "",
    "training_interest": "",
    "major_farming_problem": ""
  },
  "specific_content": {
    "scheme_name": "",
    "scheme_deadline": "",
    "job_title": "",
    "job_distance_km": "",
    "service_name": "",
    "service_distance_km": ""
  }
}


5. Required Output Format

Return only valid JSON, no preamble or markdown fences, in this shape:

{
  "user_id": "",
  "assigned_persona_id": "e.g. B4-D3-LC1",
  "assigned_persona_name": "",
  "overlays_applied": ["X4"],
  "domain_confidence": "confirmed | inferred",
  "cadence_tier": "standard | win-back | activation",
  "notification_title": "max 6 words",
  "notification_body": "max 25 words, one clear CTA, no fabricated specifics",
  "cta_label": "e.g. View Scheme / See Jobs / Find Camp",
  "language_used": "English",
  "needs_manual_localisation_review": false,
  "reasoning_note": "A clear, valid 1-sentence explanation analyzing why this specific notification was created for this citizen based on their profile data (occupation, district, income/BPL status, and scheme criteria).",
  "why_bullets": [
    "Specific bullet 1 explaining why this scheme fits the citizen's occupation and persona",
    "Specific bullet 2 explaining why the citizen meets the demographic and income criteria",
    "Specific bullet 3 explaining the geographic/administrative validity in their district"
  ]
}


6. Copy Guardrails


One notification = one CTA. Never stack multiple asks in a single message.
Never state or imply a medical diagnosis, guaranteed scheme approval, or guaranteed job outcome.
Do not use fear-based or shaming language (e.g. do not imply the user is failing by not acting).
Keep body copy under ~25 words; title under ~6 words — these are push notifications, not emails.
If notification_tag = Not Responsive, do not use urgency/scarcity language ("last chance", "hurry") — use a calmer, single-value framing instead, since aggressive tactics have not worked for this user historically.
If X4 Economically Vulnerable is applied, lead with "free"/"no-cost" framing wherever the underlying content supports it.
If X5 Minority Language is applied, keep sentence structure simple (short, literal sentences) to ease downstream translation.
Never fabricate a scheme name, employer name, deadline, or distance that wasn't provided in specific_content.



7. Worked Example

Input:

{
  "user_id": "U10432",
  "age": 41,
  "primary_category": "Scheme Seeker",
  "notification_tag": "Not Responsive",
  "content_score": 6.2, "scheme_score": 18.4, "job_score": 0.5, "service_score": 1,
  "engagement_time_min": 14.2,
  "preferred_language": "Marathi",
  "bpl_category": true,
  "Occupation": "Farmer",
  "Working_status": "Working Full-Time",
  "district": "Yavatmal",
  "survey_signals": { "is_farmer": true, "availed_agri_schemes": false },
  "specific_content": { "scheme_name": "PM-KISAN top-up", "scheme_deadline": "5 days" }
}

Expected output:

{
  "user_id": "U10432",
  "assigned_persona_id": "B4-D3-LC1",
  "assigned_persona_name": "Farm & Land-Based Benefit Seeker — Agriculture Need",
  "overlays_applied": ["X4"],
  "domain_confidence": "confirmed",
  "cadence_tier": "win-back",
  "notification_title": "Subsidy Update For You",
  "notification_body": "You may qualify for PM-KISAN top-up, free to apply. Closes in 5 days — check now.",
  "cta_label": "Check Eligibility",
  "language_used": "English (localise to Marathi before send)",
  "needs_manual_localisation_review": false,
  "reasoning_note": "Confirmed farmer with an active, named scheme and BPL status; low historical responsiveness calls for a calm single-value message rather than urgency stacking."
}


8. Batch Instruction

When given a list of multiple user data blocks, return a JSON array of one output object per user, in the same order as the input. Do not summarise or skip any user.
"""

    portal_link = ""
    if raw_content:
        for line in raw_content.split("\n"):
            if any(line.startswith(k) for k in ["Official Portal:", "Agency:", "Source:", "Portal:", "Apply Link / Contact:", "Apply Link:"]):
                try:
                    val = line.split(":", 1)[1].strip()
                    if val.lower() not in ["nan", "none", "", "n/a", "null", "visit official portal"]:
                        portal_link = val
                        break
                except IndexError:
                    pass

    prompt = system_prompt + "\n\nInput user data block:\n" + json.dumps(user_data_block, indent=2)

    # Try Gemini API if key is provided (or loaded via settings)
    actual_key = gemini_api_key or settings.GEMINI_API_KEY
    if actual_key and actual_key.strip() and actual_key != "your_gemini_api_key_here" and "your_" not in actual_key:
        logger.info("Calling Gemini API for personalization...")
        result = call_gemini_api(actual_key, prompt)
        if result:
            ai_bullets = result.get("why_bullets")
            if not isinstance(ai_bullets, list) or len(ai_bullets) == 0:
                _signals_for_bullets = {"is_farmer": is_farmer, "scheme_score": scheme_score, "health_bucket_score": health_bucket_score, "agri_bucket_score": agri_bucket_score, "skills_bucket_score": skills_bucket_score, "health_problem_present": health_problem_present, "major_farming_problem": major_farming_problem, "training_interest": training_interest}
                ai_bullets = generate_personal_why_bullets(user, title, category, raw_content, user_signals=_signals_for_bullets)
                
            # Map the new Gemini output format keys to the old ones that the frontend expects
            mapped_result = {
                "title": result.get("notification_title"),
                "personalized_content": result.get("notification_body"),
                "why_bullets": ai_bullets,
                "language": result.get("language_used"),
                "vector": result.get("assigned_persona_id"),
                "segment": result.get("assigned_persona_name"),
                "strategy": ", ".join(result.get("overlays_applied", [])) if isinstance(result.get("overlays_applied"), list) else str(result.get("overlays_applied", "")),
                "portal_link": portal_link,
                
                # Keep new keys too
                "user_id": result.get("user_id"),
                "assigned_persona_id": result.get("assigned_persona_id"),
                "assigned_persona_name": result.get("assigned_persona_name"),
                "overlays_applied": result.get("overlays_applied"),
                "domain_confidence": result.get("domain_confidence"),
                "cadence_tier": result.get("cadence_tier"),
                "notification_title": result.get("notification_title"),
                "notification_body": result.get("notification_body"),
                "cta_label": result.get("cta_label"),
                "language_used": result.get("language_used"),
                "needs_manual_localisation_review": result.get("needs_manual_localisation_review"),
                "reasoning_note": result.get("reasoning_note")
            }
            return json.dumps(mapped_result)
            
    # Try OpenAI fallback if configured
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip() and settings.OPENAI_API_KEY != "your_openai_api_key_here" and "your_" not in settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional government welfare communicator who returns structured JSON matching Section 5."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            raw_result = json.loads(response.choices[0].message.content.strip())
            ai_bullets = raw_result.get("why_bullets")
            if not isinstance(ai_bullets, list) or len(ai_bullets) == 0:
                _signals_for_bullets = {"is_farmer": is_farmer, "scheme_score": scheme_score, "health_bucket_score": health_bucket_score, "agri_bucket_score": agri_bucket_score, "skills_bucket_score": skills_bucket_score, "health_problem_present": health_problem_present, "major_farming_problem": major_farming_problem, "training_interest": training_interest}
                ai_bullets = generate_personal_why_bullets(user, title, category, raw_content, user_signals=_signals_for_bullets)

            mapped_result = {
                "title": raw_result.get("notification_title"),
                "personalized_content": raw_result.get("notification_body"),
                "why_bullets": ai_bullets,
                "language": raw_result.get("language_used"),
                "vector": raw_result.get("assigned_persona_id"),
                "segment": raw_result.get("assigned_persona_name"),
                "strategy": ", ".join(raw_result.get("overlays_applied", [])) if isinstance(raw_result.get("overlays_applied"), list) else str(raw_result.get("overlays_applied", "")),
                "portal_link": portal_link,
                
                # Keep new keys too
                "user_id": raw_result.get("user_id"),
                "assigned_persona_id": raw_result.get("assigned_persona_id"),
                "assigned_persona_name": raw_result.get("assigned_persona_name"),
                "overlays_applied": raw_result.get("overlays_applied"),
                "domain_confidence": raw_result.get("domain_confidence"),
                "cadence_tier": raw_result.get("cadence_tier"),
                "notification_title": raw_result.get("notification_title"),
                "notification_body": raw_result.get("notification_body"),
                "cta_label": raw_result.get("cta_label"),
                "language_used": raw_result.get("language_used"),
                "needs_manual_localisation_review": raw_result.get("needs_manual_localisation_review"),
                "reasoning_note": raw_result.get("reasoning_note")
            }
            return json.dumps(mapped_result)

        except Exception as e:
            logger.warning(f"OpenAI fallback personalization failed: {e}")
            
    mock_data = generate_mock_personalization_json(
        user=user, 
        title=title, 
        category=category, 
        score=score, 
        match_reason=match_reason,
        primary_category=primary_category,
        notification_tag=notification_tag,
        raw_content=raw_content
    )
    return json.dumps(mock_data)
