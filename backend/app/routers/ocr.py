"""On-demand OCR endpoint."""
from fastapi import APIRouter, UploadFile, File, Form, Depends
from app.models.user import User
from app.routers.deps import get_current_user
from app.services.image_enhancer import full_enhance_pipeline
from app.services.ocr_service import run_ocr

router = APIRouter()


@router.post("/process")
async def process_image(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    enhance: bool = Form(default=True),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    if enhance:
        try:
            content = full_enhance_pipeline(content)
        except Exception:
            pass
    result = run_ocr(content, language=language)
    return {
        "text": result["text"],
        "confidence": result["confidence"],
        "engine": result["engine"],
        "low_confidence_warning": result["confidence"] < 0.7,
    }
