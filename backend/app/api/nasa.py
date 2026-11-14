"""NASA Astronomy Picture of the Day (APOD) proxy.

Fetched on the server so the NASA API key never reaches the browser. NASA's API can be slow or flaky, so:
  * the request runs in a background thread (the page never waits on NASA),
  * the last good picture is cached in memory and on disk (backend/nasa_cache.json) and served even when stale,
  * only images are shown, with short kid-friendly text,
  * the endpoint never raises: it returns {"available": false, "reason": "..."} instead.
"""
import json
import logging
import re
import threading
import time
from datetime import date, timedelta
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, Request

from app.core.config import BACKEND_DIR, get_settings
from app.core.rate_limit import client_ip, limiter

router = APIRouter(prefix="/api/nasa", tags=["NASA data"])
log = logging.getLogger("astrokids.nasa")

APOD_URL = "https://api.nasa.gov/planetary/apod"
CACHE_SECONDS = 6 * 3600     # how long a good picture counts as fresh
RETRY_SECONDS = 60           # wait between failed attempts
CACHE_FILE = Path(BACKEND_DIR) / "nasa_cache.json"

_lock = threading.Lock()
_state: dict = {"good": None, "good_at": 0.0, "error": None, "last_try": 0.0, "thread": None}


# ----------------------------------------------------------------------------- parsing
def _short(text: str, limit: int = 260) -> str:
    """First sentences of NASA's explanation, trimmed to a readable length for children."""
    text = re.sub(r"https?://\S+", "", text or "")          # raw web addresses are not kid-friendly
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[: end + 1] if end > 80 else cut.rstrip(" ,;:") + "..."


JUNK_URL = re.compile(r"logo|banner|meatball|/themes/|/assets/|\.svg(\?|$)", re.I)


def _usable_image_url(raw: dict) -> str:
    """First https URL that looks like a real picture: the image, its HD version, or a video thumbnail."""
    media = raw.get("media_type")
    candidates = [raw.get("url"), raw.get("hdurl")] if media == "image" else [raw.get("thumbnail_url")] if media == "video" else []
    for u in candidates:
        if isinstance(u, str) and u.startswith("https://") and not JUNK_URL.search(u):
            return u
    return ""


def parse_apod(raw: dict) -> dict:
    """Turn NASA's response into our safe payload (a real picture, never a logo or promo banner)."""
    if not isinstance(raw, dict):
        return {"available": False}
    url = _usable_image_url(raw)
    if not url:
        return {"available": False}
    return {
        "available": True,
        "title": str(raw.get("title", "Picture of the Day"))[:120],
        "date": raw.get("date"),
        "image_url": url,
        "hd_url": raw.get("hdurl") if str(raw.get("hdurl", "")).startswith("https://") and not JUNK_URL.search(str(raw.get("hdurl"))) else None,
        "summary": _short(str(raw.get("explanation", ""))),
        "credit": ("Image credit: " + str(raw["copyright"]).replace("\n", " ").strip()) if raw.get("copyright")
        else "Image credit: NASA",
        "source": "NASA Astronomy Picture of the Day",
        "source_url": "https://apod.nasa.gov/apod/astropix.html",
    }


def pick_latest_image(items) -> dict:
    """Newest usable image from a list of APOD entries (some days are videos or promos).

    Two passes: genuine APOD photos (hosted under apod.nasa.gov/apod/image/) first, then any other normal image,
    so the card only says "unavailable" when NASA really sent nothing usable.
    """
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        return {"available": False, "reason": "NASA sent an unexpected response format."}
    entries = sorted((i for i in items if isinstance(i, dict)), key=lambda i: str(i.get("date", "")), reverse=True)
    parsed = [p for p in (parse_apod(e) for e in entries) if p.get("available")]
    for p in parsed:
        if "apod.nasa.gov/apod/image/" in p["image_url"]:
            return p
    if parsed:
        return parsed[0]
    kinds = ", ".join(f"{e.get('media_type')}:{str(e.get('url', ''))[:60]}" for e in entries[:4])
    return {"available": False, "reason": f"NASA returned {len(entries)} entries but none had a usable image ({kinds})."}


# ----------------------------------------------------------------------------- fetching
def _describe_failure(exc, status) -> str:
    if status is not None:
        hint = {403: "API key rejected - check NASA_API_KEY in backend/.env",
                429: "rate limit reached - wait an hour or use your own key"}.get(status, "NASA service problem")
        return f"NASA returned HTTP {status} ({hint})"
    if isinstance(exc, httpx.TimeoutException):
        return "NASA did not answer in time (timeout) - NASA or your internet is slow"
    return f"could not reach NASA: {type(exc).__name__}"


def fetch_apod(api_key: str, timeout: float = 15.0) -> dict:
    """Try the last-week range first, then single recent days (NASA's range/single calls fail independently)."""
    today = date.today()
    attempts = [{"start_date": (today - timedelta(days=7)).isoformat()}]
    attempts += [{"date": (today - timedelta(days=n)).isoformat()} for n in range(0, 7)]
    reasons, timeouts = [], 0
    for params in attempts:
        try:
            r = httpx.get(APOD_URL, params={"api_key": api_key, "thumbs": "true", **params},
                          timeout=httpx.Timeout(timeout, connect=15.0))
            if r.status_code == 200:
                picked = pick_latest_image(r.json())
                if picked.get("available"):
                    return picked
                reasons.append(picked.get("reason", "no usable image"))
            else:
                reasons.append(_describe_failure(None, r.status_code))
                if r.status_code in (403, 429):      # retrying other dates will not help
                    break
        except (httpx.HTTPError, ValueError) as exc:
            reasons.append(_describe_failure(exc, None))
            timeouts += isinstance(exc, httpx.TimeoutException)
            if timeouts >= 2:                         # NASA is not answering (about 30 s in total); try again later
                break
        log.warning("NASA APOD attempt (%s) failed: %s", next(iter(params)), reasons[-1])
    # Prefer a connection/key problem over "no usable image" in the message, but mention both
    summary = reasons[0] if reasons else "unknown"
    if len(reasons) > 1 and reasons[-1] != reasons[0]:
        summary += f" | last attempt: {reasons[-1]}"
    return {"available": False, "reason": summary}


# ----------------------------------------------------------------------------- NASA Image and Video Library
# Second source, used when APOD has no real photo (needs no API key). Public NASA images, picked by day of year.
LIBRARY_URL = "https://images-api.nasa.gov/search"
LIBRARY_TOPICS = ["nebula", "galaxy", "Hubble Space Telescope", "Mars", "Jupiter", "Saturn", "Moon", "astronaut spacewalk",
                  "International Space Station", "Earth from space", "comet", "supernova", "Webb telescope", "Apollo"]


def parse_library_item(item: dict) -> dict:
    """One item from the NASA Image and Video Library -> our safe picture payload."""
    try:
        data = item["data"][0]
        thumb = next(l["href"] for l in item.get("links", []) if l.get("render") == "image")
    except (KeyError, IndexError, StopIteration, TypeError):
        return {"available": False}
    if data.get("media_type") != "image" or not str(thumb).startswith("https://") or JUNK_URL.search(str(thumb)):
        return {"available": False}
    nasa_id = str(data.get("nasa_id", ""))
    text = re.sub(r"<[^>]+>", " ", str(data.get("description") or data.get("description_508") or ""))
    who = data.get("photographer") or data.get("secondary_creator") or data.get("center")
    return {
        "available": True,
        "title": str(data.get("title", "Space picture from NASA"))[:120],
        "date": str(data.get("date_created", ""))[:10] or None,
        "image_url": thumb,
        "hd_url": None,
        "summary": _short(text),
        "credit": "Image credit: " + (str(who) if who and "NASA" in str(who).upper() else "NASA" + (f" / {who}" if who else "")),
        "source": "NASA Image and Video Library",
        "source_url": f"https://images.nasa.gov/details/{nasa_id}" if nasa_id else "https://images.nasa.gov/",
    }


def fetch_library_picture(timeout: float = 20.0) -> dict:
    today = date.today()
    topic = LIBRARY_TOPICS[today.toordinal() % len(LIBRARY_TOPICS)]
    try:
        r = httpx.get(LIBRARY_URL, params={"q": topic, "media_type": "image", "page_size": 30}, timeout=timeout)
        if r.status_code != 200:
            return {"available": False, "reason": f"NASA image library returned HTTP {r.status_code}"}
        items = r.json().get("collection", {}).get("items", [])
        usable = [p for p in (parse_library_item(i) for i in items) if p.get("available") and len(p["summary"]) > 40]
        if not usable:
            return {"available": False, "reason": f"NASA image library had no usable pictures for '{topic}'"}
        return usable[today.toordinal() % len(usable)]
    except (httpx.HTTPError, ValueError) as exc:
        return {"available": False, "reason": "NASA image library: " + _describe_failure(exc, None)}


# ----------------------------------------------------------------------------- cache + background refresh
def _load_disk_cache() -> None:
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        if data.get("picture", {}).get("available"):
            _state.update(good=data["picture"], good_at=float(data.get("saved_at", 0)))
    except (OSError, ValueError, AttributeError):
        pass


def _save_disk_cache(picture: dict) -> None:
    try:
        CACHE_FILE.write_text(json.dumps({"saved_at": time.time(), "picture": picture}), encoding="utf-8")
    except OSError:
        pass


def _refresh(api_key: str) -> None:
    try:
        data = fetch_apod(api_key)
        if not data.get("available"):                      # APOD has no real photo (or is slow): use the image library
            apod_reason = data.get("reason", "unknown")
            data = fetch_library_picture()
            if not data.get("available"):
                data["reason"] = f"APOD: {apod_reason} | LIBRARY: {data.get('reason', 'unknown')}"
        with _lock:
            if data.get("available"):
                _state.update(good=data, good_at=time.time(), error=None)
                _save_disk_cache(data)
            else:
                _state["error"] = data.get("reason", "unknown")
    finally:
        with _lock:
            _state["last_try"] = time.time()
            _state["thread"] = None


def _start_refresh(api_key: str) -> bool:
    with _lock:
        if _state["thread"] is not None:
            return False
        t = threading.Thread(target=_refresh, args=(api_key,), name="nasa-apod", daemon=True)
        _state["thread"] = t
    t.start()
    return True


_load_disk_cache()


@router.get("/apod", summary="NASA Astronomy Picture of the Day (cached, refreshed in the background; never errors)")
def apod(request: Request, settings=Depends(get_settings)):
    limiter.check(f"nasa:{client_ip(request)}", 60)
    now = time.time()
    good = _state["good"]
    fresh = good is not None and now - _state["good_at"] < CACHE_SECONDS
    if not fresh and _state["thread"] is None and now - _state["last_try"] > RETRY_SECONDS:
        _start_refresh(settings.nasa_api_key)
    if good is not None:
        return good                                   # fresh, or the last good picture while a new one loads
    if _state["thread"] is not None:
        return {"available": False, "loading": True, "reason": "Asking NASA for today's picture (NASA is slow right now)..."}
    reason = _state["error"] or "no attempt yet"
    if settings.nasa_api_key == "DEMO_KEY":
        reason += " | Note: NASA_API_KEY is still DEMO_KEY - the key in backend/.env was not loaded (restart the backend, check the line)."
    return {"available": False, "reason": reason}
