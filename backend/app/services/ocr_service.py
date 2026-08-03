"""Lightweight OCR Engine — Tesseract Only (Memory Optimized)."""
from __future__ import annotations
import io, logging
import numpy as np
import cv2
from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)

def run_ocr(image_bytes: bytes, language: str = "en") -> dict:
    """Uses only Tesseract to stay within 512MB RAM limits."""
    try:
        tess_lang_map = {"en": "eng", "hi": "hin", "ta": "tam", "fr": "fra", "de": "deu"}
        lang = tess_lang_map.get(language, "eng")
        
        # Open and optimize image
        image = Image.open(io.BytesIO(image_bytes)).convert("L") # Grayscale for speed
        
        # Basic OCR
        text = pytesseract.image_to_string(image, lang=lang)
        
        if text.strip():
            logger.info(f"OCR_SUCCESS: {len(text)} chars detected.")
            return {"text": text.strip(), "confidence": 0.85, "engine": "tesseract"}
            
        return {"text": "", "confidence": 0.0, "engine": "tesseract"}
    except Exception as e:
        logger.error(f"OCR_FAILED: {e}")
        return {"text": "", "confidence": 0.0, "engine": "failed"}
