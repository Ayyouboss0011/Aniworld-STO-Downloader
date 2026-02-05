<a id="readme-top"></a>

# lankabeltv

lankabeltv ist ein leistungsstarkes All-in-One-Tool zum Herunterladen und Streamen von Anime von **aniworld.to** sowie Filmen und Serien von **s.to**. Es bietet ein **modernes Web-Interface** für eine mühelose Verwaltung, ein robustes CLI für Power-User und ein automatisiertes Tracking-System, um deine Bibliothek aktuell zu halten.

[![License](https://img.shields.io/pypi/l/aniworld?label=License&color=blue)](LICENSE)

![lankabeltv - Demo](readme_thumbnail.png)

## 🚀 Schnellstart

**Mit Docker (Empfohlen):**

```bash
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
docker-compose up -d --build
```
Öffne anschließend [http://localhost:3005](http://localhost:3005)

**Mit Python (Direkt):**

```bash
pip install --upgrade git+https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git@next#egg=aniworld
aniworld --web-ui
```

---

## ✨ Features

- **🌐 Modernes Web-Interface**: Suchen, entdecken und Downloads über ein schickes Dashboard verwalten.
- **🤖 Automatisiertes Tracking**: "Tracke" deine Lieblingsserien; das System prüft stündlich auf neue Episoden und lädt diese automatisch herunter.
- **🎬 Sofort-Streaming**: Schau Inhalte direkt im integrierten **mpv**-Player mit hochwertigen Shadern.
- **📦 Massive Provider-Unterstützung**: Funktioniert mit VOE, Vidmoly, Filemoon, Vidoza, Streamtape und vielen mehr.
- **📺 S.to & AniWorld Integration**: Gleichzeitige Suche auf beiden Plattformen.
- **⏭️ Aniskip Integration**: Automatisches Überspringen von Intros und Outros für ein besseres Erlebnis.
- **👥 Syncplay Support**: Gemeinsam mit Freunden in perfekter Synchronisation schauen.
- **🐳 Docker Ready**: Einfach bereitstellbar mit Docker und Docker Compose.
- **🛠️ Flexibles CLI**: Volle Kontrolle über die Kommandozeile für Automatisierung und Skripte.

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## 🖥️ Web-Interface

Das Web-UI ist das Herzstück von lankabeltv und bietet eine benutzerfreundliche Möglichkeit, mit deinen Medien zu interagieren.

- **Entdecken**: Sieh dir beliebte und neu hinzugefügte Animes direkt auf dem Startbildschirm an.
- **Einheitliche Suche**: Suche gleichzeitig nach Titeln auf AniWorld und S.to.
- **Visuelle Auswahl**: Wähle Staffeln und Episoden einfach über eine intuitive Baumansicht aus.
- **Download-Manager**: Echtzeit-Fortschrittsanzeige und Warteschlangenverwaltung.
- **Tracker-Dashboard**: Verwalte deine getrackten Serien und sieh, wann der nächste Check erfolgt.
- **Multi-User & Auth**: Optionale Authentifizierung für sicheren Fernzugriff.

### Starten des Web-UI

```bash
# Basis-Start
aniworld --web-ui

# Erweiterte Optionen
aniworld --web-ui --web-port 3005 --web-expose --enable-web-auth
```

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## 📡 Automatisiertes Tracking

Verpasse nie wieder eine Episode. Mit dem **Tracking-System** kannst du jede Serie markieren, um sie zu überwachen.

1.  **Tracker hinzufügen**: Finde eine Serie im Web-UI und aktiviere "Track for new episodes" beim Starten eines Downloads.
2.  **Automatische Prüfungen**: Das System scannt jede Stunde nach neuen Episoden.
3.  **Auto-Download**: Sobald eine neue Episode auf einem Provider erscheint, wird sie zur Warteschlange hinzugefügt und automatisch heruntergeladen.
4.  **Verwalten**: Du kannst manuelle Scans im Tab "Downloads" unter "Aktive Tracker" verwalten und auslösen.

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## 🛠️ Installation & Deployment

### Docker (Empfohlen)

Docker stellt sicher, dass alle Abhängigkeiten (wie `mpv`, `yt-dlp`) korrekt konfiguriert sind.

```yaml
services:
  aniworld:
    container_name: aniworld-downloader
    build: .
    ports:
      - "3005:3005"
    volumes:
      - ./downloads:/app/downloads  # Wo deine Medien gespeichert werden
      - ./data:/app/data            # Datenbank und Konfiguration
    environment:
      - PUID=1000
      - PGID=1000
    command: ["aniworld", "--web-ui", "--web-port", "3005", "--no-browser", "--web-expose", "--output-dir", "/app/downloads"]
    restart: unless-stopped
```

### Manuelle Installation

Erfordert **Python 3.9+** und **Git**.

```bash
pip install --upgrade git+https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git@next#egg=aniworld
```

*Hinweis: Für Streaming-Funktionen stelle sicher, dass `mpv` auf deinem System installiert ist.*

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## ⌨️ Power der Kommandozeile

lankabeltv bleibt ein mächtiges CLI-Tool für die Automatisierung.

| Feature | Befehlsbeispiel |
| :--- | :--- |
| **Interaktives Menü** | `aniworld` |
| **Episode herunterladen** | `aniworld --episode [URL] --output-dir ./my-anime` |
| **Sofort anschauen** | `aniworld --episode [URL] --action Watch --aniskip` |
| **Syncplay** | `aniworld --episode [URL] --action Syncplay --syncplay-password secret` |
| **Anime4K (Upscaling)**| `aniworld --anime4k High` |

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## 📚 Nutzung als Library (Python API)

Integriere lankabeltv in deine eigenen Skripte:

```python
from aniworld.models import Anime, Episode

# Eine Episode definieren
ep = Episode(slug="demon-slayer", season=1, episode=1)

# Direkte Streaming-Links abrufen
link = ep.get_direct_link(provider="VOE", language="German Sub")
print(f"Hier anschauen: {link}")
```

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## 🤝 Support & Entwicklung

Dieses Projekt basiert auf der großartigen Arbeit des ursprünglichen [AniWorld-Downloader](https://github.com/phoenixthrush/AniWorld-Downloader) von **phoenixthrush** und **tmaster067**.

Seit der Abspaltung wurden alle neuen Features (wie das moderne Web-Interface, das automatisierte Tracking und die S.to-Integration) komplett von mir ([Ayyouboss0011](https://github.com/Ayyouboss0011/Aniworld-STO-Downloader)) entwickelt.

- **Discord**: Tritt uns auf Discord bei (`phoenixthrush` oder `tmaster067`)
- **Probleme**: [Fehler melden](https://github.com/Ayyouboss0011/Aniworld-STO-Downloader/issues)
- **Docs**: [Vollständige Dokumentation](https://www.phoenixthrush.com/lankabeltv-Docs/)

### Mitwirken

```bash
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
pip install -e .
pytest tests/
```

<p align="right">(<a href="#readme-top">nach oben</a>)</p>

---

## ⚖️ Rechtliches & Lizenz

**Haftungsausschluss**: lankabeltv ist ein Scraper, der den Zugriff auf öffentlich verfügbare Inhalte erleichtert. Es hostet selbst keine Dateien. Die Nutzer sind für die Einhaltung der lokalen Urheberrechtsgesetze selbst verantwortlich.

Lizenziert unter der **MIT-Lizenz**.

<p align="right">(<a href="#readme-top">nach oben</a>)</p>
