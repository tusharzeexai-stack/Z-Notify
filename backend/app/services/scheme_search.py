import logging
import urllib.parse
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modules.myscheme_sync.models.sync_models import SchemeModel

logger = logging.getLogger(__name__)

def _format_db_scheme(s: SchemeModel) -> Dict[str, Any]:
    """Formats a DB SchemeModel object into a standardized scheme dictionary."""
    return {
        "id": str(s.id),
        "scheme_name": s.scheme_name or s.title or "Welfare Scheme",
        "description": (s.description or s.benefit_details or "")[:300],
        "benefits": (s.benefits or s.benefit_details or "Financial assistance and welfare subsidies")[:250],
        "eligibility": (s.eligibility or s.eligibility_criteria or "Resident citizen")[:250],
        "official_url": s.official_url or s.source_url or "https://www.myscheme.gov.in",
        "agency": s.agency or s.ministry or s.department or "Government Portal",
        "state": s.state or "All India",
        "source_type": "LOCAL_DATABASE"
    }

def _execute_web_search(query_text: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Performs a fast live web search fallback for government schemes when local DB returns 0 matches.
    Scrapes DuckDuckGo HTML or myScheme online search for official scheme titles, descriptions, and portal URLs.
    """
    search_term = f"{query_text} government scheme india site:gov.in OR site:myscheme.gov.in"
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(search_term)}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        links = re.findall(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html)
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html) or re.findall(r'class="result__snippet"[^>]*>(.*?)</div>', html)
        
        results = []
        for i in range(min(limit, len(links))):
            raw_url, raw_title = links[i]
            title = re.sub(r'<[^>]+>', '', raw_title).strip()
            
            # Extract clean URL from DuckDuckGo redirect link
            actual_url = raw_url
            if 'uddg=' in raw_url:
                try:
                    actual_url = urllib.parse.unquote(raw_url.split('uddg=')[1].split('&')[0])
                except Exception:
                    actual_url = raw_url
                    
            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip() if i < len(snippets) else "Government scheme details available online."
            
            results.append({
                "id": f"web-scheme-{i+1}",
                "scheme_name": title,
                "description": snippet[:300],
                "benefits": snippet[:250],
                "eligibility": "Check official portal for detailed eligibility criteria",
                "official_url": actual_url,
                "agency": "Government Portal (Discovered via Web Search)",
                "state": "All India",
                "source_type": "GOOGLE_WEB_SEARCH"
            })
            
        if results:
            logger.info(f"[SchemeSearch] Web Search returned {len(results)} live schemes for '{query_text}'.")
            return results
    except Exception as e:
        logger.warning(f"[SchemeSearch] Web search fallback encountered error: {e}")
        
    return []

def find_or_search_scheme(
    db: Session,
    query_text: str,
    user_state: Optional[str] = None,
    user_occupation: Optional[str] = None,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Primary scheme retrieval engine:
    1. First checks in our database (`schemes` table) for related schemes based on keyword, title, benefits, tags, or state.
    2. If related scheme is available in database, pulls and returns DB scheme records.
    3. If NOT available in local database (0 matches), executes an external web search to pull online government scheme details.
    """
    query_str = (query_text or "").strip()
    
    # Extract search tokens
    tokens = [t.strip() for t in re.split(r'[\s,/]+', query_str) if len(t.strip()) > 2]
    if user_occupation and user_occupation.strip():
        tokens.append(user_occupation.strip())

    # --- 1. LOCAL DATABASE SEARCH ---
    query = db.query(SchemeModel).filter(SchemeModel.is_deleted == False)
    
    conditions = []
    for token in tokens[:4]:
        pattern = f"%{token}%"
        conditions.extend([
            SchemeModel.scheme_name.ilike(pattern),
            SchemeModel.description.ilike(pattern),
            SchemeModel.benefits.ilike(pattern),
            SchemeModel.eligibility.ilike(pattern),
            SchemeModel.tags.ilike(pattern)
        ])
        
    if conditions:
        query = query.filter(or_(*conditions))
        
    if user_state:
        query = query.filter(
            or_(
                SchemeModel.state.ilike(f"%{user_state}%"),
                SchemeModel.state.is_(None),
                SchemeModel.state == "",
                SchemeModel.state.ilike("%All India%")
            )
        )
        
    db_matches = query.limit(limit).all()
    
    if db_matches:
        logger.info(f"[SchemeSearch] Found {len(db_matches)} matching scheme(s) in local DB for query: '{query_str}'")
        return [_format_db_scheme(s) for s in db_matches]
        
    # --- 2. ONLINE WEB SEARCH FALLBACK ---
    logger.info(f"[SchemeSearch] No local DB matches found for '{query_str}'. Performing Web Search fallback...")
    web_results = _execute_web_search(query_str, limit=limit)
    if web_results:
        return web_results
        
    # --- 3. FINAL FALLBACK TO RECENT SCHEMES IN DB ---
    fallback_schemes = db.query(SchemeModel).filter(SchemeModel.is_deleted == False).limit(limit).all()
    return [_format_db_scheme(s) for s in fallback_schemes]
