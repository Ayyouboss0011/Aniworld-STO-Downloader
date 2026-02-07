#!/usr/bin/env python3
"""
Movie4k.sx API module for searching and retrieving movie information.
"""

import json
import logging
import re
from typing import Dict, List, Optional, TypedDict
import requests
from urllib.parse import quote

try:
    from ..config import DEFAULT_REQUEST_TIMEOUT, RANDOM_USER_AGENT
except ImportError:
    import sys
    import os
    # Allow running directly by adding src to sys.path
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
    from aniworld.config import DEFAULT_REQUEST_TIMEOUT, RANDOM_USER_AGENT

# Constants
MOVIE4K_BASE_URL = "https://movie4k.sx"
MOVIE4K_API_URL = f"{MOVIE4K_BASE_URL}/data/browse/"
MOVIE4K_WATCH_URL = f"{MOVIE4K_BASE_URL}/watch/"

# Default headers for movie4k.sx API requests
MOVIE4K_HEADERS = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1, i",
    "referer": f"{MOVIE4K_BASE_URL}/browse",
    "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "macOS",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": RANDOM_USER_AGENT,
}

class Movie(TypedDict):
    """Type definition for a movie result."""
    _id: str
    title: str
    year: Optional[int]
    backdrop_path: Optional[str]
    poster_path: Optional[str]
    poster_path_season: Optional[str]
    rating: Optional[str]
    genres: str
    last_updated_epi: Optional[int]
    last_streamtape_list_check: Optional[str]
    img: Optional[str]
    last_update_pending_streams: Optional[str]

class MoviePager(TypedDict):
    """Type definition for pagination information."""
    totalItems: int
    currentPage: int
    pageSize: int
    totalPages: int
    startPage: int
    endPage: int
    startIndex: int
    endIndex: int
    pages: List[int]

class MovieSearchResult(TypedDict):
    """Type definition for a complete search result."""
    pager: MoviePager
    movies: List[Movie]

class Movie4kAPI:
    """
    A class to interact with the movie4k.sx API.

    This class provides methods to search for movies and retrieve movie information
    from the movie4k.sx website.
    """

    def __init__(self, base_url: str = MOVIE4K_API_URL, headers: Optional[Dict] = None):
        """
        Initialize the Movie4kAPI client.

        Args:
            base_url: The base URL for the movie4k.sx API
            headers: Optional custom headers to use for requests
        """
        self.base_url = base_url
        self.headers = headers or MOVIE4K_HEADERS.copy()

    def search_movies(
        self,
        keyword: str,
        year: Optional[str] = None,
        networks: Optional[str] = None,
        rating: Optional[str] = None,
        votes: Optional[str] = None,
        genre: Optional[str] = None,
        country: Optional[str] = None,
        cast: Optional[str] = None,
        directors: Optional[str] = None,
        type: Optional[str] = None,
        order_by: str = "views",
        page: int = 1,
        limit: int = 20,
    ) -> MovieSearchResult:
        """
        Search for movies on movie4k.sx.

        Args:
            keyword: Search keyword
            year: Filter by year
            networks: Filter by network
            rating: Filter by rating
            votes: Filter by votes
            genre: Filter by genre
            country: Filter by country
            cast: Filter by cast
            directors: Filter by directors
            type: Filter by type
            order_by: Order results by (views, rating, date, title)
            page: Page number (1-based)
            limit: Number of results per page

        Returns:
            MovieSearchResult containing pagination info and movie list

        Raises:
            ValueError: If the search fails or returns invalid data
            requests.RequestException: If the HTTP request fails
        """
        if not keyword or not keyword.strip():
            raise ValueError("Search keyword cannot be empty")

        # Build query parameters
        params = {
            "lang": "2",  # Language code (2 = English)
            "keyword": keyword.strip(),
            "year": year or "",
            "networks": networks or "",
            "rating": rating or "",
            "votes": votes or "",
            "genre": genre or "",
            "country": country or "",
            "cast": cast or "",
            "directors": directors or "",
            "type": type or "",
            "order_by": order_by,
            "page": str(page),
            "limit": str(limit),
        }

        try:
            response = requests.get(
                self.base_url,
                params=params,
                headers=self.headers,
                timeout=DEFAULT_REQUEST_TIMEOUT,
            )
            response.raise_for_status()

            try:
                data = response.json()
                return data
            except json.JSONDecodeError as err:
                logging.error("Failed to parse JSON response from movie4k.sx: %s", err)
                raise ValueError("Invalid JSON response from movie4k.sx") from err

        except requests.RequestException as err:
            logging.error("Failed to search movies on movie4k.sx: %s", err)
            raise

    def search_movies_by_title(self, title: str, page: int = 1, limit: int = 20) -> MovieSearchResult:
        """
        Convenience method to search movies by title only.

        Args:
            title: Movie title to search for
            page: Page number
            limit: Results per page

        Returns:
            MovieSearchResult containing search results
        """
        return self.search_movies(
            keyword=title,
            order_by="views",
            page=page,
            limit=limit,
        )

    def get_movie_details(self, movie_id: str) -> Optional[Movie]:
        """
        Get details for a specific movie by ID.

        Args:
            movie_id: The movie ID

        Returns:
            Movie details or None if not found

        Note:
            This method searches for the movie by ID and returns the first match.
            The movie4k.sx API doesn't have a direct details endpoint, so we search
            with the ID as keyword.
        """
        try:
            results = self.search_movies(keyword=movie_id, limit=1)
            if results["movies"]:
                return results["movies"][0]
            return None
        except Exception as err:
            logging.error("Failed to get movie details for ID %s: %s", movie_id, err)
            return None

def display_movie_results(results: MovieSearchResult) -> None:
    """
    Display movie search results in a user-friendly format.

    Args:
        results: MovieSearchResult object containing search results
    """
    if not results["movies"]:
        print("No movies found.")
        return

    pager = results["pager"]
    print(f"\nFound {pager['totalItems']} movies (Page {pager['currentPage']} of {pager['totalPages']})\n")
    print("=" * 80)

    for idx, movie in enumerate(results["movies"], start=1):
        print(f"\n{idx}. {movie['title']}")
        if movie.get("_id"):
            print(f"   ID: {movie['_id']}")
            # Generate slug: lowercase, replace non-alphanumeric with hyphen
            slug = re.sub(r'[^a-z0-9]+', '-', movie['title'].lower()).strip('-')
            link = f"{MOVIE4K_WATCH_URL}{slug}/{movie['_id']}"
            print(f"   Link: {link}")
        if movie.get("year"):
            print(f"   Year: {movie['year']}")
        if movie.get("rating"):
            print(f"   Rating: {movie['rating']}/10")
        if movie.get("genres"):
            print(f"   Genres: {movie['genres']}")
        if movie.get("poster_path"):
            print(f"   Poster: {MOVIE4K_BASE_URL}{movie['poster_path']}")

    print("\n" + "=" * 80)

def search_movies_cli(keyword: Optional[str] = None) -> None:
    """
    Command-line interface for searching movies on movie4k.sx.

    Args:
        keyword: Optional search keyword. If None, prompts the user.
    """
    api = Movie4kAPI()

    if not keyword:
        keyword = input("Enter movie title to search: ").strip()
        if not keyword:
            print("Search keyword cannot be empty.")
            return

    try:
        print(f"\nSearching for '{keyword}' on movie4k.sx...")
        results = api.search_movies_by_title(keyword)
        display_movie_results(results)
    except ValueError as err:
        print(f"Error: {err}")
    except Exception as err:
        print(f"An unexpected error occurred: {err}")

if __name__ == "__main__":
    # Example usage when run directly
    search_movies_cli()