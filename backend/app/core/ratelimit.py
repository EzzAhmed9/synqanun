import time
import threading
from typing import Dict, List
from fastapi import Request, HTTPException, status

# Note: This in-memory rate limiter is per process. In a distributed multi-worker production environment, use a centralized store such as Redis.

_WINDOW_SECONDS = 900  # 15 minutes
_MAX_FAILED_ATTEMPTS = 5

_lock = threading.Lock()
_failed_attempts: Dict[str, List[float]] = {}

def get_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For header or direct client host."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

def _make_key(ip: str, email: str) -> str:
    return f"{ip.strip()}:{email.strip().lower()}"

def check_rate_limit(request: Request, email: str) -> None:
    """
    Check if the client IP + lowercased email has exceeded failed attempts.
    Raises HTTP 429 with Retry-After header if >= 5 failed attempts in the last 15 minutes.
    """
    if not email:
        return

    ip = get_client_ip(request)
    key = _make_key(ip, email)
    now = time.time()

    with _lock:
        timestamps = _failed_attempts.get(key, [])
        # Prune failures older than 15 minutes
        valid_timestamps = [t for t in timestamps if now - t < _WINDOW_SECONDS]
        _failed_attempts[key] = valid_timestamps

        if len(valid_timestamps) >= _MAX_FAILED_ATTEMPTS:
            oldest_in_window = valid_timestamps[0]
            retry_after = int(oldest_in_window + _WINDOW_SECONDS - now)
            if retry_after <= 0:
                retry_after = 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

def record_failure(request: Request, email: str) -> None:
    """Record a failed login or authentication attempt."""
    if not email:
        return

    ip = get_client_ip(request)
    key = _make_key(ip, email)
    now = time.time()

    with _lock:
        timestamps = _failed_attempts.get(key, [])
        # Keep only recent within window and append current failure
        valid_timestamps = [t for t in timestamps if now - t < _WINDOW_SECONDS]
        valid_timestamps.append(now)
        _failed_attempts[key] = valid_timestamps

def record_success(request: Request, email: str) -> None:
    """Reset the failure counter on successful authentication."""
    if not email:
        return

    ip = get_client_ip(request)
    key = _make_key(ip, email)

    with _lock:
        if key in _failed_attempts:
            del _failed_attempts[key]

def reset_rate_limit(ip: str, email: str) -> None:
    """Helper for testing: reset counter for specific IP + email."""
    key = _make_key(ip, email)
    with _lock:
        if key in _failed_attempts:
            del _failed_attempts[key]

def reset_all_rate_limits() -> None:
    """Helper for testing: clear all rate limiter state."""
    with _lock:
        _failed_attempts.clear()
