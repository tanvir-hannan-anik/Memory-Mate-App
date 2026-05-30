"""
Supabase Storage — handles audio and image uploads.
Bucket name: memoire-media  (create this in Supabase dashboard, set to private)
"""
from app.db.supabase import get_supabase

BUCKET = "memoire-media"


async def upload_audio(user_id: str, conversation_id: str, audio_bytes: bytes, filename: str) -> str:
    """Upload audio file, return storage path."""
    path = f"audio/{user_id}/{conversation_id}/{filename}"
    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(
        path=path,
        file=audio_bytes,
        file_options={"content-type": "audio/webm", "upsert": "true"},
    )
    return path


async def upload_image(user_id: str, conversation_id: str, image_bytes: bytes, filename: str) -> str:
    """Upload a single image, return storage path."""
    path = f"images/{user_id}/{conversation_id}/{filename}"
    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(
        path=path,
        file=image_bytes,
        file_options={"content-type": "image/jpeg", "upsert": "true"},
    )
    return path


def get_signed_url(path: str, expires_in: int = 3600) -> str:
    """Generate a temporary signed URL for a storage path."""
    sb = get_supabase()
    result = sb.storage.from_(BUCKET).create_signed_url(path, expires_in)
    return result.get("signedURL", "")
