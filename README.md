<a id="readme-top"></a>

# AniWorld Downloader

AniWorld Downloader is a command-line tool for downloading and streaming anime movies and series from aniworld.to, as well as regular movies and TV shows from s.to. Currently available for Windows, macOS and Linux, it supports LoadX, VOE, Vidmoly, Filemoon, Luluvdo, Doodstream, Vidoza, SpeedFiles and Streamtape.

[![PyPI Downloads](https://static.pepy.tech/badge/aniworld)](https://pepy.tech/projects/aniworld)
![PyPI Downloads](https://img.shields.io/pypi/dm/aniworld?label=downloads&color=blue)
![License](https://img.shields.io/pypi/l/aniworld?label=License&color=blue)

![AniWorld Downloader - Demo](https://github.com/phoenixthrush/AniWorld-Downloader/blob/next/.github/assets/demo.png?raw=true)

## TL;DR - Quick Start

```text
pip install aniworld && aniworld
```

## Features

- Download Episodes or Seasons: Effortlessly download individual episodes or entire seasons with a single command
- Stream Instantly: Watch episodes directly using the integrated mpv player for a seamless experience
- Auto-Next Playback: Enjoy uninterrupted viewing with automatic transitions to the next episode
- Multiple Providers: Access a variety of streaming providers on aniworld.to and s.to for greater flexibility
- Language Preferences: Easily switch between German Dub, English Sub, or German Sub to suit your needs
- Aniskip Support: Automatically skip intros and outros for a smoother viewing experience
- Group Watching with Syncplay: Host synchronized anime sessions with friends using Syncplay integration
- Web Interface: Modern web UI for easy anime searching, downloading, and queue management
- Docker Support: Containerized deployment with Docker and Docker Compose for easy setup

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Supported Providers

AniWorld Downloader supports the following providers:

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

## Quick Start

AniWorld Downloader offers four versatile usage modes:

1. Interactive Menu: Launch the tool and navigate through an intuitive menu to select and manage downloads or streams
2. Web Interface: Modern web UI for easy searching, downloading, and queue management with real-time progress tracking
3. Command-Line Arguments: Execute specific tasks directly by providing arguments, such as downloading a particular episode or setting preferences
4. Python Library: Integrate AniWorld Downloader into your Python projects to programmatically manage anime, series, or movie downloads

Choose the method that best suits your workflow and enjoy a seamless experience!

### Menu Example

To start the interactive menu, simply run:

```bash
aniworld
```

### Web Interface

Launch the modern web interface for easy searching, downloading, and queue management:

```bash
aniworld --web-ui
```

The web interface provides:

- Modern Search: Search anime across aniworld.to and s.to with a sleek interface
- Episode Selection: Visual episode picker with season/episode organization
- Download Queue: Real-time download progress tracking
- User Authentication: Optional multi-user support with admin controls
- Settings Management: Configure providers, languages, and download preferences

#### Web Interface Options

```bash
# Basic web interface (localhost only)
aniworld --web-ui

# Expose to network (accessible from other devices)
aniworld --web-ui --web-expose

# Enable authentication for multi-user support
aniworld --web-ui --enable-web-auth

# Custom port and disable browser auto-open
aniworld --web-ui --web-port 3000 --no-browser

# Web interface with custom download directory
aniworld --web-ui --output-dir /path/to/downloads
```

### Command-Line Arguments Example

AniWorld Downloader provides a variety of command-line options for downloading and streaming anime without relying on the interactive menu. These options unlock advanced features such as `--aniskip`, `--keep-watching`, and `--syncplay-password`.

#### Example 1: Download a Single Episode

To download episode 1 of "Demon Slayer: Kimetsu no Yaiba":

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1
```

#### Example 2: Download Multiple Episodes

To download multiple episodes of "Demon Slayer":

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-2
```

#### Example 3: Watch Episodes with Aniskip

To watch an episode while skipping intros and outros:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Watch --aniskip
```

#### Example 4: Syncplay with Friends

To syncplay a specific episode with friends:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching
```

#### Language Options for Syncplay

You can select different languages for yourself and your friends:

- For German Dub:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "German Dub" --aniskip
```

- For English Sub:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "English Sub" --aniskip
```

Note: Syncplay automatically groups users watching the same anime (regardless of episode). To restrict access, set a password for the room:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "English Sub" --aniskip --syncplay-password beans
```

#### Example 5: Download with Specific Provider and Language

To download an episode using the VOE provider with English subtitles:

```bash
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --provider VOE --language "English Sub"
```

#### Example 6: Use an Episode File

You can download episodes listed in a text file. Below is an example of a text file (`test.txt`):

```text
# The whole anime
https://aniworld.to/anime/stream/alya-sometimes-hides-her-feelings-in-russian

# The whole Season 2
https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-2

# Only Season 3 Episode 13
https://aniworld.to/anime/stream/kaguya-sama-love-is-war/staffel-3/episode-13
```

To download the episodes specified in the file, use:

```bash
aniworld --episode-file test.txt --language "German Dub"
```

This can also be combined with `Watch` and `Syncplay` actions, as well as other arguments, for a more customized experience.

#### Example 7: Use a custom provider URL

Download a provider link. It's important to note that you also need to specify the provider manually.

```bash
aniworld --provider-link https://voe.sx/e/ayginbzzb6bi --provider VOE
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Installation

### Prerequisites

Ensure you have **[Python 3.9](https://www.python.org/downloads/)** or higher installed.
Additionally, make sure **[Git](https://git-scm.com/downloads)** is installed if you plan to install the development version.

**Note**: If you are using an ARM-based system, you might face issues with the curses module. Use the amd64 [Python version](https://www.python.org/downloads/) instead of the ARM version. For more details, refer to [GitHub Issue #14](https://github.com/phoenixthrush/AniWorld-Downloader/issues/14).

### Install Latest Stable Release (Recommended)

To install the latest stable version directly from PyPI, use the following command:

```bash
pip install --upgrade aniworld
```

### Install Latest Development Version (Requires Git)

To install the latest development version directly from GitHub, use the following command:

```bash
pip install --upgrade git+https://github.com/phoenixthrush/AniWorld-Downloader.git@next#egg=aniworld
```

Re-run this command periodically to update to the latest development build. These builds are from the `next` branch and may include experimental or unstable changes.

### Local Installation (Requires Git)

For a local installation, follow these steps:

1. Clone the repository:

    ```bash
    git clone https://github.com/phoenixthrush/AniWorld-Downloader aniworld
    ```

2. Install the package in editable mode:

    ```bash
    pip install -U -e ./aniworld
    ```

3. To update your local version, run:

    ```bash
    git -C aniworld pull
    ```

### Executable Releases

You don't need Python installed to use binary builds of AniWorld available on GitHub.

[Releases](https://github.com/phoenixthrush/AniWorld-Downloader/releases/latest)

### Uninstallation

To uninstall AniWorld Downloader, run the following command:

```bash
pip --uninstall aniworld
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Advanced Features

### Anime4K Setup

Enhance your anime viewing experience with Anime4K. Follow the instructions below to configure Anime4K for use with the mpv player, even outside of AniWorld Downloader.

#### For High-Performance GPUs

(Examples: GTX 1080, RTX 2070, RTX 3060, RX 590, Vega 56, 5700XT, 6600XT, M1 Pro/Max/Ultra, M2 Pro/Max)

Run the following command to optimize Anime4K for high-end GPUs:

```bash
aniworld --anime4k High
```

#### For Low-Performance GPUs

(Examples: GTX 980, GTX 1060, RX 570, M1, M2, Intel integrated GPUs)

Run the following command to configure Anime4K for low-end GPUs:

```bash
aniworld --anime4k Low
```

#### Uninstall Anime4K

To remove Anime4K from your setup, use this command:

```bash
aniworld --anime4k Remove
```

### Additional Information

All files for Anime4K are saved in the **mpv** directory during installation.

- **Windows**: `C:\Users\<YourUsername>\AppData\Roaming\mpv`
- **macOS**: `/Users/<YourUsername>/.config/mpv`
- **Linux**: `/home/<YourUsername>/.config/mpv`

You can switch between `High` and `Low` modes at any time to match your GPU's performance. To cleanly uninstall Anime4K, use the `Remove` option.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Docker Deployment

AniWorld Downloader can be easily deployed using Docker for containerized environments.

### Using Docker Compose (Recommended)
This option uses a minimal setup, only requiring the `compose.yml` file to run the pre-built image from the GitHub Container Registry.

1.  **Create a dedicated directory and navigate into it:**
    ```shell
    mkdir aniworld-downloader
    cd aniworld-downloader
    ```

2.  **Create required data and download directories:**
    * This step ensures that the host folders for data and downloads exist, which is a good practice for proper permission mapping and reliable container startup.

    These are the commands if you are following the example:
    ```shell
    mkdir downloads
    mkdir data
    ```

3.  **Create the `docker-compose.yml` file with the following content:**

    ```yaml
    services:
      aniworld:
        container_name: aniworld-downloader
        image: ghcr.io/phoenixthrush/aniworld-downloader
        ports:
          - "8080:8080"
        volumes:
          - ./downloads:/app/downloads
          - ./data:/app/data
        restart: unless-stopped
    ```
    > **Note:** You can **relocate** the `./downloads` path to any location on your host disk where you want the downloaded files to be saved. Keep in mind to create that folder!

4.  **Start the container in detached mode:**
    ```shell
    docker-compose up -d
    ```

    ```bash
    docker-compose up -d
    ```

#### Using Docker Directly

```bash
docker run -d \
  --name aniworld-downloader \
  -p 8080:8080 \
  -v $(pwd)/downloads:/app/downloads \
  -v $(pwd)/data:/app/data \
  ghcr.io/phoenixthrush/aniworld-downloader
```

### Docker Configuration

The Docker container runs with:

- **User Security**: Non-root user for enhanced security
- **System Dependencies**: Includes ffmpeg for video processing
- **Web Interface**: Enabled by default with authentication and network exposure
- **Download Directory**: `/app/downloads` (mapped to host via volume bind)
- **Port**: 8080 (configurable via docker port exposure)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Library Usage

You can also use AniWorld Downloader as a library in your Python scripts to programmatically manage anime downloads or streams. Here's an example:

```python
from aniworld.models import Anime, Episode

# Define an Anime object with a list of episodes
anime = Anime(
  episode_list=[
    Episode(
      slug="food-wars-shokugeki-no-sma",
      season=1,
      episode=5
    ),
    Episode(
      link="https://aniworld.to/anime/stream/food-wars-shokugeki-no-sma/staffel-1/episode-6"
    )
  ]
)

# Iterate through the episodes and retrieve direct links
for episode in anime:
  print(f"Episode: {episode}")
  print(f"Direct Link: {episode.get_direct_link('VOE', 'German Sub')}")
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Development

### Quick Setup

```bash
# Clone and install in development mode
git clone https://github.com/phoenixthrush/AniWorld-Downloader.git
cd AniWorld-Downloader
pip install -e .

# Install development dependencies
pip install . ruff pylint pytest
```

### Code Quality

```bash
# Run linting
ruff check src/aniworld
pylint src/aniworld --disable=broad-exception-caught,missing-module-docstring --allow-reexport-from-package=y

# Run tests
pytest tests/
```

### Contributing

Contributions to AniWorld Downloader are highly appreciated! You can help enhance the project by:

- **Reporting Bugs**: Identify and report issues to improve functionality
- **Suggesting Features**: Share ideas to expand the tool's capabilities
- **Submitting Pull Requests**: Contribute code to fix bugs or add new features
- **Improving Documentation**: Help enhance user guides and technical documentation

### Contributors

<a href="https://github.com/phoenixthrush/Aniworld-Downloader/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=phoenixthrush/Aniworld-Downloader" alt="Contributors" />
</a>

- **Lulu** (since Sep 14, 2024)  
  [![wakatime](https://wakatime.com/badge/user/ebc8f6ad-7a1c-4f3a-ad43-cc402feab5fc/project/f39b2952-8865-4176-8ccc-4716e73d0df3.svg)](https://wakatime.com/badge/user/ebc8f6ad-7a1c-4f3a-ad43-cc402feab5fc/project/f39b2952-8865-4176-8ccc-4716e73d0df3)

- **Tmaster055** (since Oct 21, 2024)  
  [![Wakatime Badge](https://wakatime.com/badge/user/79a1926c-65a1-4f1c-baf3-368712ebbf97/project/5f191c34-1ee2-4850-95c3-8d85d516c449.svg)](https://wakatime.com/badge/user/79a1926c-65a1-4f1c-baf3-368712ebbf97/project/5f191c34-1ee2-4850-95c3-8d85d516c449.svg)

  Special thanks to [Tmaster055](https://github.com/Tmaster055) for resolving the Aniskip issue by correctly fetching the MAL ID!  
  Additional thanks to [fundyjo](https://github.com/fundyjo) for contributing the Doodstream extractor!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Troubleshooting

### ARM-based Systems

If you're using an ARM-based system, you might face issues with the curses module. Use the amd64 Python version instead of the ARM version. For more details, refer to [GitHub Issue #14](https://github.com/phoenixthrush/AniWorld-Downloader/issues/14).

### Command Not Found

If you've restarted your terminal and `aniworld` isn't being recognized, you have two options:

- [Add `aniworld` to your PATH](https://www.phoenixthrush.com/AniWorld-Downloader-Docs/docs/Troubleshooting/Windows#command-not-found) so it can be found globally
- Run `python -m aniworld`, which should work without adding it to PATH

### Provider Failures

If a provider fails to extract links:

1. Try a different provider using the `--provider` argument
2. Check if the provider is working by testing with a different episode
3. Report the issue on GitHub with the specific provider and episode URL

### Installation Issues

For installation-related problems:

- Ensure you have Python 3.9 or higher installed
- Make sure pip is updated: `pip install --upgrade pip`
- On Windows, ensure you have proper permissions for installation

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Documentation

For comprehensive user guides, tutorials, and additional documentation, visit the official documentation website:
[AniWorld-Downloader-Docs](https://www.phoenixthrush.com/AniWorld-Downloader-Docs/)

The documentation is continuously updated with new features, detailed tutorials, and troubleshooting guides to help you get the most out of AniWorld Downloader.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Dependencies

AniWorld Downloader relies on several Python packages for networking, scraping, downloading, and its user interfaces:

### Core Dependencies

- **requests** – HTTP request handling
- **beautifulsoup4** – HTML parsing and scraping
- **yt-dlp** – Video downloading from supported providers
- **npyscreen** – Interactive terminal-based UI
- **tqdm** – Download progress bars
- **fake_useragent** – Random user-agent generation
- **packaging** – Version parsing and comparison
- **jsbeautifier** – Required for the Filemoon extractor
- **flask** – Web interface support

### Windows-only Dependencies

- **py-cpuinfo** – CPU feature detection (AVX2 support for MPV)
- **windows-curses** – Terminal UI support on Windows
- **winfcntl** – File locking support on Windows

All required dependencies are installed automatically when AniWorld Downloader is installed via `pip`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Credits

AniWorld Downloader is built upon the work of several amazing open-source projects:

- **[mpv](https://github.com/mpv-player/mpv.git)**: A versatile media player used for seamless streaming
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp.git)**: A powerful tool for downloading videos from various providers
- **[Syncplay](https://github.com/Syncplay/syncplay.git)**: Enables synchronized playback sessions with friends
- **[Anime4K](https://github.com/bloc97/Anime4K)**: A cutting-edge real-time upscaler for enhancing anime video quality
- **[Aniskip](https://api.aniskip.com/api-docs)**: Provides the opening and ending skip times for the Aniskip extension

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Support

If you need help with AniWorld Downloader, you can:

- **Submit an issue** on the [GitHub Issues](https://github.com/phoenixthrush/AniWorld-Downloader/issues) page
- **Reach out directly** via email at [contact@phoenixthrush.com](mailto:contact@phoenixthrush.com) or on Discord at `phoenixthrush` or `tmaster067`

While email support is available, opening a GitHub issue is preferred, even for installation-related questions, as it helps others benefit from shared solutions. However, feel free to email if that's your preference.

If you find AniWorld Downloader useful, consider starring the repository on GitHub. Your support is greatly appreciated and inspires continued development.

Thank you for using AniWorld Downloader!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Legal Disclaimer

AniWorld Downloader is made for accessing content that's already publicly available online. It doesn't support or promote piracy or copyright violations. The developer isn't responsible for how the tool is used or for any content found through external links.

All content accessed with AniWorld Downloader is available on the internet, and the tool itself doesn't host or share copyrighted files. It also has no control over the accuracy, legality, or availability of websites it links to.

If you have concerns about any content accessed through this tool, please reach out directly to the website's owner, admin, or hosting provider. Thanks for your understanding.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=phoenixthrush/Aniworld-Downloader&type=Date)](https://star-history.com/#phoenixthrush/Aniworld-Downloader&Date)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

This project is licensed under the **[MIT License](LICENSE)**.
For more details, see the LICENSE file.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
