"""
cloud_storage.py
----------------
Centralised helper for uploading AI-generated images to Cloudinary.
Usage:
    from app.core.cloud_storage import upload_ai_image
    url = upload_ai_image(image_bytes, user_id=current_user.user_id)
"""

import io
import uuid

import cloudinary
import cloudinary.uploader

from app.core.config import settings

# Configure Cloudinary once at import time
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,  # always use HTTPS URLs
)


def upload_ai_image(image_bytes: bytes, user_id: int, folder_suffix: str = "") -> str:
    """
    Upload raw image bytes to Cloudinary and return the public HTTPS URL.

    Args:
        image_bytes:    Raw bytes of the image (PNG, JPEG, WebP, etc.)
        user_id:        The ID of the user who owns the generated image.
        folder_suffix:  Optional sub-folder name, e.g. "outfits" or "try_on".

    Returns:
        A Cloudinary secure URL string, e.g.:
        https://res.cloudinary.com/<cloud>/image/upload/v.../moda/ai/user_5/abc123.png
    """
    sub = f"/{folder_suffix}" if folder_suffix else ""
    folder = f"moda/ai_generated/user_{user_id}{sub}"

    result = cloudinary.uploader.upload(
        io.BytesIO(image_bytes),
        folder=folder,
        public_id=uuid.uuid4().hex,   # unique filename
        resource_type="image",
        format="png",
        overwrite=False,
    )

    return result["secure_url"]


def delete_ai_image(public_id: str) -> None:
    """
    Delete an image from Cloudinary by its public_id.
    The public_id is the path WITHOUT the file extension, e.g.:
        moda/ai_generated/user_5/abc123
    """
    cloudinary.uploader.destroy(public_id, resource_type="image")
