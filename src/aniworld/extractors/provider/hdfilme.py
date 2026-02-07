import re
import time
from typing import Optional
from playwright.sync_api import sync_playwright
from ... import config

def get_direct_link_from_hdfilme(url: str) -> str:
    """
    Extract direct video link from HDFilme page using Playwright to intercept network requests.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        found_m3u8 = []

        def handle_request(request):
            if ".m3u8" in request.url:
                if "master.m3u8" in request.url or not any(x in request.url for x in ["hls.js", "player.js", "analytics", "ads"]):
                    found_m3u8.append(request.url)

        page.on("request", handle_request)

        try:
            # Navigate
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Wait for content
            time.sleep(2)

            # 1. Click "Okay" button if present
            try:
                page.click("text=Okay", timeout=3000)
                time.sleep(1)
            except:
                pass

            # 2. Click the Play button in the center (it's often a large circle/svg)
            try:
                # Try clicking by selector or coordinate if needed, but text/role is safer
                page.click("#player", timeout=3000)
                time.sleep(1)
            except:
                pass
            
            # 3. Handle the two clicks - the second one is often inside the iframe
            # Let's try to click everywhere where a play button might be
            try:
                page.mouse.click(640, 400) # Click center
                time.sleep(1)
            except:
                pass

            # Wait and check if m3u8 appeared
            for _ in range(20):
                if found_m3u8:
                    break
                time.sleep(0.5)

            if not found_m3u8:
                # Try clicking frames
                for frame in page.frames:
                    if "meinecloud.click" in frame.url or "supervideo" in frame.url or "dropload" in frame.url:
                        try:
                            frame.click("body", timeout=2000)
                            time.sleep(1)
                        except:
                            pass

            # Final check
            for _ in range(10):
                if found_m3u8:
                    break
                time.sleep(0.5)

            if found_m3u8:
                master = next((x for x in found_m3u8 if "master.m3u8" in x), found_m3u8[0])
                return master
            
            raise ValueError("m3u8 stream not found in network traffic.")

        except Exception as e:
            raise ValueError(f"Playwright failed: {e}")
        finally:
            browser.close()

def get_preview_image_link_from_hdfilme(url: str) -> Optional[str]:
    import requests
    from bs4 import BeautifulSoup
    try:
        response = requests.get(url, headers={"User-Agent": config.RANDOM_USER_AGENT}, timeout=config.DEFAULT_REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        img = soup.find("img", class_="lazy")
        if img and img.get("data-src"):
            src = img.get("data-src")
            return f"https://hdfilme.press{src}" if src.startswith("/") else src
        return None
    except:
        return None
