import os

filepath = r"d:\Z-Notify\backend\app\services\generation.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

new_content = """from datetime import datetime
from sqlalchemy.orm import Session
from app.models.all_models import User, Scheme, Job, Service, MedicalFacility, Notification, NotificationReview, NotificationBucket
from app.services.eligibility import calculate_eligibility_score
from app.services.personalization import personalize_notification_content
from app.services.bucketization import classify_notification_bucket

def generate_user_notifications(user_id: str, db: Session, creator_id: str = None, gemini_api_key: str = None, scores: dict = None) -> int:
    \"\"\"
    Generates up to 7 personalized notifications for a user dynamically based on engagement scores.
    Returns the count of generated notifications.
    \"\"\"
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        return 0
        
    # Clear existing non-delivered notifications for clean regeneration if requested
    db.query(NotificationReview).filter(
        NotificationReview.notification_id.in_(
            db.query(Notification.id).filter(Notification.user_id == user_id, Notification.status.in_(["GENERATED", "PENDING_REVIEW"]))
        )
    ).delete(synchronize_session=False)
    db.query(NotificationBucket).filter(
        NotificationBucket.notification_id.in_(
            db.query(Notification.id).filter(Notification.user_id == user_id, Notification.status.in_(["GENERATED", "PENDING_REVIEW"]))
        )
    ).delete(synchronize_session=False)
    db.query(Notification).filter(
        Notification.user_id == user_id, 
        Notification.status.in_(["GENERATED", "PENDING_REVIEW"])
    ).delete(synchronize_session=False)
    db.commit()

    generated_count = 0
    
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
    
    def add_notification(notif, bucket):
        nonlocal generated_count
        db.add(notif)
        db.flush()
        db.add(NotificationBucket(notification_id=notif.id, bucket_name=bucket))
        db.add(NotificationBucket(notification_id=notif.id, bucket_name=f"User-{user.id}"))
        db.add(NotificationReview(notification_id=notif.id, status="PENDING_REVIEW"))
        generated_count += 1
    
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
            raw_text = f"Scheme: {s.title}\\nAgency: {s.agency}\\nBenefits: {s.benefit_details}\\nEligibility Match Details: {reason}"
            p_content = personalize_notification_content(user, s.title, raw_text, "Welfare", score, reason, gemini_api_key=gemini_api_key)
            priority = "high" if score >= 80 else "medium"
            bucket = classify_notification_bucket(s.title, s.description)
            
            notif = Notification(
                user_id=user.id, title=f"Welfare: {s.title}", description=s.description[:200] + "...",
                raw_content=raw_text, personalized_content=p_content, category="Welfare",
                priority=priority, eligibility_score=score, reason_for_match=reason, source=f"Scheme: {s.id}",
                status="PENDING_REVIEW", created_by=creator_id
            )
            add_notification(notif, bucket)

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
            raw_text = f"Job Title: {j.title}\\nDepartment: {j.department}\\nLocation: {j.location}\\nSalary: {j.salary}\\nMatch Reason: {reason}"
            p_content = personalize_notification_content(user, j.title, raw_text, "Employment", score, reason, gemini_api_key=gemini_api_key)
            priority = "medium" if score >= 70 else "low"
            bucket = classify_notification_bucket(j.title, j.description)
            
            notif = Notification(
                user_id=user.id, title=f"Job: {j.title}", description=j.description[:200] + "...",
                raw_content=raw_text, personalized_content=p_content, category="Employment",
                priority=priority, eligibility_score=score, reason_for_match=reason, source=f"Job: {j.id}",
                status="PENDING_REVIEW", created_by=creator_id
            )
            add_notification(notif, bucket)

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
            raw_text = f"Service: {sv.title}\\nDepartment: {sv.department}\\nDescription: {sv.description}\\nEligibility: {reason}"
            p_content = personalize_notification_content(user, sv.title, raw_text, "Service", score, reason, gemini_api_key=gemini_api_key)
            bucket = classify_notification_bucket(sv.title, sv.description)
            
            notif = Notification(
                user_id=user.id, title=f"Service: {sv.title}", description=sv.description[:200] + "...",
                raw_content=raw_text, personalized_content=p_content, category="Service",
                priority="medium", eligibility_score=score, reason_for_match=reason, source=f"Service: {sv.id}",
                status="PENDING_REVIEW", created_by=creator_id
            )
            add_notification(notif, bucket)
            
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
                raw_text = f"Article: {title}\\nTopic: {tag}\\nSummary: {desc}"
                p_content = personalize_notification_content(user, title, raw_text, "Content", 100, "High content engagement", gemini_api_key=gemini_api_key)
                
                notif = Notification(
                    user_id=user.id, title=f"Content: {title}", description=desc,
                    raw_content=raw_text, personalized_content=p_content, category="Content",
                    priority="low", eligibility_score=100.0, reason_for_match="High content engagement score", source="System Content",
                    status="PENDING_REVIEW", created_by=creator_id
                )
                add_notification(notif, "Content & Articles")

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
            raw_text = f"Facility: {f.name}\\nType: {f.type}\\nLocation: {f.location}\\nProximity Eligibility: {reason}"
            p_content = personalize_notification_content(user, f.name, raw_text, "Healthcare", score, reason, gemini_api_key=gemini_api_key)
            priority = "high" if f.type.lower() == "emergency" else "medium"
            bucket = classify_notification_bucket(f.name, f.name + " " + f.type)
            
            notif = Notification(
                user_id=user.id, title=f"Health: {f.name}", description=f"Type: {f.type} facility located at {f.location}.",
                raw_content=raw_text, personalized_content=p_content, category="Healthcare",
                priority=priority, eligibility_score=score, reason_for_match=reason, source=f"Medical: {f.id}",
                status="PENDING_REVIEW", created_by=creator_id
            )
            add_notification(notif, bucket)

    # 6. Generate Common Announcement (Goal: 1)
    if common_limit > 0:
        title = "Important Announcement: Profile Update"
        desc = "Please ensure your demographic profile is updated to receive accurate welfare recommendations."
        raw_text = f"Announcement: {title}\\nDetails: {desc}"
        p_content = personalize_notification_content(user, title, raw_text, "Announcement", 100, "System wide announcement", gemini_api_key=gemini_api_key)
        
        notif = Notification(
            user_id=user.id, title=f"Announcement: {title}", description=desc,
            raw_content=raw_text, personalized_content=p_content, category="Announcement",
            priority="high", eligibility_score=100.0, reason_for_match="System wide announcement", source="System Announcement",
            status="PENDING_REVIEW", created_by=creator_id
        )
        add_notification(notif, "Announcements")

    db.commit()
    return generated_count
"""

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated generation.py")
