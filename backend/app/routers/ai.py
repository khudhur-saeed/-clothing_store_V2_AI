from base64 import b64encode
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.get("/image-base64")
def image_base64(url: str = Query(..., description="Public image URL to fetch and encode")):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")

    # Add a browser-like user-agent because some CDNs block default Python agents.
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urlopen(request, timeout=20) as response:
            content_type = response.headers.get("Content-Type", "image/jpeg")
            data = response.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not fetch image URL: {exc}") from exc

    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="URL did not return an image")

    return {
        "data": b64encode(data).decode("utf-8"),
        "mime_type": content_type,
    }
