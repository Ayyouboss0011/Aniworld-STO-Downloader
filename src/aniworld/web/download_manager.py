"""
Download Queue Manager for Aniworld-STO-Downloader
Handles global download queue processing and status tracking
"""

import threading
import time
import logging
import re
from typing import Optional
from datetime import datetime
from .database import UserDatabase
from ..movie4k.movie4k_stream_finder import detect_provider, hole_sprachliste, hole_stream_daten


class DownloadQueueManager:
    """Manages the global download queue processing with in-memory storage"""

    def __init__(self, database: Optional[UserDatabase] = None):
        self.db = database  # Only used for user auth, not download storage
        self.is_processing = False
        self.active_workers = {} # thread_id -> (job_id, ep_url)
        self.worker_threads = []
        self._stop_event = threading.Event()
        self._cancelled_jobs = set()

        # In-memory download queue storage
        self._next_id = 1
        self._queue_lock = threading.Lock()
        self._active_downloads = {}  # id -> download_job dict
        self._cancelled_episodes = set() # set of (queue_id, ep_url)
        self._completed_downloads = []  # list of completed download jobs (keep last N)
        self._max_completed_history = 10
        self._skip_flags = set()
        self._tracker_scan_status = {} # tracker_id -> bool (is_scanning)
        self._tracker_debug_messages = {} # tracker_id -> list of strings

    def start_queue_processor(self):
        """Start the background queue processor"""
        with self._queue_lock:
            if not self.is_processing:
                self.is_processing = True
                self._stop_event.clear()
                
                # Get max concurrent downloads from settings
                max_concurrent = 1
                if self.db:
                    try:
                        max_concurrent = int(self.db.get_setting("max_concurrent_downloads", "1"))
                    except:
                        max_concurrent = 1
                
                self.worker_threads = []
                for i in range(max_concurrent):
                    t = threading.Thread(
                        target=self._process_queue, 
                        name=f"DownloadWorker-{i+1}",
                        daemon=True
                    )
                    t.start()
                    self.worker_threads.append(t)
                
                logging.info(f"Download queue processor started with {max_concurrent} workers")

    def stop_queue_processor(self):
        """Stop the background queue processor"""
        with self._queue_lock:
            if self.is_processing:
                self.is_processing = False
                self._stop_event.set()
                threads_to_join = self.worker_threads
                self.worker_threads = []
        
        for t in threads_to_join:
            t.join(timeout=2)
        logging.info("Download queue processor stopped")

    def restart_queue_processor(self):
        """Restart the queue processor to apply new settings"""
        logging.info("Restarting download queue processor...")
        self.stop_queue_processor()
        self.start_queue_processor()

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
                    self._tracker_scan_status[tracker["id"]] = True
                    try:
                        self._check_single_tracker(tracker)
                    finally:
                        self._tracker_scan_status[tracker["id"]] = False
                    time.sleep(0.5) # Fast scan
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
        tracker_id = tracker["id"]
        self._tracker_debug_messages[tracker_id] = []
        
        def debug(msg, is_error=False):
            prefix = "ERROR: " if is_error else ""
            full_msg = f"[{tracker['anime_title']}] {prefix}{msg}"
            self._tracker_debug_messages[tracker_id].append(full_msg)
            if is_error: logging.error(full_msg)
            else: logging.info(full_msg)

        try:
            from ..common import get_season_episodes_details
            from ..entry import _detect_site_from_url
            from .. import config

            debug(f"Starting scan. Current Stand: S{tracker['last_season']} E{tracker['last_episode']}")
            
            series_url = tracker["series_url"]
            last_season = tracker["last_season"]
            last_episode = tracker["last_episode"]
            target_language = tracker["language"]

            lang_map = {
                "German Dub": 1, "German Sub": 3, "English Dub": 2, "English Sub": 2,
                "Language ID 1": 1, "Language ID 2": 2, "Language ID 3": 3,
            }
            target_lang_id = lang_map.get(target_language)

            if "/anime/stream/" in series_url:
                slug = series_url.split("/anime/stream/")[-1].rstrip("/")
                base_url = config.ANIWORLD_TO
                stream_path = "anime/stream"
            elif "/serie/stream/" in series_url:
                slug = series_url.split("/serie/stream/")[-1].rstrip("/")
                base_url = config.S_TO
                stream_path = "serie"
            elif config.S_TO in series_url and "/serie/" in series_url:
                slug = series_url.split("/serie/")[-1].rstrip("/")
                base_url = config.S_TO
                stream_path = "serie"
            else:
                return

            debug(f"Fetching series details for slug: {slug}")
            all_seasons_details = get_season_episodes_details(slug, base_url)
            if not all_seasons_details:
                debug("No seasons found or failed to fetch details", is_error=True)
                return

            debug(f"Found {len(all_seasons_details)} seasons")
            new_episodes = []
            updated_s, updated_e = tracker["last_season"], tracker["last_episode"]
            sorted_seasons = sorted(all_seasons_details.keys())

            for s_num in sorted_seasons:
                if s_num < tracker["last_season"]: continue
                episodes = all_seasons_details[s_num]
                debug(f"Checking Season {s_num} ({len(episodes)} episodes)")
                for ep_detail in episodes:
                    e_num = ep_detail["episode"]
                    if s_num == tracker["last_season"] and e_num <= tracker["last_episode"]: continue
                    available_langs = ep_detail.get("languages", [])
                    is_available = False
                    for l in available_langs:
                        if (isinstance(l, int) and l == target_lang_id) or \
                           (isinstance(l, str) and (l == target_language or "DE Dub" in l or "DE Sub" in l)):
                            is_available = True
                            break
                    if not is_available:
                        try:
                            from ..models import Episode
                            ep_url = f"{base_url}/serie/{slug}/staffel-{s_num}/episode-{e_num}" if base_url == config.S_TO else f"{base_url}/{stream_path}/{slug}/staffel-{s_num}/episode-{e_num}"
                            debug(f"Verifying S{s_num}E{e_num} via episode page...")
                            temp_ep = Episode(link=ep_url); temp_ep.auto_fill_details()
                            verified_langs = temp_ep.language_name
                            for l in verified_langs:
                                l_norm, t_norm = l.lower(), target_language.lower()
                                if l == target_language: is_available = True; break
                                if "german dub" in t_norm or "de dub" in t_norm:
                                    if "de dub" in l_norm or "german dub" in l_norm or "synchronisation" in l_norm: is_available = True; break
                                elif "german sub" in t_norm or "de sub" in t_norm:
                                    if "de sub" in l_norm or "german sub" in l_norm or "untertitel" in l_norm: is_available = True; break
                                elif "english sub" in t_norm or "en sub" in t_norm:
                                    if "en sub" in l_norm or "english sub" in l_norm: is_available = True; break
                                elif "english dub" in t_norm or "en dub" in t_norm:
                                    if "en dub" in l_norm or "english dub" in l_norm: is_available = True; break
                        except Exception as e:
                            debug(f"S{s_num}E{e_num}: Failed to verify: {e}", is_error=True)
                    if not is_available: continue
                    debug(f"FOUND NEW EPISODE: S{s_num} E{e_num}")
                    ep_url = f"{base_url}/serie/{slug}/staffel-{s_num}/episode-{e_num}" if base_url == config.S_TO else f"{base_url}/{stream_path}/{slug}/staffel-{s_num}/episode-{e_num}"
                    new_episodes.append(ep_url)
                    if s_num > updated_s or (s_num == updated_s and e_num > updated_e):
                        updated_s, updated_e = s_num, e_num
            if new_episodes:
                self.add_download(anime_title=tracker["anime_title"], episode_urls=new_episodes, language=tracker["language"], provider=tracker["provider"], total_episodes=len(new_episodes), created_by=tracker["user_id"])
                self.db.update_tracker_last_episode(tracker["id"], updated_s, updated_e)
        except Exception as e:
            debug(f"Fatal error during scan: {str(e)}", is_error=True)

    def cancel_download(self, queue_id: int) -> bool:
        with self._queue_lock:
            if queue_id in self._active_downloads:
                job = self._active_downloads[queue_id]
                self._cancelled_jobs.add(queue_id)
                for ep in job["episodes"]:
                    if ep["status"] in ["queued", "downloading"]:
                        ep["status"] = "cancelled"
                if job["status"] == "queued": 
                    self._update_download_status(queue_id, "failed", error_message="Cancelled by user")
                return True
            return False

    def skip_current_candidate(self, queue_id: int) -> bool:
        with self._queue_lock:
            if queue_id in self._active_downloads:
                self._skip_flags.add(queue_id); return True
            return False

    def delete_download(self, queue_id: int) -> bool:
        with self._queue_lock:
            for i, d in enumerate(self._completed_downloads):
                if d["id"] == queue_id: self._completed_downloads.pop(i); return True
            if queue_id in self._active_downloads and self._active_downloads[queue_id]["status"] != "downloading":
                del self._active_downloads[queue_id]; return True
            return False

    def add_download(self, anime_title: str, episode_urls: list, language: str, provider: str, total_episodes: int, created_by: int = None, episodes_config: dict = None) -> int:
        is_movie = any(url.startswith("movie4k:") or "/filme/" in url for url in episode_urls)
        episodes = []
        for url in episode_urls:
            ep_name = url.split("/")[-1]
            if "staffel-" in url and "episode-" in url:
                try:
                    parts = url.split("/")
                    s_num = next(p.split("-")[1] for p in parts if "staffel-" in p)
                    e_num = next(p.split("-")[1] for p in parts if "episode-" in p)
                    ep_name = f"S{s_num} E{e_num}"
                except: pass
            episodes.append({"url": url, "name": ep_name, "status": "queued", "progress": 0.0, "speed": "", "eta": ""})
        with self._queue_lock:
            queue_id = self._next_id; self._next_id += 1
            job = {"id": queue_id, "anime_title": anime_title, "episode_urls": episode_urls, "episodes": episodes, "language": language, "provider": provider, "is_movie": is_movie, "episodes_config": episodes_config, "total_episodes": total_episodes, "completed_episodes": 0, "status": "queued", "current_episode": "", "progress_percentage": 0.0, "current_episode_progress": 0.0, "error_message": "", "created_by": created_by, "created_at": datetime.now(), "started_at": None, "completed_at": None}
            self._active_downloads[queue_id] = job
        if not self.is_processing: self.start_queue_processor()
        return queue_id

    def get_queue_status(self):
        with self._queue_lock:
            active = []
            for d in self._active_downloads.values():
                if d["status"] in ["queued", "downloading"]:
                    active.append({"id": d["id"], "anime_title": d["anime_title"], "total_episodes": d["total_episodes"], "completed_episodes": d["completed_episodes"], "status": d["status"], "is_movie": d.get("is_movie", False), "current_episode": d["current_episode"], "progress_percentage": float(round(d["progress_percentage"], 2)), "current_episode_progress": float(round(d["current_episode_progress"], 2)), "error_message": d["error_message"], "created_at": d["created_at"].isoformat() if d["created_at"] else None})
            completed = []
            for d in sorted(self._completed_downloads, key=lambda x: x.get("completed_at", datetime.min), reverse=True)[:5]:
                completed.append({"id": d["id"], "anime_title": d["anime_title"], "total_episodes": d["total_episodes"], "completed_episodes": d["completed_episodes"], "status": d["status"], "is_movie": d.get("is_movie", False), "current_episode": d["current_episode"], "progress_percentage": d["progress_percentage"], "current_episode_progress": d.get("current_episode_progress", 100.0), "error_message": d["error_message"], "completed_at": d["completed_at"].isoformat() if d["completed_at"] else None})
            return {"active": active, "completed": completed}

    def _process_queue(self):
        thread_id = threading.current_thread().name
        while self.is_processing and not self._stop_event.is_set():
            try:
                task = self._get_next_queued_episode()
                if task:
                    job, episode_data = task
                    with self._queue_lock:
                        self.active_workers[thread_id] = (job["id"], episode_data["url"])
                    
                    try: 
                        self._process_episode(job, episode_data)
                    except KeyboardInterrupt: 
                        pass
                    except Exception as e:
                        logging.error(f"Worker {thread_id} error processing episode {episode_data['url']}: {e}")
                    
                    with self._queue_lock:
                        if thread_id in self.active_workers:
                            del self.active_workers[thread_id]
                        self._check_job_completion(job["id"])
                else: 
                    time.sleep(1)
            except Exception as e: 
                logging.error(f"Queue error in worker {thread_id}: {e}")
                time.sleep(2)

    def _get_next_queued_episode(self):
        """Find the next episode to download across all active jobs"""
        with self._queue_lock:
            busy_ep_urls = {(jid, url) for jid, url in self.active_workers.values()}
            
            for job in self._active_downloads.values():
                if job["id"] in self._cancelled_jobs:
                    continue
                
                for ep in job["episodes"]:
                    if ep["status"] == "queued" and (job["id"], ep["url"]) not in busy_ep_urls:
                        # Reserved by this worker
                        ep["status"] = "downloading"
                        job["status"] = "downloading"
                        if job["started_at"] is None:
                            job["started_at"] = datetime.now()
                        return job, ep
            return None

    def _process_episode(self, job, episode_data):
        queue_id = job["id"]
        ep_url = episode_data["url"]
        
        try:
            from ..entry import _detect_site_from_url
            from ..models import Anime, Episode
            from ..action.download import download
            
            download_dir = self._get_download_dir(job)
            
            if ep_url.startswith("movie4k:"):
                success = self._process_movie4k_download(queue_id, ep_url, job, download_dir)
                if not success:
                    with self._queue_lock:
                        episode_data["status"] = "failed"
                return

            site = _detect_site_from_url(ep_url)
            ep_obj = Episode(link=ep_url)
            
            # Use per-episode config if available, otherwise job-level defaults
            ep_config = (job.get("episodes_config") or {}).get(ep_url) or {}
            ep_obj._selected_language = ep_config.get("language") or job["language"]
            ep_obj._selected_provider = ep_config.get("provider") or job["provider"]
            
            mini_anime = Anime(
                title=job["anime_title"],
                site=site,
                language=ep_obj._selected_language,
                provider=ep_obj._selected_provider,
                action="Download",
                episode_list=[ep_obj]
            )

            def web_progress_callback(d):
                if self._stop_event.is_set() or queue_id in self._cancelled_jobs: 
                    raise KeyboardInterrupt("Stopped")
                
                with self._queue_lock:
                    if (queue_id, ep_url) in self._cancelled_episodes: 
                        self._cancelled_episodes.discard((queue_id, ep_url))
                        raise KeyboardInterrupt("EpCancelled")
                    if queue_id in self._skip_flags: 
                        self._skip_flags.discard(queue_id)
                        raise KeyboardInterrupt("Skip")

                if d["status"] == "downloading":
                    p = 0.0
                    if d.get("_percent_str"):
                        try: p = float(d["_percent_str"].replace("%", ""))
                        except: pass
                    if p == 0.0:
                        db, tb = d.get("downloaded_bytes", 0), d.get("total_bytes") or d.get("total_bytes_estimate")
                        if tb: p = (db / tb) * 100
                    p = min(100.0, max(0.0, p))
                    s, e = re.sub(r"\x1b\[[0-9;]*m", "", str(d.get("_speed_str", "N/A"))).strip(), re.sub(r"\x1b\[[0-9;]*m", "", str(d.get("_eta_str", "N/A"))).strip()
                    
                    with self._queue_lock:
                        episode_data["progress"] = p
                        episode_data["speed"] = s if s != "N/A" else ""
                        episode_data["eta"] = e if e != "N/A" else ""
                        self._update_job_global_progress(queue_id)

            success = download(mini_anime, web_progress_callback, output_dir=download_dir)

            with self._queue_lock:
                if success:
                    episode_data["status"] = "completed"
                    episode_data["progress"] = 100.0
                    job["completed_episodes"] += 1
                elif episode_data["status"] != "cancelled":
                    episode_data["status"] = "failed"
                self._update_job_global_progress(queue_id)

        except KeyboardInterrupt as ki:
            with self._queue_lock:
                if str(ki) == "EpCancelled" or queue_id in self._cancelled_jobs:
                    episode_data["status"] = "cancelled"
                else:
                    episode_data["status"] = "failed"
        except Exception as e:
            logging.error(f"Failed processing episode {ep_url}: {e}")
            with self._queue_lock:
                episode_data["status"] = "failed"

    def _get_download_dir(self, job):
        from .. import config
        import os
        sd, md = str(getattr(config, "DEFAULT_SERIES_PATH", os.path.expanduser("~/Downloads"))), str(getattr(config, "DEFAULT_MOVIE_PATH", os.path.expanduser("~/Downloads")))
        if self.db:
            cs, cm, cg = self.db.get_setting("series_download_path"), self.db.get_setting("movie_download_path"), self.db.get_setting("download_path")
            if cs: sd = cs
            elif cg: sd = cg
            if cm: md = cm
            elif cg: md = cg
        return md if job.get("is_movie", False) else sd

    def _update_job_global_progress(self, queue_id):
        if queue_id not in self._active_downloads: return
        job = self._active_downloads[queue_id]
        total_episodes = len(job["episodes"])
        if total_episodes == 0: return
        job["progress_percentage"] = sum(ep["progress"] for ep in job["episodes"]) / total_episodes
        active_eps = [ep for ep in job["episodes"] if ep["status"] == "downloading"]
        if active_eps:
            ep = active_eps[0]
            job["current_episode"] = f"Downloading {ep['name']} - {ep['progress']:.1f}%"
            job["current_episode_progress"] = ep["progress"]
        elif job["completed_episodes"] == total_episodes:
            job["current_episode"] = "Completed"
            job["current_episode_progress"] = 100.0
        else:
            job["current_episode"] = "Waiting..."
            job["current_episode_progress"] = 0.0

    def _check_job_completion(self, queue_id):
        with self._queue_lock:
            if queue_id not in self._active_downloads: return
            job = self._active_downloads[queue_id]
            all_done = all(ep["status"] in ["completed", "failed", "cancelled"] for ep in job["episodes"])
            if all_done:
                failed = any(ep["status"] == "failed" for ep in job["episodes"])
                cancelled = all(ep["status"] == "cancelled" for ep in job["episodes"])
                if cancelled: status = "failed"; msg = "Cancelled"
                elif failed: status = "completed"; msg = f"Partial: {job['completed_episodes']}/{job['total_episodes']} done"
                else: status = "completed"; msg = f"Done: {job['completed_episodes']} eps"
                self._update_download_status(queue_id, status, current_episode=msg)

    def get_job_episodes(self, queue_id: int):
        with self._queue_lock:
            if queue_id in self._active_downloads: return self._active_downloads[queue_id].get("episodes", [])
            for j in self._completed_downloads:
                if j["id"] == queue_id: return j.get("episodes", [])
            return None

    def reorder_episodes(self, queue_id: int, new_order_urls: list) -> bool:
        with self._queue_lock:
            if queue_id not in self._active_downloads: return False
            job = self._active_downloads[queue_id]
            fixed = [e["url"] for e in job["episodes"] if e["status"] != "queued"]
            if new_order_urls[:len(fixed)] != fixed or set(job["episode_urls"]) != set(new_order_urls): return False
            job["episode_urls"] = new_order_urls; u_to_e = {e["url"]: e for e in job["episodes"]}; job["episodes"] = [u_to_e[u] for u in new_order_urls]
            return True

    def stop_episode(self, queue_id: int, ep_url: str) -> bool:
        with self._queue_lock:
            if queue_id not in self._active_downloads: return False
            job = self._active_downloads[queue_id]; ep = next((e for e in job["episodes"] if e["url"] == ep_url), None)
            if not ep: return False
            if ep["status"] == "downloading": ep["status"] = "cancelled"; self._cancelled_episodes.add((queue_id, ep_url)); return True
            if ep_url in job["episode_urls"]: job["episode_urls"].remove(ep_url)
            job["episodes"] = [e for e in job["episodes"] if e["url"] != ep_url]; job["total_episodes"] = len(job["episodes"])
            if not job["episodes"]: self.cancel_download(queue_id)
            return True

    def _process_movie4k_download(self, queue_id, original_link, job, download_dir):
        from ..movie4k.movie4k_stream_finder import hole_sprachliste, hole_stream_daten, download_stream
        try:
            m_id = original_link.split(":")[1]; langs = hole_sprachliste(m_id)
            if not langs: return False
            s_data = hole_stream_daten(langs[0]["_id"]); streams = s_data.get("streams", []) if s_data else []
            if not streams: return False
            for s in reversed(streams):
                if self._stop_event.is_set() or queue_id in self._cancelled_jobs: break
                u = s.get("stream", ""); 
                if not u: continue
                stream_url = "https:" + u if u.startswith("//") else u if u.startswith("http") else "https://" + u
                def web_progress_callback(d):
                    if self._stop_event.is_set() or queue_id in self._cancelled_jobs: raise KeyboardInterrupt("Stopped")
                    if d["status"] == "downloading":
                        p = 0.0
                        if d.get("_percent_str"):
                            p_str = d["_percent_str"].replace("%", "").strip()
                            try: p = float(p_str)
                            except: pass
                        with self._queue_lock:
                            for ep in job["episodes"]:
                                if ep["url"] == original_link: ep["progress"] = p; ep["status"] = "downloading"
                            self._update_job_global_progress(queue_id)
                if download_stream(stream_url, s_data.get("title", job["anime_title"]), s_data.get("lang", "de"), web_progress_callback=web_progress_callback, output_dir=download_dir):
                    with self._queue_lock:
                        for ep in job["episodes"]:
                            if ep["url"] == original_link: ep["status"] = "completed"; ep["progress"] = 100.0; job["completed_episodes"] += 1
                    return True
            return False
        except Exception: return False

    def _update_download_status(self, queue_id: int, status: str, completed_episodes: int = None, current_episode: str = None, error_message: str = None, total_episodes: int = None, current_episode_progress: float = None):
        with self._queue_lock:
            if queue_id not in self._active_downloads: return False
            d = self._active_downloads[queue_id]; d["status"] = status
            if total_episodes is not None: d["total_episodes"] = total_episodes
            if completed_episodes is not None: d["completed_episodes"] = completed_episodes
            if current_episode_progress is not None: d["current_episode_progress"] = min(100.0, max(0.0, float(current_episode_progress)))
            if status in ["completed", "failed"]:
                d["completed_at"] = datetime.now()
                if status == "completed" and not error_message: d["progress_percentage"] = 100.0
                self._completed_downloads.append(d.copy()); del self._active_downloads[queue_id]
                if len(self._completed_downloads) > self._max_completed_history: self._completed_downloads = self._completed_downloads[-self._max_completed_history:]
            if current_episode is not None: d["current_episode"] = current_episode
            if error_message is not None: d["error_message"] = error_message
            return True


_download_manager = None

def get_download_manager(database: Optional[UserDatabase] = None) -> DownloadQueueManager:
    global _download_manager
    if _download_manager is None: _download_manager = DownloadQueueManager(database)
    return _download_manager
