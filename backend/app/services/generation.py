from datetime import datetime
import concurrent.futures
from sqlalchemy.orm import Session
from app.models.all_models import User, Scheme, Job, Service, MedicalFacility, Notification, NotificationReview, NotificationBucket
from app.services.eligibility import calculate_eligibility_score
from app.services.personalization import personalize_notification_content
from app.services.bucketization import classify_notification_bucket

def generate_user_notifications(user_id: str, db: Session, creator_id: str = None, gemini_api_key: str = None, scores: dict = None) -> int:
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

    # 1. Generate Schemes
    if category_limits["Scheme"] > 0:
        schemes = db.query(Scheme).filter(Scheme.is_deleted == False).all()
        scheme_matches = []
        for s in schemes:
            score, reason = calculate_eligibility_score(user, s.eligibility_criteria, db)
            if score >= 40:
                scheme_matches.append((s, score, reason))
        scheme_matches.sort(key=lambda x: x[1], reverse=True)
        
        for s, score, reason in scheme_matches[:category_limits["Scheme"]]:
            raw_text = f"Scheme: {s.title}\nAgency: {s.agency}\nBenefits: {s.benefit_details}\nEligibility Match Details: {reason}"
            priority = "high" if score >= 80 else "medium"
            bucket = classify_notification_bucket(s.title, s.description)
            
            ai_tasks.append({
                "title": s.title,
                "prefix_title": f"Welfare: {s.title}",
                "description": s.description[:200] + "...",
                "raw_text": raw_text,
                "category": "Welfare",
                "score": score,
                "reason": reason,
                "priority": priority,
                "bucket": bucket,
                "source": f"Scheme: {s.id}"
            })

    # 2. Generate Jobs
    if category_limits["Job"] > 0:
        jobs = db.query(Job).filter(Job.is_deleted == False).all()
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

    # Function to run the AI personalization concurrently
    def run_ai_personalization(task):
        p_content = personalize_notification_content(
            user, 
            task["title"], 
            task["raw_text"], 
            task["category"], 
            task["score"], 
            task["reason"], 
            gemini_api_key=gemini_api_key
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
