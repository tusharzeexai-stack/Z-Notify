from datetime import datetime
import concurrent.futures
from sqlalchemy.orm import Session
from app.models.all_models import User, Scheme, Job, Service, MedicalFacility, Notification, NotificationReview, NotificationBucket
from app.services.eligibility import calculate_eligibility_score
from app.services.personalization import personalize_notification_content
from app.services.bucketization import classify_notification_bucket

def generate_user_notifications(user_id: str, db: Session, creator_id: str = None, gemini_api_key: str = None, scores: dict = None, user_data: dict = None) -> int:
    """
    Generates up to 7 personalized notifications for a user dynamically based on engagement scores.
    Returns the count of generated notifications.
    This version uses concurrent multi-threading to speed up the AI personalization process.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        return 0
        
    # Clear existing non-delivered notifications for clean regeneration if requested
    db.query(NotificationReview).filter(
        NotificationReview.notification_id.in_(
            db.query(Notification.id).filter(Notification.user_id == user_id, Notification.status.in_(["DRAFT", "GENERATED", "PENDING_REVIEW"]))
        )
    ).delete(synchronize_session=False)
    db.query(NotificationBucket).filter(
        NotificationBucket.notification_id.in_(
            db.query(Notification.id).filter(Notification.user_id == user_id, Notification.status.in_(["DRAFT", "GENERATED", "PENDING_REVIEW"]))
        )
    ).delete(synchronize_session=False)
    db.query(Notification).filter(
        Notification.user_id == user_id, 
        Notification.status.in_(["DRAFT", "GENERATED", "PENDING_REVIEW"])
    ).delete(synchronize_session=False)
    db.commit()

    category_limits = {"Scheme": 0, "Job": 0, "Service": 0, "Content": 0}
    if scores:
        sorted_cats = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        if len(sorted_cats) >= 1:
            category_limits[sorted_cats[0]] = 3
        if len(sorted_cats) >= 2:
            category_limits[sorted_cats[1]] = 2
    else:
        category_limits["Scheme"] = 3
        category_limits["Job"] = 2
        
    health_limit = 1
    common_limit = 1
    
    # List to hold tasks for the ThreadPoolExecutor
    ai_tasks = []

    # 1. Generate Schemes (DB First Check -> Web Search Fallback)
    if category_limits["Scheme"] > 0:
        from app.services.scheme_search import find_or_search_scheme
        search_query = f"{user.occupation or ''} {user.state or ''} welfare scheme"
        schemes_found = find_or_search_scheme(
            db=db,
            query_text=search_query,
            user_state=user.state,
            user_occupation=user.occupation,
            limit=category_limits["Scheme"]
        )
        
        for s in schemes_found:
            s_name = s.get("scheme_name", "Welfare Scheme")
            source_type = s.get("source_type", "LOCAL_DATABASE")
            agency = s.get("agency", "Government Portal")
            benefits = s.get("benefits", "Financial assistance and welfare subsidies")
            eligibility = s.get("eligibility", "Resident citizen")
            official_url = s.get("official_url", "https://www.myscheme.gov.in")
            
            score = 85.0
            reason = f"Matched citizen profile via {source_type}"
            raw_text = f"Scheme: {s_name}\nData Source: {source_type}\nAgency: {agency}\nBenefits: {benefits}\nEligibility: {eligibility}\nOfficial Portal: {official_url}"
            priority = "high"
            bucket = classify_notification_bucket(s_name, s.get("description", ""))
            
            ai_tasks.append({
                "title": s_name,
                "prefix_title": f"Welfare: {s_name}",
                "description": s.get("description", "")[:200] + "...",
                "raw_text": raw_text,
                "category": "Welfare",
                "score": score,
                "reason": reason,
                "priority": priority,
                "bucket": bucket,
                "source": f"Scheme: {s.get('id', 'db-scheme')}"
            })

    # 2. Generate Jobs
    if category_limits["Job"] > 0:
        jobs = db.query(Job).filter(Job.is_deleted == False).all()
        if not jobs:
            jobs = [
                Job(
                    id="job-fallback-1",
                    title="Data Entry Operator / Clerk",
                    description="District Administrative Office is hiring data entry clerks for document indexing and citizen applications.",
                    department="District Administrative Office",
                    location="Bhandara, Maharashtra",
                    salary="₹15,000 - ₹20,000 / month",
                    eligibility_criteria={"state": "Maharashtra", "occupation": "Any"}
                ),
                Job(
                    id="job-fallback-2",
                    title="Assistant Agriculture Field Officer",
                    description="Directorate of Agriculture needs field supervisors for local crop surveys and seed distribution campaigns.",
                    department="State Agricultural Directorate",
                    location="Nagpur, Maharashtra",
                    salary="₹25,000 / month",
                    eligibility_criteria={"state": "Maharashtra", "occupation": "Farmer"}
                )
            ]
        job_matches = []
        for j in jobs:
            score, reason = calculate_eligibility_score(user, j.eligibility_criteria, db)
            if score >= 40:
                job_matches.append((j, score, reason))
        job_matches.sort(key=lambda x: x[1], reverse=True)
        
        for j, score, reason in job_matches[:category_limits["Job"]]:
            raw_text = f"Job Title: {j.title}\nDepartment: {j.department}\nLocation: {j.location}\nSalary: {j.salary}\nMatch Reason: {reason}"
            priority = "medium" if score >= 70 else "low"
            bucket = classify_notification_bucket(j.title, j.description)
            
            ai_tasks.append({
                "title": j.title,
                "prefix_title": f"Job: {j.title}",
                "description": j.description[:200] + "...",
                "raw_text": raw_text,
                "category": "Employment",
                "score": score,
                "reason": reason,
                "priority": priority,
                "bucket": bucket,
                "source": f"Job: {j.id}"
            })

    # 3. Generate Services
    if category_limits["Service"] > 0:
        services = db.query(Service).filter(Service.is_deleted == False).all()
        if not services:
            services = [
                Service(
                    id="service-fallback-1",
                    title="MahaDBT Scholarship & Direct Benefit Transfer Portal",
                    description="Social Justice & Special Assistance Department Direct Benefit Transfer portal for education and welfare.",
                    department="Social Justice & Special Assistance Department",
                    eligibility_criteria={"state": "Maharashtra", "occupation": "Any"}
                ),
                Service(
                    id="service-fallback-2",
                    title="e-Shram Citizen Registration & Livelihood Card",
                    description="Ministry of Labour & Employment portal for unorganized workers to get social security and pension benefits.",
                    department="Ministry of Labour & Employment",
                    eligibility_criteria={"state": "Maharashtra", "occupation": "Farmer"}
                )
            ]
        service_matches = []
        for sv in services:
            score, reason = calculate_eligibility_score(user, sv.eligibility_criteria, db)
            if score >= 40:
                service_matches.append((sv, score, reason))
        service_matches.sort(key=lambda x: x[1], reverse=True)
        
        for sv, score, reason in service_matches[:category_limits["Service"]]:
            raw_text = f"Service: {sv.title}\nDepartment: {sv.department}\nDescription: {sv.description}\nEligibility: {reason}"
            bucket = classify_notification_bucket(sv.title, sv.description)
            
            ai_tasks.append({
                "title": sv.title,
                "prefix_title": f"Service: {sv.title}",
                "description": sv.description[:200] + "...",
                "raw_text": raw_text,
                "category": "Service",
                "score": score,
                "reason": reason,
                "priority": "medium",
                "bucket": bucket,
                "source": f"Service: {sv.id}"
            })
            
    # 4. Generate Content (Synthesized)
    if category_limits["Content"] > 0:
        content_items = [
            ("Financial Literacy Guide", "Read our latest guide on managing savings and investing for the future.", "Education"),
            ("New User Handbook", "Discover all the features of the HPNS system to maximize your welfare benefits.", "General"),
            ("Digital Security Tips", "Learn how to protect your personal information and identity online.", "Security")
        ]
        for idx in range(category_limits["Content"]):
            if idx < len(content_items):
                title, desc, tag = content_items[idx]
                raw_text = f"Article: {title}\nTopic: {tag}\nSummary: {desc}"
                
                ai_tasks.append({
                    "title": title,
                    "prefix_title": f"Content: {title}",
                    "description": desc,
                    "raw_text": raw_text,
                    "category": "Content",
                    "score": 100.0,
                    "reason": "High content engagement score",
                    "priority": "low",
                    "bucket": "Content & Articles",
                    "source": "System Content"
                })

    # 5. Generate Healthcare (Goal: 1)
    if health_limit > 0:
        facilities = db.query(MedicalFacility).filter(MedicalFacility.is_deleted == False).all()
        if not facilities:
            facilities = [
                MedicalFacility(
                    id="medical-facility-fallback-1",
                    name="Primary Health Center (PHC) Bhandara",
                    type="General OPD & Wellness Clinic",
                    location="Main Road, Bhandara, Maharashtra",
                    services_offered={"state": "Maharashtra", "occupation": "Any"}
                )
            ]
        facility_matches = []
        for f in facilities:
            score, reason = calculate_eligibility_score(user, f.services_offered, db)
            facility_matches.append((f, score, reason))
        facility_matches.sort(key=lambda x: x[1], reverse=True)
        
        if facility_matches:
            f, score, reason = facility_matches[0]
            raw_text = f"Facility: {f.name}\nType: {f.type}\nLocation: {f.location}\nProximity Eligibility: {reason}"
            priority = "high" if f.type.lower() == "emergency" else "medium"
            bucket = classify_notification_bucket(f.name, f.name + " " + f.type)
            
            ai_tasks.append({
                "title": f.name,
                "prefix_title": f"Health: {f.name}",
                "description": f"Type: {f.type} facility located at {f.location}.",
                "raw_text": raw_text,
                "category": "Healthcare",
                "score": score,
                "reason": reason,
                "priority": priority,
                "bucket": bucket,
                "source": f"Medical: {f.id}"
            })

    # 6. Generate Common Announcement (Goal: 1)
    if common_limit > 0:
        title = "Important Announcement: Profile Update"
        desc = "Please ensure your demographic profile is updated to receive accurate welfare recommendations."
        raw_text = f"Announcement: {title}\nDetails: {desc}"
        
        ai_tasks.append({
            "title": title,
            "prefix_title": f"Announcement: {title}",
            "description": desc,
            "raw_text": raw_text,
            "category": "Announcement",
            "score": 100.0,
            "reason": "System wide announcement",
            "priority": "high",
            "bucket": "Announcements",
            "source": "System Announcement"
        })

    # 7. Fill up to 7 notifications using remaining Schemes if count < 7
    if len(ai_tasks) < 7:
        from app.services.scheme_search import find_or_search_scheme
        needed = 7 - len(ai_tasks)
        extra_schemes = find_or_search_scheme(
            db=db,
            query_text=f"{user.occupation or ''} benefit scheme",
            user_state=user.state,
            user_occupation=user.occupation,
            limit=needed + 5
        )
        
        added_sources = {t["source"] for t in ai_tasks}
        for s in extra_schemes:
            if len(ai_tasks) >= 7:
                break
            source_id = f"Scheme: {s.get('id', 'extra-scheme')}"
            if source_id in added_sources:
                continue
                
            s_name = s.get("scheme_name", "Welfare Scheme")
            source_type = s.get("source_type", "LOCAL_DATABASE")
            agency = s.get("agency", "Government Portal")
            benefits = s.get("benefits", "Financial assistance and welfare subsidies")
            eligibility = s.get("eligibility", "Resident citizen")
            official_url = s.get("official_url", "https://www.myscheme.gov.in")
            
            score = 80.0
            reason = f"Matched via {source_type}"
            raw_text = f"Scheme: {s_name}\nData Source: {source_type}\nAgency: {agency}\nBenefits: {benefits}\nEligibility: {eligibility}\nOfficial Portal: {official_url}"
            priority = "medium"
            bucket = classify_notification_bucket(s_name, s.get("description", ""))
            
            ai_tasks.append({
                "title": s_name,
                "prefix_title": f"Welfare: {s_name}",
                "description": s.get("description", "")[:200] + "...",
                "raw_text": raw_text,
                "category": "Welfare",
                "score": score,
                "reason": reason,
                "priority": priority,
                "bucket": bucket,
                "source": source_id
            })

    # Function to run the AI personalization concurrently
    def run_ai_personalization(task):
        p_content = personalize_notification_content(
            user, 
            task["title"], 
            task["raw_text"], 
            task["category"], 
            task["score"], 
            task["reason"], 
            gemini_api_key=gemini_api_key,
            user_data=user_data
        )
        task["personalized_content"] = p_content
        return task

    # Process all AI calls concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        completed_tasks = list(executor.map(run_ai_personalization, ai_tasks))

    generated_count = 0
    # Save all notifications to the database
    for t in completed_tasks:
        notif = Notification(
            user_id=user.id, 
            citizen_id=user.id,
            title=t["prefix_title"], 
            description=t["description"],
            raw_content=t["raw_text"], 
            personalized_content=t["personalized_content"], 
            category=t["category"],
            priority=t["priority"], 
            eligibility_score=t["score"], 
            reason_for_match=t["reason"], 
            source=t["source"],
            status="DRAFT", 
            created_by=creator_id
        )
        db.add(notif)
        db.flush()
        db.add(NotificationBucket(notification_id=notif.id, bucket_name=t["bucket"]))
        db.add(NotificationBucket(notification_id=notif.id, bucket_name=f"User-{user.id}"))
        generated_count += 1

    db.commit()
    return generated_count
