"""
Download Queue Manager for Aniworld-STO-Downloader
Handles global download queue processing and status tracking
"""

import threading
import time
import logging
from typing import Optional
from datetime import datetime
from .database import UserDatabase


class DownloadQueueManager:
    """Manages the global download queue processing with in-memory storage"""

    def __init__(self, database: Optional[UserDatabase] = None):
        self.db = database  # Only used for user auth, not download storage
        self.is_processing = False
        self.current_download_id = None
        self.worker_thread = None
        self._stop_event = threading.Event()
        self._cancelled_jobs = set()

        # In-memory download queue storage
        self._next_id = 1
        self._queue_lock = threading.Lock()
        self._active_downloads = {}  # id -> download_job dict
        self._completed_downloads = []  # list of completed download jobs (keep last N)
        self._max_completed_history = 10

    def start_queue_processor(self):
        """Start the background queue processor"""
        if not self.is_processing:
            self.is_processing = True
            self._stop_event.clear()
            self.worker_thread = threading.Thread(
                target=self._process_queue, daemon=True
            )
            self.worker_thread.start()
            logging.info("Download queue processor started")

    def stop_queue_processor(self):
        """Stop the background queue processor"""
        if self.is_processing:
            self.is_processing = False
            self._stop_event.set()
            if self.worker_thread:
                self.worker_thread.join(timeout=5)
            logging.info("Download queue processor stopped")

    def start_tracker_processor(self):
        """Start the background tracker processor"""
        if not hasattr(self, "tracker_thread") or self.tracker_thread is None:
            self.tracker_thread = threading.Thread(
                target=self._process_trackers, daemon=True
            )
            self.tracker_thread.start()
            logging.info("Tracker processor started")

    def trigger_tracker_scan(self):
        """Manually trigger a tracker scan immediately"""
        logging.info("Manual tracker scan triggered")
        threading.Thread(target=self._run_single_scan, daemon=True).start()
        return True

    def _run_single_scan(self):
        """Run a single pass of checking all trackers"""
        try:
            if self.db:
                trackers = self.db.get_trackers()
                logging.info(f"Starting manual scan of {len(trackers)} trackers")
                for tracker in trackers:
                    self._check_single_tracker(tracker)
                    time.sleep(1) # Faster scan for manual trigger
                logging.info("Manual tracker scan completed")
        except Exception as e:
            logging.error(f"Error in manual tracker scan: {e}")

    def _process_trackers(self):
        """Background worker that checks trackers for new episodes"""
        while True:
            try:
                if self.db:
                    trackers = self.db.get_trackers()
                    for tracker in trackers:
                        self._check_single_tracker(tracker)
                        time.sleep(5)  # Pause between trackers to be polite
            except Exception as e:
                logging.error(f"Error in tracker processor: {e}")

            # Wait for 1 hour before next check
            for _ in range(3600):
                if hasattr(self, "_stop_event") and self._stop_event.is_set():
                    return
                time.sleep(1)

    def _check_single_tracker(self, tracker):
        """Check a single tracker for new episodes"""
        try:
            from ..common import get_season_episode_count
            from ..entry import _detect_site_from_url
            from .. import config

            series_url = tracker["series_url"]
            last_season = tracker["last_season"]
            last_episode = tracker["last_episode"]

            # Extract slug and base_url
            if "/anime/stream/" in series_url:
                slug = series_url.split("/anime/stream/")[-1].rstrip("/")
                base_url = config.ANIWORLD_TO
                stream_path = "anime/stream"
            elif "/serie/stream/" in series_url:
                slug = series_url.split("/serie/stream/")[-1].rstrip("/")
                base_url = config.S_TO
                stream_path = "serie/stream"
            elif config.S_TO in series_url and "/serie/" in series_url:
                slug = series_url.split("/serie/")[-1].rstrip("/")
                base_url = config.S_TO
                stream_path = "serie"
            else:
                return

            # Get current season/episode counts
            season_counts = get_season_episode_count(slug, base_url)

            new_episodes = []
            max_s = last_season
            max_e = last_episode

            for s_num, e_count in season_counts.items():
                if s_num < last_season:
                    continue
                
                for e_num in range(1, e_count + 1):
                    if s_num == last_season and e_num <= last_episode:
                        continue
                    
                    # New episode found!
                    ep_url = f"{base_url}/{stream_path}/{slug}/staffel-{s_num}/episode-{e_num}"
                    new_episodes.append(ep_url)
                    
                    if s_num > max_s or (s_num == max_s and e_num > max_e):
                        max_s = s_num
                        max_e = e_num

            if new_episodes:
                logging.info(f"Tracker found {len(new_episodes)} new episodes for {tracker['anime_title']}")
                # Add to download queue
                self.add_download(
                    anime_title=tracker["anime_title"],
                    episode_urls=new_episodes,
                    language=tracker["language"],
                    provider=tracker["provider"],
                    total_episodes=len(new_episodes),
                    created_by=tracker["user_id"]
                )
                # Update tracker's last seen episode
                self.db.update_tracker_last_episode(tracker["id"], max_s, max_e)

        except Exception as e:
            logging.error(f"Error checking tracker {tracker['id']}: {e}")

    def cancel_download(self, queue_id: int) -> bool:
        """Mark a download job as cancelled"""
        with self._queue_lock:
            if queue_id in self._active_downloads:
                job = self._active_downloads[queue_id]
                if job["status"] in ["queued", "downloading"]:
                    self._cancelled_jobs.add(queue_id)
                    if job["status"] == "queued":
                        # If still queued, we can just mark it failed immediately
                        self._update_download_status(
                            queue_id, "failed", error_message="Download cancelled by user"
                        )
                    return True
            return False

    def delete_download(self, queue_id: int) -> bool:
        """Delete a download from the history"""
        with self._queue_lock:
            # Check completed downloads
            for i, download in enumerate(self._completed_downloads):
                if download["id"] == queue_id:
                    self._completed_downloads.pop(i)
                    return True
            
            # Check active downloads (if it's not currently processing)
            if queue_id in self._active_downloads:
                job = self._active_downloads[queue_id]
                if job["status"] not in ["downloading"]:
                    del self._active_downloads[queue_id]
                    return True
            
            return False

    def add_download(
        self,
        anime_title: str,
        episode_urls: list,
        language: str,
        provider: str,
        total_episodes: int,
        created_by: int = None,
        episodes_config: dict = None,
    ) -> int:
        """Add a download to the queue"""
        # Pre-process episodes to have detailed list
        episodes = []
        for url in episode_urls:
            # Try to extract season/episode from URL for better display
            ep_name = url.split("/")[-1]
            if "staffel-" in url and "episode-" in url:
                try:
                    parts = url.split("/")
                    s_num = next(p.split("-")[1] for p in parts if "staffel-" in p)
                    e_num = next(p.split("-")[1] for p in parts if "episode-" in p)
                    ep_name = f"S{s_num} E{e_num}"
                except:
                    pass
            
            episodes.append({
                "url": url,
                "name": ep_name,
                "status": "queued",
                "progress": 0.0,
                "speed": "",
                "eta": ""
            })

        with self._queue_lock:
            queue_id = self._next_id
            self._next_id += 1

            download_job = {
                "id": queue_id,
                "anime_title": anime_title,
                "episode_urls": episode_urls, # Keep for backward compatibility and internal processing
                "episodes": episodes,         # Detailed list for UI and reordering
                "language": language,
                "provider": provider,
                "episodes_config": episodes_config,
                "total_episodes": total_episodes,
                "completed_episodes": 0,
                "status": "queued",
                "current_episode": "",
                "progress_percentage": 0.0,
                "current_episode_progress": 0.0,  # Progress within current episode (0-100)
                "error_message": "",
                "created_by": created_by,
                "created_at": datetime.now(),
                "started_at": None,
                "completed_at": None,
            }

            self._active_downloads[queue_id] = download_job

        # Start processor if not running
        if not self.is_processing:
            self.start_queue_processor()

        return queue_id

    def get_queue_status(self):
        """Get current queue status"""
        with self._queue_lock:
            active_downloads = []
            for download in self._active_downloads.values():
                # Any job in active_downloads that isn't finished should be considered active
                if download["status"] in ["queued", "downloading"]:
                    # Format for API compatibility
                    active_downloads.append(
                        {
                            "id": download["id"],
                            "anime_title": download["anime_title"],
                            "total_episodes": download["total_episodes"],
                            "completed_episodes": download["completed_episodes"],
                            "status": download["status"],
                            "current_episode": download["current_episode"],
                            "progress_percentage": download["progress_percentage"],
                            "current_episode_progress": download[
                                "current_episode_progress"
                            ],
                            "error_message": download["error_message"],
                            "created_at": download["created_at"].isoformat()
                            if download["created_at"]
                            else None,
                        }
                    )

            completed_downloads = []
            # Sort completed downloads by completion time (newest first)
            sorted_completed = sorted(
                self._completed_downloads, 
                key=lambda x: x.get("completed_at", datetime.min), 
                reverse=True
            )
            
            for download in sorted_completed[:5]:  # Show last 5 completed
                completed_downloads.append(
                    {
                        "id": download["id"],
                        "anime_title": download["anime_title"],
                        "total_episodes": download["total_episodes"],
                        "completed_episodes": download["completed_episodes"],
                        "status": download["status"],
                        "current_episode": download["current_episode"],
                        "progress_percentage": download["progress_percentage"],
                        "current_episode_progress": download.get(
                            "current_episode_progress", 100.0
                        ),
                        "error_message": download["error_message"],
                        "completed_at": download["completed_at"].isoformat()
                        if download["completed_at"]
                        else None,
                    }
                )

            return {"active": active_downloads, "completed": completed_downloads}

    def _process_queue(self):
        """Background worker that processes the download queue"""
        while self.is_processing and not self._stop_event.is_set():
            try:
                # Get next job
                job = self._get_next_queued_download()

                if job:
                    self.current_download_id = job["id"]
                    try:
                        self._process_download_job(job)
                    except KeyboardInterrupt:
                        logging.info(f"Job {job['id']} was interrupted")
                        self._update_download_status(
                            job["id"], "failed", error_message="Download stopped by user"
                        )
                    self.current_download_id = None
                else:
                    # No jobs, wait a bit
                    time.sleep(2)

            except Exception as e:
                logging.error(f"Error in queue processor: {e}")
                time.sleep(5)

    def _process_download_job(self, job):
        """Process a single download job"""
        queue_id = job["id"]

        try:
            # Mark as downloading
            self._update_download_status(
                queue_id, "downloading", current_episode="Starting download..."
            )

            # Import necessary modules
            from ..entry import _group_episodes_by_series
            from ..models import Anime
            from pathlib import Path
            from ..action.common import sanitize_filename
            from .. import config
            import os

            # Process episodes
            anime_list = _group_episodes_by_series(job["episode_urls"])

            if not anime_list:
                self._update_download_status(
                    queue_id, "failed", error_message="Failed to process episode URLs"
                )
                return

            # Apply settings to anime objects
            episodes_config = job.get("episodes_config", {})
            
            for anime in anime_list:
                anime.language = job["language"]
                anime.provider = job["provider"]
                anime.action = "Download"
                for episode in anime.episode_list:
                    # Check for per-episode configuration
                    # We match by link (URL)
                    if episodes_config and episode.link in episodes_config:
                        config_val = episodes_config[episode.link]
                        episode._selected_language = config_val.get("language", job["language"])
                        episode._selected_provider = config_val.get("provider", job["provider"])
                    else:
                        episode._selected_language = job["language"]
                        episode._selected_provider = job["provider"]

            # Calculate actual total episodes after processing URLs
            actual_total_episodes = sum(len(anime.episode_list) for anime in anime_list)

            # Update total episodes count if different from original
            if actual_total_episodes != job["total_episodes"]:
                self._update_download_status(
                    queue_id,
                    "downloading",  # Keep as downloading since we're about to start
                    total_episodes=actual_total_episodes,
                    current_episode=f"Found {actual_total_episodes} valid episode(s) to download",
                )

            # Download logic
            successful_downloads = 0
            failed_downloads = 0
            current_episode_index = 0

            # Get download directory from arguments (which includes -o parameter)
            from ..parser import arguments

            download_dir = str(
                getattr(
                    config, "DEFAULT_DOWNLOAD_PATH", os.path.expanduser("~/Downloads")
                )
            )
            if hasattr(arguments, "output_dir") and arguments.output_dir is not None:
                download_dir = str(arguments.output_dir)

            # Check database settings for custom download path (overrides arguments)
            if self.db:
                custom_download_path = self.db.get_setting("download_path")
                if custom_download_path:
                    download_dir = custom_download_path

            for anime in anime_list:
                for episode in anime.episode_list:
                    if self._stop_event.is_set() or queue_id in self._cancelled_jobs:
                        break
                    
                    # Check if this specific episode was cancelled/removed
                    is_cancelled_flag = False
                    with self._queue_lock:
                        if queue_id in self._active_downloads:
                            for ep_item in self._active_downloads[queue_id]["episodes"]:
                                if ep_item["url"] == episode.link and ep_item["status"] == "cancelled":
                                    is_cancelled_flag = True
                                    break
                    if is_cancelled_flag:
                        continue

                    episode_info = f"{anime.title} - Episode {episode.episode} (Season {episode.season})"

                    # Update progress - reset episode progress to 0 when starting new episode
                    self._update_download_status(
                        queue_id,
                        "downloading",
                        completed_episodes=None,  # Don't update completed count when starting new episode
                        current_episode=f"Downloading {episode_info}",
                        current_episode_progress=0.0,
                    )

                    # Update episode status in detailed list
                    with self._queue_lock:
                        if queue_id in self._active_downloads:
                            for ep_item in self._active_downloads[queue_id]["episodes"]:
                                if ep_item["url"] == episode.link:
                                    ep_item["status"] = "downloading"

                    try:
                        # Create temp anime with single episode
                        temp_anime = Anime(
                            title=anime.title,
                            slug=anime.slug,
                            site=anime.site,
                            language=anime.language,
                            provider=anime.provider,
                            action=anime.action,
                            episode_list=[episode],
                        )

                        # Create web progress callback for this specific download
                        def web_progress_callback(progress_data):
                            """Handle progress updates from yt-dlp and update web interface"""
                            try:
                                # Check if we should stop during download
                                if self._stop_event.is_set() or queue_id in self._cancelled_jobs:
                                    # Signal yt-dlp to stop by raising an exception
                                    raise KeyboardInterrupt("Download stopped by user")

                                if progress_data["status"] == "downloading":
                                    # Try multiple methods to extract progress percentage
                                    percentage = 0.0

                                    # Method 1: _percent_str field
                                    percent_str = progress_data.get("_percent_str")
                                    if percent_str:
                                        try:
                                            percentage = float(
                                                percent_str.replace("%", "")
                                            )
                                        except (ValueError, TypeError):
                                            pass

                                    # Method 2: Calculate from downloaded/total bytes
                                    if percentage == 0.0:
                                        downloaded = progress_data.get(
                                            "downloaded_bytes", 0
                                        )
                                        total = progress_data.get("total_bytes", 0)
                                        if total and total > 0:
                                            percentage = (downloaded / total) * 100

                                    # Ensure percentage is valid
                                    percentage = min(100.0, max(0.0, percentage))

                                    # Create status message
                                    speed = progress_data.get("_speed_str", "N/A")
                                    eta = progress_data.get("_eta_str", "N/A")

                                    # Clean ANSI color codes
                                    import re
                                    if speed != "N/A":
                                        speed = re.sub(r"\x1b\[[0-9;]*m", "", str(speed)).strip()
                                    if eta != "N/A":
                                        eta = re.sub(r"\x1b\[[0-9;]*m", "", str(eta)).strip()

                                    status_msg = f"Downloading {episode_info} - {percentage:.1f}%"
                                    if speed != "N/A" and speed:
                                        status_msg += f" | Speed: {speed}"
                                    if eta != "N/A" and eta:
                                        status_msg += f" | ETA: {eta}"

                                    # Update overall progress
                                    self.update_episode_progress(
                                        queue_id, percentage, status_msg
                                    )
                                    
                                    # Update individual episode progress & stats
                                    with self._queue_lock:
                                        if queue_id in self._active_downloads:
                                            for ep_item in self._active_downloads[queue_id]["episodes"]:
                                                if ep_item["url"] == episode.link:
                                                    ep_item["progress"] = percentage
                                                    ep_item["speed"] = speed if speed != "N/A" else ""
                                                    ep_item["eta"] = eta if eta != "N/A" else ""

                            except Exception as e:
                                logging.warning(f"Web progress callback error: {e}")

                        # Execute download
                        try:
                            # Check files before download
                            anime_download_dir = Path(download_dir) / sanitize_filename(anime.title)
                            files_before = len(list(anime_download_dir.glob("*"))) if anime_download_dir.exists() else 0

                            from ..action.download import download
                            download(temp_anime, web_progress_callback)

                            files_after = len(list(anime_download_dir.glob("*"))) if anime_download_dir.exists() else 0

                            if files_after > files_before:
                                successful_downloads += 1
                                logging.info(f"Downloaded: {episode_info}")

                                with self._queue_lock:
                                    if queue_id in self._active_downloads:
                                        for ep_item in self._active_downloads[queue_id]["episodes"]:
                                            if ep_item["url"] == episode.link:
                                                ep_item["status"] = "completed"
                                                ep_item["progress"] = 100.0

                                self._update_download_status(
                                    queue_id,
                                    "downloading",
                                    completed_episodes=successful_downloads,
                                    current_episode=f"Completed {episode_info}",
                                    current_episode_progress=100.0,
                                )
                            else:
                                failed_downloads += 1
                                with self._queue_lock:
                                    if queue_id in self._active_downloads:
                                        for ep_item in self._active_downloads[queue_id]["episodes"]:
                                            if ep_item["url"] == episode.link:
                                                ep_item["status"] = "failed"

                        except Exception as download_error:
                            failed_downloads += 1
                            logging.warning(f"Failed to download: {episode_info} - Error: {download_error}")
                            with self._queue_lock:
                                if queue_id in self._active_downloads:
                                    for ep_item in self._active_downloads[queue_id]["episodes"]:
                                        if ep_item["url"] == episode.link:
                                            ep_item["status"] = "failed"

                    except Exception as e:
                        failed_downloads += 1
                        logging.error(f"Error downloading {episode_info}: {e}")

                    current_episode_index += 1

            # Check if cancelled
            if queue_id in self._cancelled_jobs:
                self._update_download_status(
                    queue_id, "failed", error_message="Download cancelled by user"
                )
                with self._queue_lock:
                    self._cancelled_jobs.discard(queue_id)
                return

            # Final status update
            total_attempted = successful_downloads + failed_downloads
            if successful_downloads == 0 and failed_downloads > 0:
                status = "failed"
                error_msg = f"Download failed: No episodes downloaded out of {failed_downloads} attempted."
            elif failed_downloads > 0:
                status = "completed"
                error_msg = f"Partially completed: {successful_downloads}/{total_attempted} episodes downloaded."
            else:
                status = "completed"
                error_msg = f"Successfully downloaded {successful_downloads} episode(s)."

            self._update_download_status(
                queue_id,
                status,
                completed_episodes=successful_downloads,
                current_episode=error_msg,
                error_message=error_msg if status == "failed" else None,
            )

        except Exception as e:
            logging.error(f"Download job {queue_id} failed: {e}")
            self._update_download_status(
                queue_id, "failed", error_message=f"Download failed: {str(e)}"
            )

    def _get_next_queued_download(self):
        """Get the next download job in the queue"""
        with self._queue_lock:
            for download in self._active_downloads.values():
                if download["status"] == "queued":
                    return download
            return None

    def update_episode_progress(
        self, queue_id: int, episode_progress: float, current_episode_desc: str = None
    ):
        """Update the progress within the current episode"""
        with self._queue_lock:
            if queue_id not in self._active_downloads:
                return False

            download = self._active_downloads[queue_id]
            download["current_episode_progress"] = min(
                100.0, max(0.0, episode_progress)
            )

            if current_episode_desc:
                download["current_episode"] = current_episode_desc

            # Calculate overall progress
            completed = download["completed_episodes"]
            total = download["total_episodes"]
            if total > 0:
                current_episode_contribution = (episode_progress / 100.0) if episode_progress >= 0 else 0
                new_progress = (completed + current_episode_contribution) / total * 100
                download["progress_percentage"] = new_progress

            return True

    def stop_episode(self, queue_id: int, ep_url: str) -> bool:
        """Remove a single episode from a download job"""
        with self._queue_lock:
            if queue_id not in self._active_downloads:
                return False

            job = self._active_downloads[queue_id]
            
            # Find the episode
            ep_to_remove = None
            for ep in job["episodes"]:
                if ep["url"] == ep_url:
                    ep_to_remove = ep
                    break
            
            if not ep_to_remove:
                return False
            
            if ep_to_remove["status"] == "downloading":
                ep_to_remove["status"] = "cancelled"
                return True
            
            if ep_url in job["episode_urls"]:
                job["episode_urls"].remove(ep_url)
            
            job["episodes"] = [ep for ep in job["episodes"] if ep["url"] != ep_url]
            job["total_episodes"] = len(job["episodes"])
            
            if not job["episodes"]:
                self.cancel_download(queue_id)
                
            return True

    def reorder_episodes(self, queue_id: int, new_order_urls: list) -> bool:
        """Change the order of episodes in a queued download"""
        with self._queue_lock:
            if queue_id not in self._active_downloads:
                return False

            job = self._active_downloads[queue_id]
            
            fixed_eps = [ep["url"] for ep in job["episodes"] if ep["status"] != "queued"]
            if new_order_urls[:len(fixed_eps)] != fixed_eps:
                return False

            if set(job["episode_urls"]) != set(new_order_urls):
                return False

            job["episode_urls"] = new_order_urls
            url_to_ep = {ep["url"]: ep for ep in job["episodes"]}
            job["episodes"] = [url_to_ep[url] for url in new_order_urls]
            
            return True

    def get_job_episodes(self, queue_id: int):
        """Get detailed episodes for a job"""
        with self._queue_lock:
            if queue_id in self._active_downloads:
                return self._active_downloads[queue_id].get("episodes", [])
            
            for job in self._completed_downloads:
                if job["id"] == queue_id:
                    return job.get("episodes", [])
            
            return None

    def _update_download_status(
        self,
        queue_id: int,
        status: str,
        completed_episodes: int = None,
        current_episode: str = None,
        error_message: str = None,
        total_episodes: int = None,
        current_episode_progress: float = None,
    ):
        """Update the status of a download job"""
        with self._queue_lock:
            if queue_id not in self._active_downloads:
                return False

            download = self._active_downloads[queue_id]
            download["status"] = status

            if completed_episodes is not None:
                download["completed_episodes"] = completed_episodes
                total = download["total_episodes"]
                current_ep_progress = download.get("current_episode_progress", 0.0)

                if total > 0:
                    if status == "downloading" and current_ep_progress < 100.0:
                        current_episode_contribution = (current_ep_progress / 100.0) if current_ep_progress >= 0 else 0
                        new_progress = (completed_episodes + current_episode_contribution) / total * 100
                    else:
                        new_progress = completed_episodes / total * 100
                    download["progress_percentage"] = new_progress

            if current_episode is not None:
                download["current_episode"] = current_episode

            if current_episode_progress is not None:
                download["current_episode_progress"] = min(100.0, max(0.0, current_episode_progress))
                if completed_episodes is None:
                    total = download["total_episodes"]
                    current_completed = download["completed_episodes"]
                    if total > 0:
                        if status == "downloading" and current_episode_progress < 100.0:
                            current_episode_contribution = (current_episode_progress / 100.0) if current_episode_progress >= 0 else 0
                            new_progress = (current_completed + current_episode_contribution) / total * 100
                        else:
                            new_progress = current_completed / total * 100
                        download["progress_percentage"] = new_progress

            if error_message is not None:
                download["error_message"] = error_message

            if total_episodes is not None:
                download["total_episodes"] = total_episodes

            # Update timestamps
            if status == "downloading" and download["started_at"] is None:
                download["started_at"] = datetime.now()
            elif status in ["completed", "failed"]:
                download["completed_at"] = datetime.now()
                if status == "completed":
                    download["current_episode_progress"] = 100.0
                    download["progress_percentage"] = 100.0

                self._completed_downloads.append(download.copy())
                if len(self._completed_downloads) > self._max_completed_history:
                    self._completed_downloads = self._completed_downloads[-self._max_completed_history:]
                del self._active_downloads[queue_id]

            return True


# Global instance
_download_manager = None


def get_download_manager(
    database: Optional[UserDatabase] = None,
) -> DownloadQueueManager:
    """Get or create the global download manager instance"""
    global _download_manager
    if _download_manager is None:
        _download_manager = DownloadQueueManager(database)
    return _download_manager
