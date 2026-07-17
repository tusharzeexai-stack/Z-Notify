import re

# 1. Hardcoded HPNS Question Bucket Mapping
HPNS_QUESTIONS = [
    {"domain": "Agriculture", "bucket_id": "A1", "bucket_name": "Farmer Identity & Scale", "question_title": "Do you do farming?"},
    {"domain": "Agriculture", "bucket_id": "A1", "bucket_name": "Farmer Identity & Scale", "question_title": "Do you own agricultural land?"},
    {"domain": "Agriculture", "bucket_id": "A1", "bucket_name": "Farmer Identity & Scale", "question_title": "If yes, how much land do you have?"},
    {"domain": "Agriculture", "bucket_id": "A2", "bucket_name": "Farmer Challenges", "question_title": "What major difficulties do you face in farming?"},
    {"domain": "Agriculture", "bucket_id": "A2", "bucket_name": "Farmer Challenges", "question_title": "What is your biggest problem at work?"},
    {"domain": "Agriculture", "bucket_id": "A3", "bucket_name": "Production System", "question_title": "How many crops do you grow in one year?"},
    {"domain": "Agriculture", "bucket_id": "A3", "bucket_name": "Production System", "question_title": "What types of crops do you grow?"},
    {"domain": "Agriculture", "bucket_id": "A3", "bucket_name": "Production System", "question_title": "From where do you get your seeds?"},
    {"domain": "Agriculture", "bucket_id": "A3", "bucket_name": "Production System", "question_title": "What farming method do you use?"},
    {"domain": "Agriculture", "bucket_id": "A4", "bucket_name": "Water & Infrastructure", "question_title": "What is your water source for farming?"},
    {"domain": "Agriculture", "bucket_id": "A4", "bucket_name": "Water & Infrastructure", "question_title": "What tools/machinery do you use?"},
    {"domain": "Agriculture", "bucket_id": "A4", "bucket_name": "Water & Infrastructure", "question_title": "What type of energy source do you use for farming?"},
    {"domain": "Agriculture", "bucket_id": "A4", "bucket_name": "Water & Infrastructure", "question_title": "Do you use safety gear while spraying medicines?"},
    {"domain": "Agriculture", "bucket_id": "A5", "bucket_name": "Market & Income Enhancement", "question_title": "Where do you sell your crop produce?"},
    {"domain": "Agriculture", "bucket_id": "A5", "bucket_name": "Market & Income Enhancement", "question_title": "If exporting, through which channel do you export?"},
    {"domain": "Agriculture", "bucket_id": "A5", "bucket_name": "Market & Income Enhancement", "question_title": "Do you do primary processing before selling your produce?"},
    {"domain": "Agriculture", "bucket_id": "A5", "bucket_name": "Market & Income Enhancement", "question_title": "Are you a member of any farmer group/company?"},
    {"domain": "Agriculture", "bucket_id": "A6", "bucket_name": "Scheme & Financial Enablement", "question_title": "Which government schemes have you availed?"},
    {"domain": "Agriculture", "bucket_id": "A6", "bucket_name": "Scheme & Financial Enablement", "question_title": "Do you receive subsidy on time?"},
    {"domain": "Agriculture", "bucket_id": "A6", "bucket_name": "Scheme & Financial Enablement", "question_title": "What difficulties do you face in availing schemes?"},
    {"domain": "Agriculture", "bucket_id": "A6", "bucket_name": "Scheme & Financial Enablement", "question_title": "What type of financial assistance do you find most useful for farming?"},
    {"domain": "Agriculture", "bucket_id": "A7", "bucket_name": "Knowledge & Advisory", "question_title": "When you face crop-related issues, where do you get information from?"},
    {"domain": "Agriculture", "bucket_id": "A7", "bucket_name": "Knowledge & Advisory", "question_title": "What type of information do you find most useful for farming?"},
    {"domain": "Agriculture", "bucket_id": "A7", "bucket_name": "Knowledge & Advisory", "question_title": "Where do you learn new ways of farming?"},
    
    {"domain": "Health", "bucket_id": "H1", "bucket_name": "Medical Need & Risk", "question_title": "Are you or any of your family members facing any health problem?"},
    {"domain": "Health", "bucket_id": "H1", "bucket_name": "Medical Need & Risk", "question_title": "What are the health issues being faced?"},
    {"domain": "Health", "bucket_id": "H1", "bucket_name": "Medical Need & Risk", "question_title": "What type of support would help improve mental health or reduce addiction/substance use?"},
    {"domain": "Health", "bucket_id": "H2", "bucket_name": "Healthcare Access & Affordability", "question_title": "Where do you usually go for treatment?"},
    {"domain": "Health", "bucket_id": "H2", "bucket_name": "Healthcare Access & Affordability", "question_title": "What is your annual out-of-pocket expenditure on health?"},
    {"domain": "Health", "bucket_id": "H2", "bucket_name": "Healthcare Access & Affordability", "question_title": "How far do you have to go for accessing healthcare?"},
    {"domain": "Health", "bucket_id": "H3", "bucket_name": "Health Scheme Adoption", "question_title": "Are you interested in availing free health services for yourself or your family?"},
    {"domain": "Health", "bucket_id": "H3", "bucket_name": "Health Scheme Adoption", "question_title": "Are you currently getting benefits of any health schemes?"},
    {"domain": "Health", "bucket_id": "H3", "bucket_name": "Health Scheme Adoption", "question_title": "How satisfied are you with the services provided under this scheme?"},
    {"domain": "Health", "bucket_id": "H3", "bucket_name": "Health Scheme Adoption", "question_title": "Why are you not enrolled in a scheme or what difficulties did you face during application?"},
    {"domain": "Health", "bucket_id": "H3", "bucket_name": "Health Scheme Adoption", "question_title": "What challenges have you faced while using the scheme?"},
    {"domain": "Health", "bucket_id": "H4", "bucket_name": "Preventive Wellness", "question_title": "Which system of medicine do you prefer?"},
    {"domain": "Health", "bucket_id": "H4", "bucket_name": "Preventive Wellness", "question_title": "How often do you follow health-related habits (exercise, tobacco, alcohol, unhealthy food)?"},
    
    {"domain": "Skills", "bucket_id": "S1", "bucket_name": "Employment & Livelihood Status", "question_title": "What are you currently doing?"},
    {"domain": "Skills", "bucket_id": "S1", "bucket_name": "Employment & Livelihood Status", "question_title": "What is your current primary occupation?"},
    {"domain": "Skills", "bucket_id": "S2", "bucket_name": "Current Capability", "question_title": "What skills do you have?"},
    {"domain": "Skills", "bucket_id": "S2", "bucket_name": "Current Capability", "question_title": "How did you acquire this skill?"},
    {"domain": "Skills", "bucket_id": "S2", "bucket_name": "Current Capability", "question_title": "Do you have a certificate for this skill?"},
    {"domain": "Skills", "bucket_id": "S2", "bucket_name": "Current Capability", "question_title": "How many years of working experience do you have?"},
    {"domain": "Skills", "bucket_id": "S3", "bucket_name": "Career Growth Intent", "question_title": "Where do you want to work?"},
    {"domain": "Skills", "bucket_id": "S3", "bucket_name": "Career Growth Intent", "question_title": "Do you wish to do a job or self-employment after training?"},
    {"domain": "Skills", "bucket_id": "S3", "bucket_name": "Career Growth Intent", "question_title": "Would you be interested in gaining new skills via training?"},
    {"domain": "Skills", "bucket_id": "S3", "bucket_name": "Career Growth Intent", "question_title": "If yes, which type of skill training would you prefer?"},
    {"domain": "Skills", "bucket_id": "S4", "bucket_name": "Skill Ecosystem Participation", "question_title": "Are you enrolled in any Maharashtra government skill programs?"},
    {"domain": "Skills", "bucket_id": "S4", "bucket_name": "Skill Ecosystem Participation", "question_title": "Have you completed training under this scheme? If yes, from where?"},
    {"domain": "Skills", "bucket_id": "S4", "bucket_name": "Skill Ecosystem Participation", "question_title": "From where did you get information about skill development training?"},
    {"domain": "Skills", "bucket_id": "S4", "bucket_name": "Skill Ecosystem Participation", "question_title": "What is the main challenge you face in availing the training under this scheme?"},
    {"domain": "Skills", "bucket_id": "S5", "bucket_name": "Economic Opportunity Marketplace", "question_title": "Can we list your service/skill on an app?"}
]

# 2. Hardcoded Persona Taxonomy Info
BEHAVIOR_SHORT_NAMES = {
    "B1": "Passive Browser",
    "B2": "Power Converter",
    "B3": "Aspiring Job Seeker",
    "B4": "Benefit Seeker",
    "B5": "Local Service Explorer"
}

DOMAIN_NAMES = {
    "D1": "Health Need",
    "D2": "Skills Need",
    "D3": "Agriculture Need"
}

CONTEXT_NAMES = {
    "LC1": "Farm & Land-Based",
    "LC2": "Home & Family-Based",
    "LC3": "Employed & Working",
    "LC4": "Youth & Job-Seeking"
}

OVERLAY_DETAILS = {
    "X1": "New / Dormant Signup",
    "X2": "Multi-Domain Achiever",
    "X3": "Incomplete-Profile User",
    "X4": "Economically Vulnerable Overlay",
    "X5": "Minority-Language User",
    "X6": "Urban-Context User"
}

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    if "/" in text:
        text = text.split("/")[0].strip()
    # Normalize pluralization differences
    text = text.replace("members", "member")
    text = text.replace("skills", "skill")
    text = text.replace("tools", "tool")
    text = text.replace("types", "type")
    text = text.replace("programs", "program")
    text = re.sub(r'[^a-z0-9]', '', text)
    return text

# Pre-normalized bucket questions for quick lookup
NORMALIZED_HPNS = [(normalize_text(item["question_title"]), item) for item in HPNS_QUESTIONS]

def bucket_user_answers(user_answers: list) -> dict:
    """
    Groups a user's survey responses into HPNS buckets A1-A7, H1-H4, S1-S5.
    Returns counts per domain and a dict of responses per bucket.
    """
    bucket_counts = {
        "A1": 0, "A2": 0, "A3": 0, "A4": 0, "A5": 0, "A6": 0, "A7": 0,
        "H1": 0, "H2": 0, "H3": 0, "H4": 0,
        "S1": 0, "S2": 0, "S3": 0, "S4": 0, "S5": 0
    }
    bucket_responses = {b: [] for b in bucket_counts.keys()}
    
    # If the user took the HSA survey (exactly 68 answers), use index-based scoring
    # to be 100% deterministic regardless of translation/language
    if len(user_answers) == 68:
        health_indexes = {2, 3, 4, 5, 6, 7, 23, 34, 45, 56, 66, 67, 68}
        skills_indexes = {8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26}
        agri_indexes = {27, 28, 29, 30, 31, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 57, 58, 59, 63}
        
        h_score = 0
        s_score = 0
        a_score = 0
        for idx, ans in enumerate(user_answers, 1):
            ans_val = ans.get("answer_display_value_string") or ans.get("answer_value_string") or ""
            if ans_val and str(ans_val).strip():
                if idx in health_indexes:
                    h_score += 1
                elif idx in skills_indexes:
                    s_score += 1
                elif idx in agri_indexes:
                    a_score += 1
                    
        return {
            "domain_counts": {
                "Agriculture": a_score,
                "Health": h_score,
                "Skills": s_score
            },
            "bucket_counts": bucket_counts,
            "bucket_responses": bucket_responses
        }

    agri_count = 0
    health_count = 0
    skills_count = 0
    
    agri_keywords = [
        "farming", "farmer", "agricultural", "land", "crop", "seeds", "irrigation", "subsidy", "fertility", "pest", 
        "veterinary", "cultivation", "soil", "produce", "sell", "sold", "tractor", "machinery", "rotavator", 
        "leveller", "plough", "harvester", "seed drill", "thresher", "sheti", "shetkari", "farm", "fertilizer",
        "शेत", "पीक", "बियाणे", "कृषी", "जमीन", "खत", "औजारे", "उत्पादन", "विक्री", "शेतकरी", "खेती", "फसल", 
        "सावकार", "मजूर कार्ड", "ई-श्रम", "मजूर", "अवजारे", "शेती", "animal", "पशुपालन"
    ]
    health_keywords = [
        "health", "medical", "doctor", "treatment", "hospital", "clinic", "patient", "fever", "disease", "illness", 
        "medicine", "expenditure", "tobacco", "smoke", "alcohol", "fit", "yoga", "gym", "height", "weight", 
        "nutrition", "care", "wellness", "diabetes", "tumor", "vaccine", "immunisation", "pcod", "pcos", "dengue", 
        "malaria", "cancer", "migraine", "pregnancy", "cholesterol", "thyroid", "asthma", "hernia", "bp", "urine", 
        "blood", "आरोग्य", "रुग्ण", "डॉक्टर", "उपचार", "रुग्णालय", "दवाखाना", "आजार", "औषध", "खर्च", "व्यसन", 
        "तंबाखू", "दारू", "व्यायाम", "वजन", "उंची", "स्वास्थ्य", "लसीकरण", "मधुमेह", "कोलेस्ट्रॉल", "थायरॉईड", 
        "हृदयरोग", "कर्करोग", "डेंग्यू", "निमोनिया", "मायग्रेन", "गर्भधारणा", "मूत्रपिंड", "दंत", "डोळा", "मूळव्याध", 
        "अपंगत्व", "दमा", "रक्तदाब", "क्षयरोग", "हिमोग्लोबिन", "लघवी", "टॉन्सिल", "मानसिक", "व्यसनमुक्ती", "शिविर",
        "ताप", "विषाणूजन्य", "तंदुरुस्त", "योग", "जिम", "अलोपॅथिक", "रुग्णालये"
    ]
    skills_keywords = [
        "skill", "employment", "job", "career", "study", "education", "training", "skilling", "occupation", 
        "unemployed", "earn", "livelihood", "qualification", "course", "certified", "recruit", "payscale", 
        "work do to", "currently doing", "study further", "looking for employment", "want to work", 
        "शिक्षण", "कौशल्य", "प्रशिक्षण", "नोकरी", "व्यवसाय", "रोजगार", "कौशल", "नौकरी", "रोज़गार", 
        "पात्रता", "कार्यप्रणाली", "कामाचा अनुभव", "studies", "migrate"
    ]

    manual_mappings = {
        "तर जागरूकतेच्या अभावाची कारणे काय आहेत?": "Health",
        "सरकारी आरोग्य योजनांसाठी अर्ज करताना तुम्हाला कोणत्या आव्हानांना तोंड द्यावे लागते?": "Health",
        "योजनेचा वापर करताना तुम्हाला कोणत्या आव्हानांना तोंड द्यावे लागले?": "Health",
        "त्या समस्येवर शेवटचे काम कधी केले गेले होते?": "Health",
        "तुम्ही या समस्येबद्दल कोणाशी संपर्क साधला आहे का किंवा कोणाला माहिती दिली आहे का?": "Health",
        "तर प्रतिसाद काय होता?": "Health",
        "समस्या सोडवण्यासाठी कोण जबाबदार आहे?": "Health",
        "तुमच्या क्षेत्रात कोणत्या प्रमुख समस्या आहेत?": "Health",
        "यदि हां, तो योजना ने आपको खुद को बढ़ाने में कैसे मदद की है?": "Skills",
        "तो क्या आप योजना से मिली आमदनी से संतुष्ट है?": "Skills",
        "यदि रुचि नहीं है अथवा नहीं है तो उसका कारण क्या है?": "Skills",
        "तो क्या आपको उचित जानकारी मिलने पर किसी सरकारी कार्यक्रम या योजना में नामांकन करना चाहेंगे?": "Skills",
        "WHAT WILL BE YOUR PREFERRED LOCATION?": "Skills",
    }

    for ans in user_answers:
        q_title = ans.get("question_title", "")
        ans_val = ans.get("answer_display_value_string") or ans.get("answer_value_string") or ""
        if not q_title or not ans_val:
            continue
            
        q_lower = q_title.lower()
        
        # Check manual mappings first
        manual_domain = None
        for pattern, dom in manual_mappings.items():
            if pattern.lower() in q_lower:
                manual_domain = dom
                break
                
        if manual_domain:
            if manual_domain == "Agriculture":
                agri_count += 1
            elif manual_domain == "Health":
                health_count += 1
            elif manual_domain == "Skills":
                skills_count += 1
            continue
            
        norm_q = normalize_text(q_title)
        
        # Match with bucket mapping using strict/safe substring rules
        matched_bucket = None
        matched_domain = None
        if norm_q:
            for bq_norm, item in NORMALIZED_HPNS:
                if bq_norm == norm_q or bq_norm in norm_q:
                    matched_bucket = item["bucket_id"]
                    matched_domain = item["domain"]
                    break
                if len(norm_q) >= 15 and norm_q in bq_norm:
                    matched_bucket = item["bucket_id"]
                    matched_domain = item["domain"]
                    break
                
        if matched_bucket:
            bucket_counts[matched_bucket] += 1
            bucket_responses[matched_bucket].append({
                "question": q_title,
                "answer": ans_val
            })
            if matched_domain == "Agriculture":
                agri_count += 1
            elif matched_domain == "Health":
                health_count += 1
            elif matched_domain == "Skills":
                skills_count += 1
        else:
            # Fallback to keyword-based categorization for unmapped questions
            # Avoid generic phone/brand/product questions matching Skills
            if "phone" in q_lower or "sim" in q_lower or "mobile" in q_lower or "detergent" in q_lower or "soap" in q_lower or "tea" in q_lower or "brand" in q_lower or "ration card" in q_lower:
                continue
            if any(k in q_lower for k in health_keywords):
                health_count += 1
            elif any(k in q_lower for k in agri_keywords):
                agri_count += 1
            elif any(k in q_lower for k in skills_keywords):
                skills_count += 1
                
    return {
        "domain_counts": {
            "Agriculture": agri_count,
            "Health": health_count,
            "Skills": skills_count
        },
        "bucket_counts": bucket_counts,
        "bucket_responses": bucket_responses
    }

def assign_persona(
    primary_category: str,
    occupation: str,
    working_status: str,
    age: int,
    bpl_category: bool,
    personal_income: str,
    family_income: str,
    district: str,
    preferred_language: str,
    engagement_time_min: float,
    content_score: float,
    scheme_score: float,
    job_score: float,
    service_score: float,
    survey_counts: dict = None
) -> tuple:
    """
    Assigns the 66-persona code, name, and overlays.
    Returns (assigned_persona_id, assigned_persona_name, overlays_applied)
    """
    overlays = []
    
    # 1. Axis 1: Behavioural Segment (B1-B5)
    b_map = {
        "Content Reader": "B1",
        "High Converter": "B2",
        "Job Hunter": "B3",
        "Job Seeker": "B3",
        "Scheme Seeker": "B4",
        "Service Explorer": "B5",
        "Service User": "B5"
    }
    b_id = b_map.get(primary_category, "B1")
    
    # 2. Axis 3: Life-Context Cluster (LC1-LC4)
    occ_lower = str(occupation).lower()
    work_lower = str(working_status).lower()
    
    if "farmer" in occ_lower or "agricultural" in occ_lower or "farm" in occ_lower:
        lc_id = "LC1"
    elif "housewife" in occ_lower or "homemaker" in occ_lower:
        lc_id = "LC2"
    elif "student" in occ_lower or "unemployed" in occ_lower or "not working" in work_lower:
        lc_id = "LC4"
    elif "working" in work_lower or "employed" in work_lower or (occupation and occupation != "Unknown"):
        lc_id = "LC3"
    else:
        lc_id = "LC4"  # Default fallback to Youth / Job-Seeking
        
    # 3. Axis 2: Life-Need Domain (D1-D3)
    # Check survey counts first (confirmed domain)
    survey_domain = None
    if survey_counts:
        max_val = -1
        for dom, val in survey_counts.items():
            if val > max_val:
                max_val = val
                survey_domain = dom
        if max_val == 0:
            survey_domain = None
            
    if survey_domain == "Agriculture":
        d_id = "D3"
    elif survey_domain == "Health":
        d_id = "D1"
    elif survey_domain == "Skills":
        d_id = "D2"
    else:
        # Infer provisionally from Occupation/age/status
        if "farmer" in occ_lower or "agricultural" in occ_lower or "farm" in occ_lower:
            d_id = "D3"
        elif "student" in occ_lower or "unemployed" in occ_lower:
            d_id = "D2"
        elif age is not None and age >= 50:
            d_id = "D1"
        else:
            d_id = "D2" # Default to Skills lean
            
    # 4. Check Overlay Triggers
    # X1: New / Dormant Signup
    all_scores_near_zero = (content_score < 1.0 and scheme_score < 1.0 and job_score < 1.0 and service_score < 1.0)
    if all_scores_near_zero and engagement_time_min < 1.0:
        overlays.append("X1")
        
    # X3: Incomplete-Profile User
    if not age and not occupation and not working_status:
        overlays.append("X3")
        
    # X2: Multi-Domain Achiever
    if primary_category == "High Converter" or b_id == "B2":
        # Check if they have elevated scores in more than one domain
        high_scores_count = 0
        if content_score >= 10: high_scores_count += 1
        if scheme_score >= 10: high_scores_count += 1
        if job_score >= 10: high_scores_count += 1
        if service_score >= 10: high_scores_count += 1
        if high_scores_count > 1:
            overlays.append("X2")
            
    # X4: Economically Vulnerable Overlay
    is_vuln = False
    bpl_val = str(bpl_category).lower().strip()
    if bpl_val in ("true", "1", "yes"):
        is_vuln = True
    else:
        inc_lower = str(personal_income).lower() or str(family_income).lower()
        if "10,000" in inc_lower or "20,000" in inc_lower or "30,000" in inc_lower:
            is_vuln = True
    if is_vuln:
        overlays.append("X4")
        
    # X5: Minority-Language User
    lang_lower = str(preferred_language).lower().strip()
    if lang_lower and lang_lower not in ("english", "hindi", "marathi", "en", "hi", "mr"):
        overlays.append("X5")
        
    # X6: Urban-Context User
    dist_lower = str(district).lower()
    if any(urban in dist_lower for urban in ("mumbai", "thane", "pune", "nagpur")):
        overlays.append("X6")
        
    # Construct base persona
    persona_id = f"{b_id}-{d_id}-{lc_id}"
    
    # Generate name
    b_name = BEHAVIOR_SHORT_NAMES.get(b_id, "Browser")
    d_name = DOMAIN_NAMES.get(d_id, "Welfare Need")
    lc_name = CONTEXT_NAMES.get(lc_id, "Citizen")
    persona_name = f"{lc_name} {b_name} — {d_name}"
    
    return persona_id, persona_name, overlays
