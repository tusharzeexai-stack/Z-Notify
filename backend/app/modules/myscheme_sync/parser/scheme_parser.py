import json
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
from app.modules.myscheme_sync.schemas.sync_schemas import SchemeCreate, SchemeFAQSchema
from app.modules.myscheme_sync.crawler.playwright_crawler import crawler_instance
from app.modules.myscheme_sync.utils.logger import sync_logger

class SchemeParser:
    """
    Modular parser for converting crawled raw scheme data/HTML into structured Pydantic models.
    Supports Next.js state extraction and fallback HTML DOM parsing.
    """

    async def parse_scheme_page(
        self,
        raw_data: Dict[str, Any],
        category_id: int,
        category_slug: str,
        meta: Optional[Dict[str, Any]] = None
    ) -> SchemeCreate:
        url = raw_data.get("url", "")
        slug = url.rstrip("/").split("/")[-1]
        html_content = raw_data.get("html", "")
        next_data_str = raw_data.get("next_data")
        page_obj = raw_data.get("page_obj")

        try:
            # Method 1: Try structured NEXT_DATA JSON extraction
            if next_data_str:
                try:
                    data = json.loads(next_data_str)
                    scheme_details = data.get("props", {}).get("pageProps", {}).get("schemeData", {})
                    if scheme_details:
                        parsed = self._parse_from_next_data(scheme_details, url, slug, category_id)
                        if meta and meta.get("title") and parsed.scheme_name == slug.replace("-", " ").title():
                            parsed.scheme_name = meta.get("title")
                        if meta and meta.get("brief_description") and not parsed.description:
                            parsed.description = meta.get("brief_description")
                        if meta and meta.get("state") and parsed.state == "All India":
                            parsed.state = meta.get("state")
                        return parsed
                except Exception as ex:
                    sync_logger.debug(f"Next.js JSON parsing fallback for {slug}: {ex}")

            # Method 2: Beautiful Soup HTML DOM Parsing
            soup = BeautifulSoup(html_content, "html.parser")
            parsed = self._parse_from_soup(soup, url, slug, category_id)
            if meta:
                if meta.get("title"):
                    parsed.scheme_name = meta.get("title")
                if meta.get("brief_description"):
                    parsed.description = meta.get("brief_description")
                if meta.get("state"):
                    parsed.state = meta.get("state")
                if meta.get("tags"):
                    parsed.tags = meta.get("tags")
                if meta.get("ministry"):
                    parsed.ministry = meta.get("ministry")
            return parsed

        except Exception as e:
            sync_logger.error(f"Parsing failed for scheme URL {url}: {e}")
            if page_obj:
                await crawler_instance.take_screenshot_on_error(page_obj, slug)
            raise e

    def parse_from_meta(self, item: Dict[str, Any], category_id: int, category_slug: str) -> SchemeCreate:
        slug = item.get("slug")
        title = item.get("title") or slug.replace("-", " ").title()
        url = item.get("url") or f"https://www.myscheme.gov.in/schemes/{slug}"
        desc = item.get("brief_description") or f"Government welfare scheme for {title}."
        state = item.get("state") or "All India"
        tags = item.get("tags") or "Welfare, Subsidy"
        ministry = item.get("ministry") or "Government Nodal Ministry"
        
        return SchemeCreate(
            scheme_name=title,
            slug=slug,
            category_id=category_id,
            description=desc,
            benefits="Financial assistance and welfare subsidies provided to eligible citizens under guidelines.",
            eligibility="Resident citizens meeting age, income, and category eligibility guidelines.",
            documents="Identity Card, Address Proof, Income Certificate, Bank Account Details",
            application_process="Submit completed application online or at designated nodal district office.",
            official_url=url,
            application_url=url,
            ministry=ministry,
            department="Department of Welfare",
            state=state,
            tags=tags,
            status="active",
            source_url=url,
            documents_list=["Identity Card", "Address Proof", "Income Certificate"],
            faqs_list=[
                SchemeFAQSchema(question=f"Who is eligible for {title}?", answer="Eligible citizens meeting guidelines."),
                SchemeFAQSchema(question="How to apply?", answer=f"Apply online at {url}")
            ]
        )


    def _parse_from_next_data(
        self,
        details: Dict[str, Any],
        url: str,
        slug: str,
        category_id: int
    ) -> SchemeCreate:
        basic = details.get("basicDetails", {})
        scheme_name = basic.get("schemeName") or basic.get("schemeShortTitle") or slug.replace("-", " ").title()
        
        description = basic.get("briefDescription") or basic.get("schemeContent", {}).get("briefDescription") or ""
        
        # Benefits
        benefits_list = details.get("benefits", [])
        if isinstance(benefits_list, list):
            benefits = "\n".join([str(b.get("text", b)) if isinstance(b, dict) else str(b) for b in benefits_list])
        else:
            benefits = str(benefits_list)

        # Eligibility
        elig_list = details.get("eligibility", {}).get("text", [])
        if isinstance(elig_list, list):
            eligibility = "\n".join([str(e) for e in elig_list])
        else:
            eligibility = str(elig_list)

        # Documents
        doc_items = details.get("documents", [])
        documents_list = []
        if isinstance(doc_items, list):
            for d in doc_items:
                if isinstance(d, dict):
                    documents_list.append(d.get("text", str(d)))
                else:
                    documents_list.append(str(d))
        documents_str = ", ".join(documents_list)

        # Process
        process_steps = details.get("applicationProcess", [])
        if isinstance(process_steps, list):
            application_process = "\n".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in process_steps])
        else:
            application_process = str(process_steps)

        # FAQs
        faqs_raw = details.get("faqs", [])
        faqs_list = []
        if isinstance(faqs_raw, list):
            for f in faqs_raw:
                if isinstance(f, dict):
                    q = f.get("question", "")
                    a = f.get("answer", "")
                    if q and a:
                        faqs_list.append(SchemeFAQSchema(question=q, answer=a))

        ministry = basic.get("ministryName") or basic.get("level") or "Central/State"
        department = basic.get("nodalDepartmentName") or ""
        state = basic.get("stateName") or "All India"

        official_url = basic.get("schemeUrl") or basic.get("officialWebsite") or url
        application_url = basic.get("applicationUrl") or official_url

        tags = basic.get("tags")
        tags_str = ", ".join(tags) if isinstance(tags, list) else str(tags or "")

        return SchemeCreate(
            scheme_name=scheme_name,
            slug=slug,
            category_id=category_id,
            description=description,
            benefits=benefits or "Details available on official portal.",
            eligibility=eligibility or "Open to eligible citizens meeting criteria.",
            documents=documents_str or "Aadhaar Card, Identity Proof, Bank Passbook",
            application_process=application_process or "Apply online via official link.",
            official_url=official_url,
            application_url=application_url,
            ministry=ministry,
            department=department,
            state=state,
            tags=tags_str,
            status="active",
            source_url=url,
            documents_list=documents_list,
            faqs_list=faqs_list
        )

    def _parse_from_soup(
        self,
        soup: BeautifulSoup,
        url: str,
        slug: str,
        category_id: int
    ) -> SchemeCreate:
        h1 = soup.find("h1")
        scheme_name = h1.text.strip() if h1 else slug.replace("-", " ").title()

        # Extract text blocks
        paragraphs = [p.text.strip() for p in soup.find_all("p") if len(p.text.strip()) > 20]
        description = paragraphs[0] if paragraphs else f"Government welfare scheme for {scheme_name}."
        
        benefits = "\n".join(paragraphs[1:3]) if len(paragraphs) > 1 else "Financial assistance and welfare benefits provided to eligible applicants."
        eligibility = "\n".join(paragraphs[3:5]) if len(paragraphs) > 3 else "Resident citizens meeting category requirements."
        
        documents_list = ["Identity Card", "Income Certificate", "Residence Proof", "Bank Account Details"]
        
        return SchemeCreate(
            scheme_name=scheme_name,
            slug=slug,
            category_id=category_id,
            description=description,
            benefits=benefits,
            eligibility=eligibility,
            documents=", ".join(documents_list),
            application_process="Submit completed application online or at designated nodal office.",
            official_url=url,
            application_url=url,
            ministry="Government Nodal Ministry",
            department="Department of Welfare",
            state="All India",
            tags="Welfare, Subsidy, Assistance",
            status="active",
            source_url=url,
            documents_list=documents_list,
            faqs_list=[
                SchemeFAQSchema(
                    question=f"Who is eligible for {scheme_name}?",
                    answer="Citizens fulfilling the age, income, and domicile requirements outlined in official guidelines."
                ),
                SchemeFAQSchema(
                    question="How can I apply?",
                    answer="Visit the official website link provided above to submit an online form."
                )
            ]
        )

scheme_parser = SchemeParser()
