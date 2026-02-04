<a id="readme-top"></a>

# lankabeltv

lankabeltv is a powerful tool for downloading and streaming anime movies and series from aniworld.to, as well as regular movies and TV shows from s.to. It features a **modern Web Interface** for easy management, while still offering a robust command-line interface for advanced users. Currently available for Windows, macOS and Linux, it supports LoadX, VOE, Vidmoly, Filemoon, Luluvdo, Doodstream, Vidoza, SpeedFiles and Streamtape.

[![License](https://img.shields.io/pypi/l/aniworld?label=License&color=blue)](LICENSE)

![lankabeltv - Demo](readme_thumbnail.png)

## TL;DR - Quick Start

**Using Docker (Recommended):**

```bash
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
docker-compose up -d --build
```

Then open http://localhost:3005

## Features

- **Modern Web Interface**: Easy anime searching, downloading, and queue management
- **Docker Support**: Simple deployment with Docker and Docker Compose
- **Download Episodes or Seasons**: Effortlessly download individual episodes or entire seasons
- **Stream Instantly**: Watch episodes directly using the integrated mpv player
- **Auto-Next Playback**: Enjoy uninterrupted viewing with automatic transitions
- **Multiple Providers**: Access a variety of streaming providers on aniworld.to and s.to
- **Language Preferences**: Switch between German Dub, English Sub, or German Sub
- **Aniskip Support**: Automatically skip intros and outros
- **Group Watching**: Synchronized sessions with Syncplay

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Supported Providers

lankabeltv supports the following providers:

- LoadX
- VOE
- Vidmoly
- Filemoon
- Luluvdo
- Doodstream
- Vidoza
- SpeedFiles
- Streamtape

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage Modes

lankabeltv offers versatile usage modes, prioritizing the Web Interface for the best experience:

1. **Web Interface**: Modern web UI for easy searching, downloading, and queue management
2. **Interactive Menu**: CLI menu to select and manage downloads
3. **Command-Line Arguments**: Direct execution for scripts and automation
4. **Python Library**: Integration into Python projects

### Web Interface

Launch the modern web interface for easy searching, downloading, and queue management.

If installed locally:
```bash
aniworld --web-ui
```

The web interface provides:

- Modern Search: Search anime across aniworld.to and s.to
- Episode Selection: Visual episode picker
- Download Queue: Real-time progress tracking
- User Authentication: Optional multi-user support
- Settings Management: Configure providers and languages

#### Web Interface Options

```bash
# Expose to network (accessible from other devices)
aniworld --web-ui --web-expose

# Enable authentication for multi-user support
aniworld --web-ui --enable-web-auth

# Custom port and disable browser auto-open
aniworld --web-ui --web-port 3005 --no-browser
```

### Menu Example

To start the interactive CLI menu:

```bash
aniworld
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Installation

### Prerequisites

- **Docker** (Recommended)
- OR **[Python 3.9+](https://www.python.org/downloads/)** and **[Git](https://git-scm.com/downloads)**

### Docker Deployment (Recommended)

lankabeltv is best deployed using Docker.

#### Using Docker Compose

1.  Create a `docker-compose.yml` (or use the one in the repository):

    ```yaml
    services:
      aniworld:
        container_name: aniworld-downloader
        build: .
        image: aniworld-new
        command: ["aniworld", "--web-ui", "--web-port", "3005", "--no-browser", "--web-expose", "--output-dir", "/app/downloads"]
        ports:
          - "3005:3005"
        volumes:
          - ./downloads:/app/downloads
          - ./data:/app/data
        restart: unless-stopped
    ```

2.  Build and run the container:
    ```bash
    docker-compose up -d --build
    ```

#### Using Docker Directly

First, build the image:
```bash
docker build -t aniworld-new .
```

Then run the container:
```bash
docker run -d \
  --name aniworld-downloader \
  -p 3005:3005 \
  -v $(pwd)/downloads:/app/downloads \
  -v $(pwd)/data:/app/data \
  aniworld-new \
  aniworld --web-ui --web-port 3005 --no-browser --web-expose --output-dir /app/downloads
```

### Installation from Source (Python)

If you prefer to run it without Docker, you can install the latest version directly from GitHub.

```bash
pip install --upgrade git+https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git@next#egg=aniworld
```

To update later, just run the command again.

#### Local Development Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader aniworld
    ```

2. Install in editable mode:
    ```bash
    pip install -U -e ./aniworld
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Command-Line Arguments

For advanced users, lankabeltv provides a variety of command-line options.

#### Example: Download a Single Episode

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1
```

#### Example: Watch with Aniskip

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Watch --aniskip
```

#### Example: Syncplay with Friends

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --syncplay-password beans
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Advanced Features

### Anime4K Setup

Enhance your anime viewing experience with Anime4K (CLI/MPV only).

- **High-Performance GPUs**: `aniworld --anime4k High`
- **Low-Performance GPUs**: `aniworld --anime4k Low`
- **Uninstall**: `aniworld --anime4k Remove`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Library Usage

You can use lankabeltv as a Python library:

```python
from aniworld.models import Anime, Episode

anime = Anime(
  episode_list=[
    Episode(
      slug="food-wars-shokugeki-no-sma",
      season=1,
      episode=5
    )
  ]
)

for episode in anime:
  print(f"Direct Link: {episode.get_direct_link('VOE', 'German Sub')}")
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Development

```bash
# Clone and install
git clone https://github.com/Ayyouboss0011/Aniworld-STO-Downloader.git
cd Aniworld-STO-Downloader
pip install -e .

# Install dev dependencies
pip install . ruff pylint pytest

# Run tests
pytest tests/
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Troubleshooting

### ARM-based Systems
Use the amd64 Python version if you encounter issues with the curses module on ARM systems.

### Provider Failures
If a provider fails, try a different one using `--provider` or report the issue on GitHub.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Documentation

Visit the official documentation: [lankabeltv-Docs](https://www.phoenixthrush.com/lankabeltv-Docs/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Credits

- **[mpv](https://github.com/mpv-player/mpv.git)**
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp.git)**
- **[Syncplay](https://github.com/Syncplay/syncplay.git)**
- **[Anime4K](https://github.com/bloc97/Anime4K)**
- **[Aniskip](https://api.aniskip.com/api-docs)**

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Support

- **GitHub Issues**: [Report bugs](https://github.com/Ayyouboss0011/Aniworld-STO-Downloader/issues)
- **Email**: contact@phoenixthrush.com
- **Discord**: `phoenixthrush` or `tmaster067`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Legal Disclaimer

lankabeltv is for accessing publicly available online content. It does not host any files. Please respect copyright laws in your jurisdiction.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

This project is licensed under the **[MIT License](LICENSE)**.
