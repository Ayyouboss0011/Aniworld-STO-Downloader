<a id="readme-top"></a>

# lankabeltv

lankabeltv is a powerful, all-in-one tool for downloading and streaming anime from **aniworld.to** and movies/TV shows from **s.to**. It features a **modern Web Interface** for effortless management, a robust CLI for power users, and an automated tracking system to keep your library up to date.

[![License](https://img.shields.io/pypi/l/aniworld?label=License&color=blue)](LICENSE)

![lankabeltv - Demo](readme_thumbnail.png)

## 🚀 Quick Start

**Using Docker (Recommended):**

```bash
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
docker-compose up -d --build
```
Then open [http://localhost:3005](http://localhost:3005)

**Using Python (Direct):**

```bash
pip install --upgrade git+https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git@next#egg=aniworld
aniworld --web-ui
```

---

## ✨ Features

- **🌐 Modern Web Interface**: Search, discover, and manage downloads via a sleek dashboard.
- **🤖 Automated Tracking**: "Track" your favorite series; the system checks for new episodes hourly and downloads them automatically.
- **🎬 Instant Streaming**: Watch content directly in the integrated **mpv** player with high-quality shaders.
- **📦 Massive Provider Support**: Works with VOE, Vidmoly, Filemoon, Vidoza, Streamtape, and many more.
- **📺 S.to & AniWorld Integration**: Seamlessly search across both platforms simultaneously.
- **⏭️ Aniskip Integration**: Automatically skip intros and outros for a better viewing experience.
- **👥 Syncplay Support**: Watch together with friends in perfect synchronization.
- **🐳 Docker Ready**: Easily deployable with Docker and Docker Compose.
- **🛠️ Flexible CLI**: Full control via command-line for automation and scripting.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🖥️ Web Interface

The Web UI is the heart of lankabeltv, providing a user-friendly way to interact with your media.

- **Discovery**: See popular and newly added anime right on the home screen.
- **Unified Search**: Search for titles across both AniWorld and S.to at the same time.
- **Visual Selector**: Easily pick seasons and episodes via an intuitive tree view.
- **Download Manager**: Real-time progress tracking and queue management.
- **Tracker Dashboard**: Manage your tracked series and see when the next check occurs.
- **Multi-User & Auth**: Optional authentication for secure remote access.

### Launching the Web UI

```bash
# Basic launch
aniworld --web-ui

# Advanced options
aniworld --web-ui --web-port 3005 --web-expose --enable-web-auth
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 📡 Automated Tracking

Never miss an episode again. With the **Tracking System**, you can mark any series to be monitored.

1.  **Add a Tracker**: Find a series in the Web UI and check "Track for new episodes" when starting a download.
2.  **Automatic Checks**: The system scans for new episodes every hour.
3.  **Auto-Download**: Once a new episode is released on the provider, it's added to your queue and downloaded automatically.
4.  **Manage**: View and trigger manual scans from the "Downloads" tab under "Active Trackers".

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🛠️ Installation & Deployment

### Docker (Recommended)

Docker ensures all dependencies (like `mpv`, `yt-dlp`) are correctly configured.

```yaml
services:
  aniworld:
    container_name: aniworld-downloader
    build: .
    ports:
      - "3005:3005"
    volumes:
      - ./downloads:/app/downloads  # Where your media goes
      - ./data:/app/data            # Database and config
    environment:
      - PUID=1000
      - PGID=1000
    command: ["aniworld", "--web-ui", "--web-port", "3005", "--no-browser", "--web-expose", "--output-dir", "/app/downloads"]
    restart: unless-stopped
```

### Manual Installation

Requires **Python 3.9+** and **Git**.

```bash
pip install --upgrade git+https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git@next#egg=aniworld
```

*Note: For streaming features, ensure `mpv` is installed on your system.*

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## ⌨️ Command-Line Power

lankabeltv remains a powerful CLI tool for automation.

| Feature | Command Example |
| :--- | :--- |
| **Interactive Menu** | `aniworld` |
| **Download Episode** | `aniworld --episode [URL] --output-dir ./my-anime` |
| **Watch Instantly** | `aniworld --episode [URL] --action Watch --aniskip` |
| **Syncplay** | `aniworld --episode [URL] --action Syncplay --syncplay-password secret` |
| **Anime4K (Upscaling)**| `aniworld --anime4k High` |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 📚 Library Usage (Python API)

Integrate lankabeltv into your own scripts:

```python
from aniworld.models import Anime, Episode

# Define an episode
ep = Episode(slug="demon-slayer", season=1, episode=1)

# Get direct streaming links
link = ep.get_direct_link(provider="VOE", language="German Sub")
print(f"Watch here: {link}")
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🤝 Support & Development

This project is based on the great work of the original [AniWorld-Downloader](https://github.com/phoenixthrush/AniWorld-Downloader) by **phoenixthrush** and **tmaster067**.

Since the fork, all new features (such as the modern Web Interface, automated tracking, and S.to integration) have been completely developed by me ([Ayyouboss0011](https://github.com/Ayyouboss0011/Aniworld-STO-Downloader)).

- **Discord**: Join us on Discord (`phoenixthrush` or `tmaster067`)
- **Issues**: [Report a bug](https://github.com/Ayyouboss0011/Aniworld-STO-Downloader/issues)
- **Docs**: [Full Documentation](https://www.phoenixthrush.com/lankabeltv-Docs/)

### Contribution

```bash
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
pip install -e .
pytest tests/
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## ⚖️ Legal & License

**Disclaimer**: lankabeltv is a scraper designed to facilitate access to publicly available content. It does not host any files. Users are responsible for complying with local copyright laws.

Licensed under the **MIT License**.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
