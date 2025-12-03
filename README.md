<a id="readme-top"></a>
# AniWorld Downloader

AniWorld Downloader is a command-line tool for downloading and streaming content from aniworld.to and s.to. Currently available for Windows, macOS and Linux, it supports LoadX, VOE, Vidmoly, Filemoon, Luluvdo, Doodstream, Vidoza, SpeedFiles and Streamtape.

[![PyPI Downloads](https://static.pepy.tech/badge/aniworld)](https://pepy.tech/projects/aniworld)
![PyPI Downloads](https://img.shields.io/pypi/dm/aniworld?label=downloads&color=blue)
![License](https://img.shields.io/pypi/l/aniworld?label=License&color=blue)

![AniWorld Downloader - Demo](https://github.com/phoenixthrush/AniWorld-Downloader/blob/next/.github/assets/demo.png?raw=true)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

- **Download Episodes or Seasons**: Effortlessly download individual episodes or entire seasons with a single command.
- **Stream Instantly**: Watch episodes directly using the integrated mpv player for a seamless experience.
- **Auto-Next Playback**: Enjoy uninterrupted viewing with automatic transitions to the next episode.
- **Multiple Providers**: Access a variety of streaming providers on aniworld.to for greater flexibility.
- **Language Preferences**: Easily switch between German Dub, English Sub, or German Sub to suit your needs.
- **Aniskip Support**: Automatically skip intros and outros for a smoother viewing experience.
- **Group Watching with Syncplay**: Host synchronized anime sessions with friends using Syncplay integration.
- **Web Interface**: Modern web UI for easy anime searching, downloading, and queue management.
- **Docker Support**: Containerized deployment with Docker and Docker Compose for easy setup.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## :construction: Documentation :construction:

I am currently working on a documentation for AniWorld Downloader, which you can access here:
[https://www.phoenixthrush.com/AniWorld-Downloader-Docs/](https://www.phoenixthrush.com/AniWorld-Downloader-Docs/)

The documentation is a work in progress, so feel free to check back from time to time for updates and new information.

Most information in this README is already available in more detail on the documentation website. In the future, this README will be simplified to only give a basic overview.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Supported Providers

To see the list of supported providers, check the [SUPPORTED_PROVIDERS](https://github.com/phoenixthrush/AniWorld-Downloader/blob/dfbe431cb9bfbb315e22185b5cb63e06e7cd6277/src/aniworld/config.py#L100C11-L102C) variable.
<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Installation

### Prerequisites

Ensure you have **[Python 3.9](https://www.python.org/downloads/)** or higher installed.<br>
Additionally, make sure **[Git](https://git-scm.com/downloads)** is installed if you plan to install the development version.

**Note**: If you are using an ARM-based system, you might face issues with the curses module. To resolve this, use the amd64 [Python version](https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe) instead of the ARM version. For more details, refer to [GitHub Issue #14](https://github.com/phoenixthrush/AniWorld-Downloader/issues/14).

<details>
  <summary>Python Installation Tutorial (Windows)</summary>
  <img src="https://github.com/phoenixthrush/AniWorld-Downloader/blob/next/.github/assets/Python_Add_to_Path_Tutorial.png?raw=true" alt="Python Installation Tutorial">

**Note:** If you've restarted the terminal and `aniworld` isn't being recognized, you have two options:
- Add `aniworld` to your PATH so it can be found globally.
- Run `python -m aniworld`, which should work without adding it to the PATH.
  
<p align="right">(<a href="#readme-top">back to top</a>)</p>
</details>

### Installation

#### Install Latest Stable Release (Recommended)

To install the latest stable version directly from GitHub, use the following command:

```shell
pip install --upgrade aniworld
```

#### Install Latest Development Version (Requires Git)

To install the latest development version directly from GitHub, use the following command:

```shell
pip install --upgrade git+https://github.com/phoenixthrush/AniWorld-Downloader.git@next#egg=aniworld
```

Re-run this command periodically to update to the latest development build. These builds are from the `next` branch and may include experimental or unstable changes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Local Installation (Requires Git)

For a local installation, follow these steps:

1. Clone the repository:

  ```shell
  git clone https://github.com/phoenixthrush/AniWorld-Downloader aniworld
  ```

2. Install the package in editable mode:

  ```shell
  pip install -U -e ./aniworld
  ```

3. To update your local version, run:

  ```shell
  git -C aniworld pull
  ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Executable Releases

You don't need Python installed to use the binary builds of AniWorld available on GitHub.

[Releases](https://github.com/phoenixthrush/AniWorld-Downloader/releases/latest)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Uninstallation

To uninstall AniWorld Downloader, run the following command:

```shell
pip --uninstall aniworld
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

AniWorld Downloader offers four versatile usage modes:

1. **Interactive Menu**: Launch the tool and navigate through an intuitive menu to select and manage downloads or streams.
2. **Web Interface**: Modern web UI for easy searching, downloading, and queue management with real-time progress tracking.
3. **Command-Line Arguments**: Execute specific tasks directly by providing arguments, such as downloading a particular episode or setting preferences.
4. **Python Library**: Integrate AniWorld Downloader into your Python projects to programmatically manage anime, series, or movie downloads.

Choose the method that best suits your workflow and enjoy a seamless experience!

### Menu Example

To start the interactive menu, simply run:

```shell
aniworld
```

### Web Interface

Launch the modern web interface for easy searching, downloading, and queue management:

```shell
aniworld --web-ui
```

The web interface provides:
- **Modern Search**: Search anime across aniworld.to and s.to with a sleek interface
- **Episode Selection**: Visual episode picker with season/episode organization
- **Download Queue**: Real-time download progress tracking
- **User Authentication**: Optional multi-user support with admin controls
- **Settings Management**: Configure providers, languages, and download preferences

#### Web Interface Options

```shell
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

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1
```

#### Example 2: Download Multiple Episodes

To download multiple episodes of "Demon Slayer":

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-2
```

#### Example 3: Watch Episodes with Aniskip

To watch an episode while skipping intros and outros:

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Watch --aniskip
```

#### Example 4: Syncplay with Friends

To syncplay a specific episode with friends:

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching
```

#### Language Options for Syncplay

You can select different languages for yourself and your friends:

- For German Dub:

  ```shell
  aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "German Dub" --aniskip
  ```

- For English Sub:

  ```shell
  aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "English Sub" --aniskip
  ```

**Note:** Syncplay automatically groups users watching the same anime (regardless of episode). To restrict access, set a password for the room:

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --action Syncplay --keep-watching --language "English Sub" --aniskip --syncplay-password beans
```

#### Example 5: Download with Specific Provider and Language

To download an episode using the VOE provider with English subtitles:

```shell
aniworld --episode https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-1/episode-1 --provider VOE --language "English Sub"
```

#### Example 6: Use an Episode File

You can download episodes listed in a text file. Below is an example of a text file (`test.txt`):

```
# The whole anime
https://aniworld.to/anime/stream/alya-sometimes-hides-her-feelings-in-russian

# The whole Season 2
https://aniworld.to/anime/stream/demon-slayer-kimetsu-no-yaiba/staffel-2

# Only Season 3 Episode 13
https://aniworld.to/anime/stream/kaguya-sama-love-is-war/staffel-3/episode-13
```

To download the episodes specified in the file, use:

```shell
aniworld --episode-file test.txt --language "German Dub"
```

This can also be combined with `Watch` and `Syncplay` actions, as well as other arguments, for a more customized experience.

#### Example 7: Use a custom provider URL

Download a provider link. It's important to note that you also need to specify the provider manually.

```shell
aniworld --provider-link https://voe.sx/e/ayginbzzb6bi --provider VOE
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Library Example

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

## Anime4K Setup

Enhance your anime viewing experience with Anime4K. Follow the instructions below to configure Anime4K for use with the mpv player, even outside of AniWorld Downloader.

### For High-Performance GPUs
*(Examples: GTX 1080, RTX 2070, RTX 3060, RX 590, Vega 56, 5700XT, 6600XT, M1 Pro/Max/Ultra, M2 Pro/Max)*

Run the following command to optimize Anime4K for high-end GPUs:

```shell
aniworld --anime4k High
```

### For Low-Performance GPUs
*(Examples: GTX 980, GTX 1060, RX 570, M1, M2, Intel integrated GPUs)*

Run the following command to configure Anime4K for low-end GPUs:

```shell
aniworld --anime4k Low
```

### Uninstall Anime4K
To remove Anime4K from your setup, use this command:

```shell
aniworld --anime4k Remove
```

### Additional Information

All files for Anime4K are saved in the **mpv** directory during installation. 

- **Windows**: `C:\Users\<YourUsername>\AppData\Roaming\mpv`
- **macOS**: `/Users/<YourUsername>/.config/mpv`
- **Linux**: `/home/<YourUsername>/.config/mpv`

You can switch between `High` and `Low` modes at any time to match your GPU's performance. To cleanly uninstall Anime4K, use the `Remove` option.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Dependencies

AniWorld Downloader depends on the following Python packages:

- **`requests`**: For handling HTTP requests.
- **`beautifulsoup4`**: For parsing and scraping HTML content.
- **`yt-dlp`**: For downloading videos from supported providers.
- **`npyscreen`**: For creating interactive terminal-based user interfaces.
- **`tqdm`**: For providing progress bars during downloads.
- **`fake_useragent`**: For generating random user-agent strings.
- **`packaging`**: For parsing version numbers and handling package versions.
- **`jsbeautifier`**: Used for the Filemoon extractor.
- **`py-cpuinfo`**: Only required on Windows for gathering CPU information (AVX2 support for MPV).
- **`windows-curses`**: Required on Windows systems to enable terminal-based UI functionality.

These dependencies are automatically installed when you set up AniWorld Downloader using `pip`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Docker Deployment

AniWorld Downloader can be easily deployed using Docker for containerized environments.

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```shell
   git clone https://github.com/phoenixthrush/AniWorld-Downloader.git
   cd AniWorld-Downloader
   ```

2. Build and start the container:
   ```shell
   docker-compose up -d 
   ```

### Using Docker Directly

```shell
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

## Credits

- **[mpv](https://github.com/mpv-player/mpv.git)**: A versatile media player used for seamless streaming.
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp.git)**: A powerful tool for downloading videos from various providers.
- **[Syncplay](https://github.com/Syncplay/syncplay.git)**: Enables synchronized playback sessions with friends.
- **[Anime4K](https://github.com/bloc97/Anime4K)**: A cutting-edge real-time upscaler for enhancing anime video quality.
- **[Aniskip](https://api.aniskip.com/api-docs)**: Provides the opening and ending skip times for the Aniskip extension.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions to AniWorld Downloader are highly appreciated! You can help enhance the project by:

- **Reporting Bugs**: Identify and report issues to improve functionality.
- **Suggesting Features**: Share ideas to expand the tool's capabilities.
- **Submitting Pull Requests**: Contribute code to fix bugs or add new features.

### Contributors

<a href="https://github.com/phoenixthrush/Aniworld-Downloader/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=phoenixthrush/Aniworld-Downloader" alt="Contributors" />
</a>

- **Lulu** (since Sep 14, 2024)  
  ![Wakatime Badge](https://wakatime.com/badge/user/ebc8f6ad-7a1c-4f3a-ad43-cc402feab5fc/project/408bbea7-23d0-4d6c-846d-79628e6b136c.svg)

- **Tmaster055** (since Oct 21, 2024)  
  ![Wakatime Badge](https://wakatime.com/badge/user/79a1926c-65a1-4f1c-baf3-368712ebbf97/project/5f191c34-1ee2-4850-95c3-8d85d516c449.svg)

  Special thanks to [Tmaster055](https://github.com/Tmaster055) for resolving the Aniskip issue by correctly fetching the MAL ID!  
  Additional thanks to [fundyjo](https://github.com/fundyjo) for contributing the Doodstream extractor!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Support

If you need help with AniWorld Downloader, you can:

- **Submit an issue** on the [GitHub Issues](https://github.com/phoenixthrush/AniWorld-Downloader/issues) page.
- **Reach out directly** via email at [contact@phoenixthrush.com](mailto:contact@phoenixthrush.com) or on Discord at `phoenixthrush` or `tmaster067`.

While email support is available, opening a GitHub issue is preferred, even for installation-related questions, as it helps others benefit from shared solutions. However, feel free to email if that’s your preference.

If you find AniWorld Downloader useful, consider starring the repository on GitHub. Your support is greatly appreciated and inspires continued development.

Thank you for using AniWorld Downloader!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Legal Disclaimer

AniWorld Downloader is made for accessing content that’s already publicly available online. It doesn’t support or promote piracy or copyright violations. The developer isn’t responsible for how the tool is used or for any content found through external links.

All content accessed with AniWorld Downloader is available on the internet, and the tool itself doesn’t host or share copyrighted files. It also has no control over the accuracy, legality, or availability of the websites it links to.

If you have concerns about any content accessed through this tool, please reach out directly to the website’s owner, admin, or hosting provider. Thanks for your understanding.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=phoenixthrush/Aniworld-Downloader&type=Date)](https://star-history.com/#phoenixthrush/Aniworld-Downloader&Date)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

This project is licensed under the **[MIT License](LICENSE)**.  
For more details, see the LICENSE file.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
