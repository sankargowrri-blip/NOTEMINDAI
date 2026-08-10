"""Storage abstraction: local filesystem, AWS S3, or Firebase Storage."""
from __future__ import annotations
import os
import hashlib
import aiofiles
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

def compute_file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


async def save_file_local(data: bytes, relative_path: str) -> str:
    """Save to local uploads dir, return URL path."""
    full_path = Path(settings.local_upload_dir) / relative_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(data)
    return f"/uploads/{relative_path}"


async def save_file_s3(data: bytes, key: str) -> str:
    """Upload to S3 and return public URL."""
    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    s3.put_object(Bucket=settings.aws_s3_bucket, Key=key, Body=data)
    return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


async def save_file(data: bytes, user_id: int, filename: str) -> str:
    """Save file using configured backend. Returns the file URL."""
    relative_path = f"user_{user_id}/{filename}"
    if settings.storage_backend == "s3":
        return await save_file_s3(data, relative_path)
    else:
        return await save_file_local(data, relative_path)


async def delete_file(file_url: str):
    """Delete a file from storage based on its URL."""
    if not file_url:
        return

    try:
        if settings.storage_backend == "s3":
            # Extract key from URL
            import boto3
            key = file_url.split(".com/")[-1]
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region,
            )
            s3.delete_object(Bucket=settings.aws_s3_bucket, Key=key)
            logger.info(f"S3_DELETE: Success for {key}")
        else:
            # Local file deletion
            relative_path = file_url.replace("/uploads/", "")
            full_path = Path(settings.local_upload_dir) / relative_path
            if full_path.exists():
                os.remove(full_path)
                logger.info(f"LOCAL_DELETE: Success for {full_path}")
    except Exception as e:
        logger.error(f"STORAGE_DELETE_FAILED: {e}")


async def read_file_local(relative_path: str) -> bytes:
    full_path = Path(settings.local_upload_dir) / relative_path
    async with aiofiles.open(full_path, "rb") as f:
        return await f.read()
