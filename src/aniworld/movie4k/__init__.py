"""
Movie4k.sx API module for Aniworld-Downloader.
"""

from .movie4k import Movie4kAPI, search_movies_cli, display_movie_results

__all__ = ["Movie4kAPI", "search_movies_cli", "display_movie_results"]