import logging
import json
import requests
from app.core.config import settings
from app.models.all_models import User

logger = logging.getLogger(__name__)

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

def generate_mock_personalization_json(user: User, title: str, category: str, score: float, match_reason: str) -> dict:
    # Choose mock language based on state
    state_lower = (user.state or "").lower()
    first_name = user.name.split()[0] if user.name else "Citizen"
    
    if "maharashtra" in state_lower:
        lang = "mr"
        m_title = f"{first_name}, शिक्षण आणि कमाई एकत्र! 🎓"
        m_content = f"सरकारी शिकाऊ प्रशिक्षणातून शिका आणि कमवा. आत्ताच संधीचा फायदा घ्या!"
    elif "karnataka" in state_lower:
        lang = "kn"
        m_title = f"{first_name}, ಉದ್ಯೋಗ ಮತ್ತು ಶಿಕ್ಷಣ ಒಟ್ಟಿಗೆ! 🎓"
        m_content = f"ಸರ್ಕಾರಿ ತರಬೇತಿಯೊಂದಿಗೆ ಕಲಿಯಿರಿ ಮತ್ತು ಗಳಿಸಿ. ತಕ್ಷಣ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ!"
    elif "gujarat" in state_lower:
        lang = "gu"
        m_title = f"{first_name}, શિક્ષણ અને કમાણી એકસાથે! 🎓"
        m_content = f"સરકારી તાલીમ દ્વારા શીખો અને કમાઓ. આજે જ લાભ લો!"
    elif "tamil" in state_lower:
        lang = "ta"
        m_title = f"{first_name}, கல்வியும் வருமானமும் ஒன்றாக! 🎓"
        m_content = f"அரசு பயிற்சி மூலம் கற்றுக்கொண்டு சம்பாதிக்கவும். உடனே விண்ணப்பிக்கவும்!"
    else:
        lang = "hi"
        m_title = f"{first_name}, शिक्षा और कमाई एक साथ! 🎓"
        m_content = f"सरकारी प्रशिक्षण से सीखें और कमाएं। अभी आवेदन करें और लाभ उठाएं!"
        
    return {
        "title": m_title,
        "personalized_content": m_content,
        "language": lang,
        "vector": "Vector Dependent Aspirational",
        "segment": "Content Reader",
        "strategy": "Fatigue Breakthrough",
        "why_bullets": [
            f"As a {user.occupation or 'citizen'}, the user matches the {category.lower()} eligibility criteria with a score of {score}%.",
            f"The '{lang}' localization ensures high engagement and comprehension of the program benefits.",
            f"The matching engine detected an affinity alignment based on the user's demographic profile."
        ]
    }

def personalize_notification_content(
    user: User, 
    title: str, 
    raw_content: str, 
    category: str, 
    score: float, 
    match_reason: str,
    gemini_api_key: str = None
) -> str:
    """
    Translates raw notification text into a clear, citizen-friendly, personalized message.
    Returns a JSON serialized string containing structured personalization metadata.
    """
    prompt = f"""
    You are an AI Personalization assistant for Z-Notify HPNS (Government Welfare Portal).
    Given the citizen profile:
    - Name: {user.name}
    - Age: {user.age}
    - State/District: {user.state}, {user.district}
    - Occupation: {user.occupation}
    - Income: {user.income}
    - Disability: {user.disability_status}

    And given the matched program:
    - Category: {category}
    - Title: {title}
    - Description: {raw_content}
    - Eligibility Score: {score}/100
    - Match Reason: {match_reason}

    Generate a hyper-personalized notification in the citizen's local language:
    - Marathi 'mr' if they live in Maharashtra.
    - Kannada 'kn' if they live in Karnataka.
    - Gujarati 'gu' if they live in Gujarat.
    - Tamil 'ta' if they live in Tamil Nadu.
    - Hindi 'hi' for other regions.

    You MUST return a JSON object with the following keys:
    1. "title": A catchy, personalized, regional-language title (e.g. including the user's first name and a relevant emoji like "चंद्रकांत, शिक्षण आणि कमाई एकत्र! 🎓")
    2. "personalized_content": A short, regional-language actionable description (e.g. "सरकारी शिकाऊ प्रशिक्षणातून शिका आणि कमवा. आत्ताच संधीचा फायदा घ्या!")
    3. "language": The language code used (e.g. "mr", "hi", "gu", "kn", "ta")
    4. "vector": A personalization vector name (e.g. "Vector Dependent Aspirational", "Vector Independent Achiever", "Vector Proactive Connector")
    5. "segment": A behavioral user segment name (e.g. "Content Reader", "Active Enroller", "Benefit Seeker")
    6. "strategy": A personalization strategy tag (e.g. "Fatigue Breakthrough", "Urgency Boost", "Benefit Focus")
    7. "why_bullets": A list of 3 concise bullet points in English explaining "WHY THIS NOTIFICATION?" for the admin dashboard.

    Return ONLY the raw JSON block.
    """
    
    # Try Gemini API if key is provided (or loaded via settings)
    actual_key = gemini_api_key or settings.GEMINI_API_KEY
    if actual_key and actual_key.strip() and actual_key != "your_gemini_api_key_here" and "your_" not in actual_key:
        logger.info("Calling Gemini API for personalization...")
        result = call_gemini_api(actual_key, prompt)
        if result:
            return json.dumps(result)
            
    # Try OpenAI fallback if configured
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip() and settings.OPENAI_API_KEY != "your_openai_api_key_here" and "your_" not in settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional government welfare communicator who returns structured JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            personalized = response.choices[0].message.content.strip()
            # Validate JSON
            json.loads(personalized)
            return personalized
        except Exception as e:
            logger.warning(f"OpenAI fallback personalization failed: {e}")
            
    # Structured Local Mock Fallback
    mock_data = generate_mock_personalization_json(user, title, category, score, match_reason)
    return json.dumps(mock_data)
