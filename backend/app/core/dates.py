from datetime import date, datetime
from typing import Optional


def today() -> date:
    return date.today()


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s or not isinstance(s, str):
        return None
    raw = s.strip()
    if len(raw) < 10:
        return None
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def days_until(s: Optional[str]) -> Optional[int]:
    d = parse_date(s)
    if d is None:
        return None
    return (d - today()).days


def days_ago(s: Optional[str]) -> Optional[int]:
    d = parse_date(s)
    if d is None:
        return None
    return (today() - d).days
