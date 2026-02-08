#!/usr/bin/env python3
"""
Interaktives Terminal-Skript zum Abrufen von Stream-Links von movie4k.sx
Gibt eine movie4k.sx URL ein und erhält eine Liste der verfügbaren Streams.
"""

import re
import sys
import json
import os
import requests
from urllib.parse import urlparse, unquote

# Add project root to sys.path to allow importing aniworld modules
# Assuming this script is located at src/aniworld/movie4k/movie4k_stream_finder.py
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from src.aniworld.models import Anime, Episode
    from src.aniworld.action.download import download
    from src.aniworld.config import SUPPORTED_PROVIDERS
except ImportError:
    # Fallback for when running from project root directly
    try:
        from aniworld.models import Anime, Episode
        from aniworld.action.download import download
        from aniworld.config import SUPPORTED_PROVIDERS
    except ImportError:
        print("Fehler: Konnte 'aniworld' Module nicht importieren.")
        print("Bitte führen Sie das Skript aus dem Projekt-Root aus oder stellen Sie sicher, dass PYTHONPATH gesetzt ist.")
        sys.exit(1)

# Konstanten
MOVIE4K_BASE_URL = "https://movie4k.sx"
LANG_LIST_URL = f"{MOVIE4K_BASE_URL}/data/langList/"
DATA_WATCH_URL = f"{MOVIE4K_BASE_URL}/data/watch/"
WATCH_URL_TEMPLATE = f"{MOVIE4K_BASE_URL}/watch/"

# Standard-Header für API-Anfragen
HEADERS = {
    "accept": "*/*",
    "accept-language": "de-DE,de;q=0.9,en-DE;q=0.8,en;q=0.7",
    "priority": "u=1, i",
    "referer": MOVIE4K_BASE_URL,
    "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "macOS",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
}

def extrahiere_movie_id(url):
    """
    Extrahiere die Movie-ID aus einer movie4k.sx URL.

    Args:
        url: Die movie4k.sx URL (z.B. https://movie4k.sx/movie/deadpool-2-2018)

    Returns:
        Tuple von (movie_id, slug) oder (None, None) bei Fehler
    """
    try:
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split('/') if p]

        # Überprüfe verschiedene URL-Formate
        if len(path_parts) >= 2 and path_parts[0] == 'movie':
            # Format: /movie/deadpool-2-2018
            slug = path_parts[1]
            # Die ID muss aus dem Titel extrahiert werden oder ist in der URL enthalten
            # Wir verwenden die letzte Komponente nach dem letzten Schrägstrich
            return None, slug
        elif len(path_parts) >= 3 and path_parts[0] == 'watch':
            # Format: /watch/deadpool-2/6195193258607cdfb9fac92a
            slug = path_parts[1]
            movie_id = path_parts[2]
            return movie_id, slug
        else:
            print(f"Warnung: Unbekanntes URL-Format: {url}")
            print("Versuche, die ID aus dem Titel zu extrahieren...")
            # Versuche, die ID aus dem Titel zu extrahieren
            # Manchmal ist die ID in der URL enthalten
            match = re.search(r'/([a-f0-9]{24})', url)
            if match:
                movie_id = match.group(1)
                # Extrahiere den Slug aus dem Pfad
                slug_match = re.search(r'/watch/([^/]+)', url)
                if slug_match:
                    slug = slug_match.group(1)
                    return movie_id, slug
            return None, None
    except Exception as e:
        print(f"Fehler beim Extrahieren der Movie-ID: {e}")
        return None, None

def hole_sprachliste(movie_id, url=None, slug=None):
    """
    Rufe die Liste der verfügbaren Sprachen für einen Film ab.
    Versucht zuerst, die Seite zu parsen, und fällt dann auf die API zurück.

    Args:
        movie_id: Die Movie-ID
        url: Optionale URL zum Scrapen (z.B. Watch-URL)
        slug: Optionaler Slug (für URL-Konstruktion)

    Returns:
        Liste von Sprachen oder None bei Fehler
    """
    if not movie_id:
        return None

    # 1. Versuche HTML-Parsing, da die API oft keine Sprach-Details liefert
    scrape_url = url
    if not scrape_url and slug:
        scrape_url = f"{WATCH_URL_TEMPLATE}{slug}/{movie_id}"
    
    if scrape_url:
        try:
            print(f"Versuche Sprachen aus HTML zu laden: {scrape_url}")
            response = requests.get(scrape_url, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                html = response.text
                
                # Flexiblere Suche nach dem langList Container
                # <div id="langList" class="dropdown-content" ...>...</div>
                # Verwende [^>]* für Attribute vor und nach id
                lang_list_match = re.search(r'<div[^>]*\bid=["\']langList["\'][^>]*>(.*?)</div>', html, re.DOTALL)
                
                if lang_list_match:
                    content = lang_list_match.group(1)
                    found_languages = []
                    
                    # Iteriere über alle Links im Container
                    # <a class="" href="/watch/the-equalizer-2/6195193358607cdfb9fad559" ...><i class="fa fa-volume-up"></i> English...</a>
                    for link_match in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', content, re.DOTALL) :
                        href = link_match.group(1)
                        inner_html = link_match.group(2)
                        
                        # Extrahiere ID aus href
                        id_match = re.search(r'/([a-f0-9]{24})', href)
                        lang_id = id_match.group(1) if id_match else None
                        
                        if lang_id:
                            # Extrahiere Sprache aus Text (entferne Tags)
                            # i tag und canvas tag entfernen
                            lang_text = re.sub(r'<[^>]+>', '', inner_html).strip()
                            
                            # Sprache mappen
                            lang_code = "?"
                            if "deutsch" in lang_text.lower() or "german" in lang_text.lower():
                                lang_code = "de"
                            elif "english" in lang_text.lower() or "englisch" in lang_text.lower():
                                lang_code = "en"
                            
                            found_languages.append({
                                "_id": lang_id,
                                "title": lang_text,
                                "lang": lang_code
                            })
                    
                    # Wenn Sprachen gefunden wurden, füge auch die aktuell ausgewählte hinzu
                    # (Diese ist oft nicht im Dropdown, oder anders markiert)
                    # Im Snippet ist "Deutsch" auch im Dropdown, aber vielleicht nicht immer?
                    # Snippet zeigt: <a class="selected" ...>Deutsch</a>. Also ist es drin.
                    
                    if found_languages:
                        print(f"Erfolg: {len(found_languages)} Sprachen aus HTML extrahiert.")
                        return found_languages
                    else:
                        print("Warnung: Keine Sprachen im langList Container gefunden.")
                else:
                    print("Warnung: 'langList' Container nicht im HTML gefunden. Möglicherweise hat sich die Struktur geändert oder Bot-Schutz aktiv.")
                    # Debug: Zeige die ersten 500 Zeichen des HTML
                    # print(f"HTML Preview: {html[:500]}")
            else:
                print(f"Warnung: Abruf der Seite fehlgeschlagen. Status Code: {response.status_code}")
                        
        except Exception as e:
            print(f"Warnung: HTML-Parsing fehlgeschlagen: {e}")
            # Fallback zur API

    # 2. Fallback: API-Abruf
    url = f"{LANG_LIST_URL}?_id={movie_id}"

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()

        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Fehler beim Abrufen der Sprachliste: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Fehler beim Parsen der Antwort: {e}")
        return None

def hole_stream_daten(movie_id):
    """
    Rufe die Stream-Daten für einen Film ab.

    Args:
        movie_id: Die Movie-ID

    Returns:
        Dictionary mit Stream-Daten oder None bei Fehler
    """
    if not movie_id:
        return None

    url = f"{DATA_WATCH_URL}?_id={movie_id}"

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()

        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Fehler beim Abrufen der Stream-Daten: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Fehler beim Parsen der Antwort: {e}")
        return None

def zeige_sprachen(sprachen):
    """
    Zeige die verfügbaren Sprachen an und lasse den Benutzer eine auswählen.

    Args:
        sprachen: Liste von Sprachen

    Returns:
        Ausgewählte Sprache oder None bei Abbruch
    """
    if not sprachen:
        print("Keine Sprachen verfügbar.")
        return None

    print("\nVerfügbare Sprachen:")
    for idx, lang in enumerate(sprachen, start=1):
        title = lang.get('title', 'Unbekannter Titel').strip()
        lang_code = lang.get('lang', '?')
        print(f"{idx}. {title} (lang: {lang_code})")

    while True:
        try:
            choice = input("\nWählen Sie eine Sprache (1-{}): ".format(len(sprachen)))
            if choice.lower() in ['q', 'quit', 'exit']:
                print("Abbruch durch Benutzer.")
                sys.exit(0)

            choice_idx = int(choice) - 1
            if 0 <= choice_idx < len(sprachen):
                return sprachen[choice_idx]
            else:
                print(f"Ungültige Auswahl. Bitte wählen Sie eine Zahl zwischen 1 und {len(sprachen)}.")
        except ValueError:
            print("Ungültige Eingabe. Bitte geben Sie eine Zahl ein oder 'q' zum Beenden.")
        except KeyboardInterrupt:
            print("\nAbbruch durch Benutzer.")
            sys.exit(0)

def detect_provider(url, resolved=False):
    """
    Versucht, den Provider anhand der URL zu erkennen.
    Gibt (provider_name, url) zurück.
    """
    url_lower = url.lower()
    
    # Mapping von URL-Teilen zu Provider-Namen (wie in SUPPORTED_PROVIDERS erwartet)
    provider_map = {
        "voe.sx": "VOE",
        "voe.": "VOE", # catch variations
        "dood": "Doodstream",
        "streamtape": "Streamtape",
        "vidoza": "Vidoza",
        "vidmoly": "Vidmoly",
        "filemoon": "Filemoon",
        "luluvdo": "Luluvdo",
        "speedfiles": "SpeedFiles",
        "loadx": "LoadX",
        "vidking": "VidKing",
        "hdfilme": "HDFilme",
        "strmup": "Strmup",
        "goodstream": "Doodstream", # Alias for Goodstream
        "m1xdrop": "Streamtape",     # Alias for M1xdrop
        "mixdrop": "Streamtape",     # Common alias
        "upstream": "Streamtape"     # Common alias
    }

    for key, name in provider_map.items():
        if key in url_lower:
            return name, url
            
    # Fallback: Versuche generischen Namen aus Domain zu raten
    try:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        name = domain.split('.')[0].capitalize()
        
        # Wenn der Provider unterstützt wird, gib ihn zurück
        if name in SUPPORTED_PROVIDERS:
            return name, url
            
        # Wenn nicht unterstützt und noch nicht aufgelöst, versuche URL aufzulösen (Redirects folgen)
        if not resolved:
            try:
                # Use stream=True to avoid downloading body
                resp = requests.get(url, headers=HEADERS, stream=True, timeout=10)
                if resp.url != url:
                    return detect_provider(resp.url, resolved=True)
            except Exception:
                pass
        
        return name, url
    except:
        return "Unknown", url

def create_anime_object(stream_url, title, lang_code, provider_name):
    """
    Erstellt ein Anime-Objekt für den Download.
    """
    # Mapping für Sprache
    lang_map = {
        "de": "German Dub",
        "en": "English Dub", 
    }
    language = lang_map.get(lang_code, f"Lang-{lang_code}")
    
    # Slug bereinigen
    slug = re.sub(r'[^a-zA-Z0-9-]', '', title.replace(' ', '-').lower())
    
    episode = Episode(
        anime_title=title,
        season=0, # 0 = Movie
        episode=1,
        slug=slug,
        link=None,
        embeded_link=stream_url,
        _selected_provider=provider_name,
        _selected_language=language
    )
    
    # Fake provider data
    episode.provider = {provider_name: {1: stream_url}}
    episode.direct_link = None

    anime = Anime(
        title=title,
        slug=slug,
        episode_list=[episode],
        action="Download",
        provider=provider_name,
        language=language,
        output_directory="downloads"
    )
    
    return anime

def download_stream(stream_url, title, lang_code, provider_name=None):
    """
    Startet den Download für einen ausgewählten Stream.
    """
    print(f"\nBereite Download vor: {title} ({lang_code})")
    
    if not provider_name:
        provider_name, stream_url = detect_provider(stream_url)
    
    print(f"Erkannter Provider: {provider_name}")
    print(f"URL: {stream_url}")

    try:
        anime = create_anime_object(stream_url, title, lang_code, provider_name)

        print("-" * 60)
        print("Starte Download-Prozess (AniWorld-Engine)...")
        download(anime)
        print("-" * 60)

    except Exception as e:
        print(f"\nFehler beim Starten des Downloads: {e}")
        import traceback
        traceback.print_exc()

def auto_download_best_stream(stream_liste, title, lang_code):
    """
    Sucht automatisch nach dem neuesten funktionierenden Stream (höchste ID zuerst).
    """
    print(f"\nStarte automatische Suche nach funktionierendem Stream für \"{title}\"...")
    print("Prüfe Streams von Neu nach Alt...")

    # Rückwärts iterieren (höchste Index zuerst)
    for i in range(len(stream_liste) - 1, -1, -1):
        stream = stream_liste[i]
        if not stream:
            continue
            
        idx = stream['index']
        url = stream['url']
        
        print(f"\nPrüfe Stream {idx}/{len(stream_liste)}: {url}")
        
        # Provider erkennen
        provider_name, url = detect_provider(url)
        print(f"  Provider: {provider_name}")
        
        try:
            # Anime Objekt erstellen
            anime = create_anime_object(url, title, lang_code, provider_name)
            episode = anime.episode_list[0]
            
            # Prüfen ob Direct Link erstellt werden kann
            # Dies führt die Extraktion (und ggf. Fallback) aus
            print("  Teste Link-Extraktion...")
            direct_link = episode.get_direct_link()
            
            if direct_link:
                print(f"  [ERFOLG] Funktionierender Stream gefunden!")
                print("-" * 60)
                print(f"Starte Download von Stream {idx}...")
                download(anime)
                print("-" * 60)
                return True
            else:
                print("  [FEHLER] Kein Direct Link konnte extrahiert werden.")
                
        except Exception as e:
            print(f"  [FEHLER] Beim Testen des Streams: {e}")
            
    print("\nKein funktionierender Stream gefunden.")
    return False

def zeige_streams(stream_daten):
    """
    Zeige die verfügbaren Streams an und gib die Liste zurück.

    Args:
        stream_daten: Dictionary mit Stream-Daten
    
    Returns:
        Liste der (bereinigten) Stream-URLs oder None
    """
    if not stream_daten:
        print("Keine Stream-Daten verfügbar.")
        return None

    title = stream_daten.get('title', 'Unbekannter Film')
    lang = stream_daten.get('lang', '?')
    streams = stream_daten.get('streams', [])

    print(f"\nStreams für \"{title}\" (Sprache: {lang}):")
    print("=" * 60)

    if not streams:
        print("Keine Streams verfügbar.")
        return None

    valid_streams = []

    for idx, stream in enumerate(streams, start=1):
        stream_url = stream.get('stream', '')
        release = stream.get('release', '')
        source = stream.get('source', '')

        if stream_url:
            # Entschlüssele den Stream-Link
            if stream_url.startswith('//'):
                stream_url = 'https:' + stream_url
            elif not stream_url.startswith('http'):
                stream_url = 'https://' + stream_url
            
            valid_streams.append({
                'index': idx,
                'url': stream_url,
                'release': release,
                'source': source
            })

            print(f"{idx}. [{release}] {stream_url}")
        else:
            # Platzhalter, damit Index konsistent bleibt
            valid_streams.append(None)
            print(f"{idx}. [Unbekannte Quelle] {source}")

    print("=" * 60)
    return valid_streams

def main():
    """
    Hauptfunktion des Skripts.
    """
    print("=" * 60)
    print("Movie4k.sx Stream-Finder")
    print("=" * 60)

    while True:
        try:
            url = input("\nGeben Sie die movie4k.sx URL ein (z.B. https://movie4k.sx/movie/deadpool-2-2018): ").strip()

            if not url:
                print("URL darf nicht leer sein.")
                continue

            if url.lower() in ['q', 'quit', 'exit']:
                print("Beende das Programm.")
                break

            # Extrahiere Movie-ID und Slug aus der URL
            movie_id, slug = extrahiere_movie_id(url)

            if not movie_id:
                print("Hinweis: Movie-ID nicht in der URL gefunden.")
                print("Versuche, die ID aus dem Titel zu extrahieren...")
                # Versuche, die ID aus einer Suchanfrage zu erhalten
                # Dies ist ein Workaround, falls die ID nicht direkt in der URL steht
                print("\nBitte geben Sie die Movie-ID ein (24-stelliger Hex-Code):")
                movie_id = input("Movie-ID: ").strip()
                if not movie_id or len(movie_id) != 24:
                    print("Ungültige Movie-ID. Bitte geben Sie eine gültige 24-stellige Hex-ID ein.")
                    continue

            # Hole die Sprachliste
            print(f"\nLade Sprachliste für Movie-ID: {movie_id}...")
            sprachen = hole_sprachliste(movie_id, url=url, slug=slug)

            if sprachen:
                # Zeige Sprachen und lasse den Benutzer auswählen
                ausgewählte_sprache = zeige_sprachen(sprachen)
                if not ausgewählte_sprache:
                    continue

                # Bilden der Watch-URL (nur für Ausgabe)
                watch_url = f"{WATCH_URL_TEMPLATE}{slug}/{ausgewählte_sprache['_id']}"
                print(f"\nLade Stream-Daten von: {watch_url}...")

                # Hole die Stream-Daten
                stream_daten = hole_stream_daten(ausgewählte_sprache['_id'])

                if not stream_daten:
                    print("Keine Stream-Daten erhalten.")
                    continue

                # Zeige die Streams an und lass den Benutzer wählen
                stream_liste = zeige_streams(stream_daten)
                
                if stream_liste:
                    while True:
                        dl_choice = input(f"\nWählen Sie einen Stream (1-{len(stream_liste)}), 'a' für Auto-Suche (neu -> alt), oder 'n' für neue Suche: ").strip()
                        if dl_choice.lower() in ['n', 'nein', 'no']:
                            break
                        if dl_choice.lower() in ['q', 'quit', 'exit']:
                            sys.exit(0)
                        
                        if dl_choice.lower() in ['a', 'auto']:
                            if auto_download_best_stream(stream_liste, stream_daten.get('title', 'Movie'), stream_daten.get('lang', 'de')):
                                break
                            else:
                                continue # Zurück zur Auswahl wenn fehlgeschlagen

                        try:
                            idx = int(dl_choice) - 1
                            if 0 <= idx < len(stream_liste) and stream_liste[idx]:
                                selected = stream_liste[idx]
                                # Download starten
                                download_stream(
                                    selected['url'], 
                                    stream_daten.get('title', 'Movie'), 
                                    stream_daten.get('lang', 'de')
                                )
                                break # Nach Download zurück zur Suche (oder loop entfernen wenn man mehrere laden will)
                            else:
                                print("Ungültige Auswahl.")
                        except ValueError:
                            print("Bitte eine Zahl eingeben.")

            else:
                # Wenn keine Sprachen gefunden wurden, versuche direkt die Watch-URL mit der Movie-ID
                print("Keine Sprachen gefunden. Versuche, Streams direkt abzurufen...")
                watch_url = f"{WATCH_URL_TEMPLATE}{slug}/{movie_id}"
                print(f"\nLade Stream-Daten von: {watch_url}...")

                # Hole die Stream-Daten
                stream_daten = hole_stream_daten(movie_id)

                if not stream_daten:
                    print("Keine Stream-Daten erhalten.")
                    continue

                # Zeige die Streams an
                stream_liste = zeige_streams(stream_daten)
                
                if stream_liste:
                    while True:
                        dl_choice = input(f"\nWählen Sie einen Stream (1-{len(stream_liste)}), 'a' für Auto-Suche (neu -> alt), oder 'n' für neue Suche: ").strip()
                        if dl_choice.lower() in ['n', 'nein', 'no']:
                            break
                        if dl_choice.lower() in ['q', 'quit', 'exit']:
                            sys.exit(0)

                        if dl_choice.lower() in ['a', 'auto']:
                            if auto_download_best_stream(stream_liste, stream_daten.get('title', 'Movie'), stream_daten.get('lang', 'de')):
                                break
                            else:
                                continue

                        try:
                            idx = int(dl_choice) - 1
                            if 0 <= idx < len(stream_liste) and stream_liste[idx]:
                                selected = stream_liste[idx]
                                # Download starten
                                download_stream(
                                    selected['url'], 
                                    stream_daten.get('title', 'Movie'), 
                                    stream_daten.get('lang', 'de')
                                )
                                break
                            else:
                                print("Ungültige Auswahl.")
                        except ValueError:
                            print("Bitte eine Zahl eingeben.")

        except KeyboardInterrupt:
            print("\n\nBeende das Programm.")
            break
        except Exception as e:
            print(f"Ein unerwarteter Fehler ist aufgetreten: {e}")
            print("Bitte versuchen Sie es erneut.")

if __name__ == "__main__":
    main()