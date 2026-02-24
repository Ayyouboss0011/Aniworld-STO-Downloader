import sys
import os
import requests
from bs4 import BeautifulSoup

# Add src to path
sys.path.append(os.path.abspath("src"))

def debug_live_url(url):
    print(f"Fetching {url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html_content = response.text
        
        soup = BeautifulSoup(html_content, "html.parser")
        
        print("\n--- Testing s.to v4 Link-box structure ---")
        provider_buttons = soup.find_all("button", class_="link-box")
        print(f"Found {len(provider_buttons)} buttons with class 'link-box'")
        for button in provider_buttons:
            p_name = button.get("data-provider-name")
            l_id = button.get("data-language-id")
            p_url = button.get("data-play-url")
            print(f"  Button: Prov={p_name}, Lang={l_id}, URL={p_url}")

        if len(provider_buttons) == 0:
            print("\nWARNING: No Link-box buttons found! Printing snippet of body...")
            # Check for redirect or interesting content
            print(f"Final URL: {response.url}")
            body = soup.find("body")
            if body:
                print(str(body)[:2000])

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_live_url("https://s.to/serie/stream/a-knight-of-the-seven-kingdoms/staffel-1/episode-6")
