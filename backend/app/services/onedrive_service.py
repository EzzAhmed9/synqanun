import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import urllib.parse

MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
DEFAULT_SCOPES = "Files.ReadWrite offline_access User.Read"

def get_authorization_url(client_id: str, redirect_uri: str, state: str = "synqanun") -> str:
    """Generate the Microsoft OAuth2 authorization URL."""
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": DEFAULT_SCOPES,
        "state": state,
        "prompt": "consent",
    }
    return f"{MICROSOFT_AUTH_URL}?{urllib.parse.urlencode(params)}"

async def exchange_code_for_tokens(
    client_id: str,
    client_secret: Optional[str],
    code: str,
    redirect_uri: str,
) -> Dict[str, Any]:
    """Exchange authorization code for access and refresh tokens."""
    data = {
        "client_id": client_id,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "scope": DEFAULT_SCOPES,
    }
    if client_secret:
        data["client_secret"] = client_secret

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(MICROSOFT_TOKEN_URL, data=data)
        if resp.status_code != 200:
            raise Exception(f"Failed to exchange token: {resp.status_code} - {resp.text}")
        return resp.json()

async def refresh_access_token(
    client_id: str,
    client_secret: Optional[str],
    refresh_token: str,
) -> Dict[str, Any]:
    """Refresh an expired access token using the refresh token."""
    data = {
        "client_id": client_id,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": DEFAULT_SCOPES,
    }
    if client_secret:
        data["client_secret"] = client_secret

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(MICROSOFT_TOKEN_URL, data=data)
        if resp.status_code != 200:
            raise Exception(f"Failed to refresh token: {resp.status_code} - {resp.text}")
        return resp.json()

async def get_user_profile(access_token: str) -> Dict[str, Any]:
    """Fetch Microsoft User Profile to obtain display name and email."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{GRAPH_BASE_URL}/me", headers=headers)
        if resp.status_code != 200:
            raise Exception(f"Failed to fetch user profile: {resp.status_code} - {resp.text}")
        return resp.json()

async def upload_docx_to_onedrive(
    access_token: str,
    file_bytes: bytes,
    filename: str,
) -> Dict[str, Any]:
    """
    Upload a .docx file to OneDrive folder '/SynQanun/Documents/{filename}'.
    Returns the driveItem with its unique 'id' and 'webUrl' to open in Word Online.
    """
    clean_filename = urllib.parse.quote(filename)
    url = f"{GRAPH_BASE_URL}/me/drive/root:/SynQanun/Documents/{clean_filename}:/content"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.put(url, content=file_bytes, headers=headers)
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to upload to OneDrive: {resp.status_code} - {resp.text}")
        data = resp.json()
        return {
            "item_id": data.get("id"),
            "web_url": data.get("webUrl"),
            "name": data.get("name"),
            "size": data.get("size"),
        }

async def download_docx_from_onedrive(access_token: str, item_id: str) -> bytes:
    """Download the latest content of a document from OneDrive by item ID."""
    url = f"{GRAPH_BASE_URL}/me/drive/items/{item_id}/content"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise Exception(f"Failed to download from OneDrive: {resp.status_code} - {resp.text}")
        return resp.content
