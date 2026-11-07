import time
import threading
from typing import Dict, List
from fastapi import Request, HTTPException, status

# Note: In a distributed multi-worker production environment, configure a centralized store such as Redis.

_WINDOW_SECONDS = 900  # 15 minutes
_MAX_FAILED_ATTEMPTS = 5
_MAX_IP_FAILED_ATTEMPTS = 25  # Anti-spraying limit per IP across all accounts

_lock = threading.Lock()
_failed_attempts: Dict[str, List[float]] = {}
_ip_failed_attempts: Dict[str, List[float]] = {}

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

def _prune_expired(now: float) -> None:
    """Prune expired timestamp buckets to prevent memory accumulation."""
    if len(_failed_attempts) > 500:
        dead_keys = [k for k, v in _failed_attempts.items() if not v or (now - v[-1] >= _WINDOW_SECONDS)]
        for k in dead_keys:
            del _failed_attempts[k]
    if len(_ip_failed_attempts) > 500:
        dead_ips = [ip for ip, v in _ip_failed_attempts.items() if not v or (now - v[-1] >= _WINDOW_SECONDS)]
        for ip in dead_ips:
            del _ip_failed_attempts[ip]

def check_rate_limit(request: Request, email: str) -> None:
    """
    Check if the client IP or (IP + lowercased email) has exceeded failed attempts.
    Raises HTTP 429 with Retry-After header if >= 5 failed attempts on the account
    or >= 25 failed attempts from the IP in the last 15 minutes.
    """
    ip = get_client_ip(request)
    now = time.time()

    with _lock:
        _prune_expired(now)

        # 1. Check IP-level spraying limit
        ip_timestamps = _ip_failed_attempts.get(ip, [])
        valid_ip_timestamps = [t for t in ip_timestamps if now - t < _WINDOW_SECONDS]
        _ip_failed_attempts[ip] = valid_ip_timestamps

        if len(valid_ip_timestamps) >= _MAX_IP_FAILED_ATTEMPTS:
            retry_after = max(1, int(valid_ip_timestamps[0] + _WINDOW_SECONDS - now))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed requests from this IP address. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

        # 2. Check (IP + Email) targeted attempt limit
        if email:
            key = _make_key(ip, email)
            timestamps = _failed_attempts.get(key, [])
            valid_timestamps = [t for t in timestamps if now - t < _WINDOW_SECONDS]
            _failed_attempts[key] = valid_timestamps

            if len(valid_timestamps) >= _MAX_FAILED_ATTEMPTS:
                retry_after = max(1, int(valid_timestamps[0] + _WINDOW_SECONDS - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed attempts. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

def record_failure(request: Request, email: str) -> None:
    """Record a failed login or authentication attempt for both IP and specific email."""
    ip = get_client_ip(request)
    now = time.time()

    with _lock:
        # Record IP failure
        ip_timestamps = _ip_failed_attempts.get(ip, [])
        valid_ip_timestamps = [t for t in ip_timestamps if now - t < _WINDOW_SECONDS]
        valid_ip_timestamps.append(now)
        _ip_failed_attempts[ip] = valid_ip_timestamps

        # Record Account failure
        if email:
            key = _make_key(ip, email)
            timestamps = _failed_attempts.get(key, [])
            valid_timestamps = [t for t in timestamps if now - t < _WINDOW_SECONDS]
            valid_timestamps.append(now)
            _failed_attempts[key] = valid_timestamps

def record_success(request: Request, email: str) -> None:
    """Reset the failure counter for this specific account upon successful authentication."""
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
        if ip in _ip_failed_attempts:
            del _ip_failed_attempts[ip]

def reset_all_rate_limits() -> None:
    """Helper for testing: clear all rate limiter state."""
    with _lock:
        _failed_attempts.clear()
        _ip_failed_attempts.clear()
