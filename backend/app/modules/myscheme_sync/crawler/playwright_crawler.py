import asyncio
import os
import sys
import time
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from app.modules.myscheme_sync.config.sync_config import sync_settings
from app.modules.myscheme_sync.utils.logger import sync_logger

class PlaywrightCrawler:
    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._lock = asyncio.Lock()

    async def initialize(self):
        async with self._lock:
            if not self._playwright:
                if sys.platform == "win32":
                    try:
                        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                    except Exception:
                        pass
                sync_logger.info("Initializing Playwright Chromium headless instance...")
                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=sync_settings.PLAYWRIGHT_HEADLESS,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
                self._context = await self._browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 800}
                )

    async def get_page(self) -> Page:
        try:
            if not self._context or not self._browser or not self._browser.is_connected():
                await self.initialize()
            return await self._context.new_page()
        except Exception as e:
            sync_logger.warning(f"Browser crash detected ({e}), attempting auto-recovery...")
            await self.close()
            await self.initialize()
            return await self._context.new_page()

    async def fetch_category_scheme_links(self, category_url: str, max_items: int = 2000) -> List[Dict[str, Any]]:
        """
        Crawls a myScheme category page and invokes v6 REST search engine to discover batch scheme metadata with full pagination.
        """
        page = await self.get_page()
        schemes = []
        try:
            import json
            import urllib.parse
            sync_logger.info(f"Crawling category page: {category_url}")
            await page.goto(category_url, wait_until="domcontentloaded", timeout=10000)
            await asyncio.sleep(0.5)

            raw_cat = category_url.rstrip("/").split("/")[-1]
            category_name = urllib.parse.unquote(raw_cat)
            
            # Primary category search query
            filter_variants = [[]]

            seen = set()
            api_total = 0

            for sub_f in filter_variants:
                q_list = [{"identifier": "schemeCategory", "value": category_name}] + sub_f
                q_str = json.dumps(q_list)
                from_offset = 0
                page_size = 100

                while len(schemes) < max_items:
                    api_url = f"https://api.myscheme.gov.in/search/v6/schemes?lang=en&q={urllib.parse.quote(q_str)}&from={from_offset}&size={page_size}"

                    res = await page.evaluate(f"""
                        async () => {{
                            try {{
                                const resp = await fetch("{api_url}", {{
                                    headers: {{
                                        'Accept': 'application/json',
                                        'x-api-key': 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc'
                                    }}
                                }});
                                return await resp.json();
                            }} catch (e) {{
                                return null;
                            }}
                        }}
                    """)

                    if not res or not isinstance(res, dict) or "data" not in res:
                        break

                    data = res.get("data", {})
                    hits = data.get("hits", {}) if isinstance(data, dict) else {}
                    page_meta = hits.get("page", {}) if isinstance(hits, dict) else {}
                    sub_total = page_meta.get("total", 0)
                    if not sub_f:
                        api_total = sub_total

                    items = hits.get("items", []) if isinstance(hits, dict) else []

                    if not items:
                        break

                    for item in items:
                        fields = item.get("fields", {})
                        slug = fields.get("slug")
                        scheme_name = fields.get("schemeName") or fields.get("schemeShortTitle")
                        if slug and slug not in seen:
                            seen.add(slug)
                            states = fields.get("beneficiaryState", [])
                            state_str = states[0] if isinstance(states, list) and states else "All India"
                            tags_list = fields.get("tags", [])
                            tags_str = ", ".join(tags_list) if isinstance(tags_list, list) else str(tags_list or "")
                            schemes.append({
                                "title": scheme_name,
                                "url": f"https://www.myscheme.gov.in/schemes/{slug}",
                                "slug": slug,
                                "brief_description": fields.get("briefDescription"),
                                "state": state_str,
                                "tags": tags_str,
                                "ministry": fields.get("level") or "Nodal Ministry"
                            })

                    from_offset += len(items)
                    if from_offset >= sub_total or len(items) < page_size:
                        break


            # Fallback to DOM parsing if API hits were empty
            if not schemes:
                links = await page.eval_on_selector_all(
                    "a[href*='/schemes/']",
                    "elements => elements.map(el => ({ title: el.innerText.trim(), href: el.href }))"
                )
                for link in links:
                    href = link.get("href")
                    if href and "/schemes/" in href:
                        slug = href.rstrip("/").split("/")[-1]
                        if slug not in seen:
                            seen.add(slug)
                            title = link.get("title") or slug.replace("-", " ").title()
                            schemes.append({
                                "title": title,
                                "url": href,
                                "slug": slug
                            })

            sync_logger.info(f"Discovered {len(schemes)} / {api_total} scheme links from {category_url}")
            return schemes

        except Exception as e:
            sync_logger.error(f"Error fetching category links from {category_url}: {e}")
            return schemes
        finally:
            await page.close()

    async def fetch_scheme_details_page(self, scheme_url: str, retries: int = 0) -> Dict[str, Any]:
        """
        Fetches full HTML content and Next.js state for a single scheme page with fast fallback handling.
        """
        page = await self.get_page()
        try:
            sync_logger.info(f"Fetching scheme detail: {scheme_url}")
            await page.goto(scheme_url, wait_until="domcontentloaded", timeout=4000)

            content = await page.content()
            title = await page.title()
            
            next_data_json = None
            try:
                next_data_json = await page.eval_on_selector(
                    "script#__NEXT_DATA__",
                    "el => el.innerText"
                )
            except Exception:
                pass

            return {
                "url": scheme_url,
                "title": title,
                "html": content,
                "next_data": next_data_json,
                "page_obj": page
            }
        except Exception as e:
            sync_logger.warning(f"Fast detail fetch timeout/fallback for {scheme_url}: {e}")
            return {
                "url": scheme_url,
                "title": "",
                "html": "",
                "next_data": None,
                "page_obj": page
            }
        finally:
            try:
                await page.close()
            except Exception:
                pass


    async def take_screenshot_on_error(self, page: Page, scheme_slug: str) -> str:
        """
        Saves a local screenshot on error into the configured SCREENSHOT_PATH.
        """
        try:
            timestamp = int(time.time())
            filename = f"error_{scheme_slug}_{timestamp}.png"
            filepath = os.path.join(sync_settings.SCREENSHOT_PATH, filename)
            await page.screenshot(path=filepath, full_page=True)
            sync_logger.info(f"Captured error screenshot: {filepath}")
            return filepath
        except Exception as e:
            sync_logger.error(f"Failed to capture error screenshot: {e}")
            return ""

    async def close(self):
        async with self._lock:
            if self._context:
                await self._context.close()
                self._context = None
            if self._browser:
                await self._browser.close()
                self._browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
            sync_logger.info("Playwright crawler resources gracefully closed.")

crawler_instance = PlaywrightCrawler()
