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

    # Normalize scores and identify top 2 categories
    norm_scores = {}
    if scores:
        for k, v in scores.items():
            k_lower = str(k).lower()
            if "scheme" in k_lower or "welfare" in k_lower:
                norm_scores["Scheme"] = float(v)
            elif "job" in k_lower or "employ" in k_lower:
                norm_scores["Job"] = float(v)
            elif "service" in k_lower:
                norm_scores["Service"] = float(v)
            elif "content" in k_lower:
                norm_scores["Content"] = float(v)
            else:
                norm_scores[k] = float(v)
                
    for cat in ["Scheme", "Job", "Service", "Content"]:
        if cat not in norm_scores:
            norm_scores[cat] = 0.0

    sorted_cats = sorted(norm_scores.keys(), key=lambda k: norm_scores[k], reverse=True)
    top1_cat = sorted_cats[0]
    top2_cat = sorted_cats[1]

    category_limits = {
        top1_cat: 3, # 3 notifications for highest score category
        top2_cat: 2  # 2 notifications for second highest score category
    }
    
    ai_tasks = []

    def get_schemes_tasks(limit):
        tasks = []
        if limit <= 0:
            return tasks
        from app.services.scheme_search import find_or_search_scheme
        search_query = f"{user.occupation or ''} {user.state or ''} welfare scheme"
        schemes_found = find_or_search_scheme(
            db=db,
            query_text=search_query,
            user_state=user.state,
            user_occupation=user.occupation,
            limit=limit
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
            
            tasks.append({
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
        return tasks

    def get_jobs_tasks(limit):
        tasks = []
        if limit <= 0:
            return tasks
        jobs = db.query(Job).filter(Job.is_deleted == False).all()
        job_matches = []
        for j in jobs:
            score = 0
            reasons = []
            if user.state and j.state and user.state.lower() in j.state.lower():
                score += 30
                reasons.append("State match")
            if user.district and j.district and user.district.lower() in j.district.lower():
                score += 30
                reasons.append("District match")
            if user.education and j.education_qualification and user.education.lower() in j.education_qualification.lower():
                score += 20
                reasons.append("Education match")
            if user.occupation and j.occupation and user.occupation.lower() in j.occupation.lower():
                score += 20
                reasons.append("Occupation match")
            if score == 0 and not user.state and not user.district and not user.education:
                score = 50
                reasons.append("General availability")
            if score >= 30:
                job_matches.append((j, score, ", ".join(reasons)))
        job_matches.sort(key=lambda x: x[1], reverse=True)
        
        selected_jobs_data = []
        if job_matches:
            for j, score, reason in job_matches[:limit]:
                role = j.job_role_position or "Unknown Role"
                company = j.name_of_company_person or "Unknown Company"
                qualifications = (j.education_qualification or "Any").replace('[', '').replace(']', '').replace('"', '')
                raw_text = (
                    f"Job Title / Role: {role}\n"
                    f"Company: {company}\n"
                    f"Category: {j.job_category or 'N/A'}\n"
                    f"Location: {j.city or j.district or j.state or 'Any'}\n"
                    f"Salary: {j.salary_range or 'Not Disclosed'}\n"
                    f"Eligibility Requirements: {qualifications}, Experience: {j.exp_required or 'N/A'}\n"
                    f"Apply Link / Contact: {j.job_url or j.job_contact_email or j.job_contact_number or 'Visit official portal'}\n"
                    f"Match Reason: {reason}"
                )
                selected_jobs_data.append({
                    "title": role,
                    "description": f"Vacancy at {company} in {j.job_category or 'N/A'}.",
                    "raw_text": raw_text,
                    "score": float(score),
                    "reason": reason,
                    "source": f"Job: {j.sl_no}"
                })
        else:
            try:
                from googlesearch import search
                search_query = f"'{user.occupation or 'Jobs'}' vacancy in '{user.district or user.state or 'India'}' apply online"
                search_results = list(search(search_query, num_results=limit))
                for i, result_url in enumerate(search_results):
                    raw_text = (
                        f"Job Title / Role: Job vacancy suitable for {user.occupation or 'your profile'}\n"
                        f"Location: {user.district or user.state or 'Your area'}\n"
                        f"Apply Link: {result_url}\n"
                        f"Match Reason: Web search fallback matched your professional profile."
                    )
                    selected_jobs_data.append({
                        "title": f"New Job Opening ({user.occupation or 'General'})",
                        "description": f"An external job opportunity was found matching your profile.",
                        "raw_text": raw_text,
                        "score": 75.0,
                        "reason": "Web Search Match",
                        "source": f"Web Search: {result_url[:30]}..."
                    })
            except Exception as e:
                print(f"Web search fallback failed: {e}")
                
        for data in selected_jobs_data:
            priority = "medium" if data["score"] >= 70 else "low"
            bucket = classify_notification_bucket(data["title"], data["description"])
            tasks.append({
                "title": data["title"],
                "prefix_title": f"Job: {data['title']}",
                "description": data["description"],
                "raw_text": data["raw_text"],
                "category": "Employment",
                "score": data["score"],
                "reason": data["reason"],
                "priority": priority,
                "bucket": bucket,
                "source": data["source"]
            })
        return tasks

    def get_services_tasks(limit):
        tasks = []
        if limit <= 0:
            return tasks
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
        for sv, score, reason in service_matches[:limit]:
            service_url = ""
            try:
                from googlesearch import search
                search_query = f"official portal {sv.title} apply online {sv.department}"
                search_results = list(search(search_query, num_results=1))
                if search_results:
                    service_url = search_results[0]
            except Exception as e:
                print(f"Service link search failed: {e}")
            link_text = f"\nApply Link / Contact: {service_url}" if service_url else ""
            raw_text = f"Service: {sv.title}\nDepartment: {sv.department}\nDescription: {sv.description}\nEligibility: {reason}{link_text}"
            bucket = classify_notification_bucket(sv.title, sv.description)
            tasks.append({
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
        return tasks

    def get_content_tasks(limit):
        tasks = []
        if limit <= 0:
            return tasks
        content_items = [
            ("Financial Literacy Guide", "Read our latest guide on managing savings and investing for the future.", "Education"),
            ("New User Handbook", "Discover all the features of the HPNS system to maximize your welfare benefits.", "General"),
            ("Digital Security Tips", "Learn how to protect your personal information and identity online.", "Security")
        ]
        for idx in range(limit):
            if idx < len(content_items):
                title, desc, tag = content_items[idx]
                raw_text = f"Article: {title}\nTopic: {tag}\nSummary: {desc}"
                tasks.append({
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
        return tasks

    def get_category_tasks(cat_name, limit):
        if cat_name == "Scheme":
            return get_schemes_tasks(limit)
        elif cat_name == "Job":
            return get_jobs_tasks(limit)
        elif cat_name == "Service":
            return get_services_tasks(limit)
        elif cat_name == "Content":
            return get_content_tasks(limit)
        return []

    # Step 1: 3 notifications for highest score category
    ai_tasks.extend(get_category_tasks(top1_cat, 3))

    # Step 2: 2 notifications for second highest score category
    ai_tasks.extend(get_category_tasks(top2_cat, 2))

    # Step 3: 1 notification for Healthcare
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

    # Step 4: 1 notification for Announcement / General
    announcement_title = "Important Announcement: Profile Update"
    announcement_desc = "Please ensure your demographic profile is updated to receive accurate welfare recommendations."
    raw_text = f"Announcement: {announcement_title}\nDetails: {announcement_desc}"
    ai_tasks.append({
        "title": announcement_title,
        "prefix_title": f"Announcement: {announcement_title}",
        "description": announcement_desc,
        "raw_text": raw_text,
        "category": "Announcement",
        "score": 100.0,
        "reason": "System wide announcement",
        "priority": "high",
        "bucket": "Announcements",
        "source": "System Announcement"
    })

    # Step 5: Fill up to 7 notifications using remaining Schemes if count < 7
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
