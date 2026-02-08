import re
import requests
from bs4 import BeautifulSoup
from ...config import RANDOM_USER_AGENT, DEFAULT_REQUEST_TIMEOUT


def get_direct_link_from_streamtape(embeded_streamtape_link: str) -> str:
    """
    Extract direct video link from Streamtape embed page.
    """
    try:
        response = requests.get(
            embeded_streamtape_link,
            headers={"User-Agent": RANDOM_USER_AGENT},
            timeout=DEFAULT_REQUEST_TIMEOUT,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        
        # Streamtape hides the link using JavaScript parts
        # Look for something like: document.getElementById('videolink').innerHTML = "..." + '...';
        script_tags = soup.find_all("script")
        
        video_link_part = None
        for script in script_tags:
            if script.string and "videolink" in script.string:
                # Extract the parts of the URL
                # Example: document.getElementById('robotlink').innerHTML = '//streamtape.com/get_video?id=...&expires=...&ip=...&token=...';
                match = re.search(r"document\.getElementById\(['\"].+link['\"]\)\.innerHTML\s*=\s*['\"]([^'\"]+)['\"]\s*\+\s*['\"]([^'\"]+)['\"]", script.string)
                if match:
                    video_link_part = "https:" + match.group(1) + match.group(2)
                    break
        
        if not video_link_part:
            # Fallback for newer structure
            match = re.search(r"['\"]robotlink['\"]\)\.innerHTML\s*=\s*['\"]([^'\"]+)['\"]", response.text)
            if match:
                video_link_part = "https:" + match.group(1)

        if video_link_part:
            return video_link_part

        raise ValueError("Could not find video link parts in Streamtape page")

    except Exception as err:
        raise ValueError(f"Failed to extract Streamtape link: {err}")
