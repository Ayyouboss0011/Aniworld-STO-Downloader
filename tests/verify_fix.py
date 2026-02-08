
import logging
import sys
import os

# Add src to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from aniworld.models import Episode

def test_movie4k_parsing():
    print("Testing Movie4k link parsing...")
    link = "movie4k:6195193258607cdfb9fa3a32"
    
    try:
        ep = Episode(link=link)
        print(f"Slug: {ep.slug}")
        print(f"Season: {ep.season}")
        print(f"Episode: {ep.episode}")
        
        assert ep.slug == link
        assert ep.season == 0
        assert ep.episode == 1
        print("SUCCESS: Movie4k parsing works correctly!")
    except Exception as e:
        print(f"FAILED: Movie4k parsing failed with error: {e}")
        sys.exit(1)

def test_aniworld_parsing():
    print("\nTesting standard Aniworld link parsing...")
    link = "https://aniworld.to/anime/stream/one-piece/staffel-1/episode-1"
    
    try:
        ep = Episode(link=link)
        print(f"Slug: {ep.slug}")
        print(f"Season: {ep.season}")
        print(f"Episode: {ep.episode}")
        
        assert ep.slug == "one-piece"
        assert ep.season == 1
        assert ep.episode == 1
        print("SUCCESS: Standard Aniworld parsing remains unaffected!")
    except Exception as e:
        print(f"FAILED: Standard Aniworld parsing failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_movie4k_parsing()
    test_aniworld_parsing()
