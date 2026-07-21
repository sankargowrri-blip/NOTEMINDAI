"""OCR Engine — EasyOCR + Tesseract with smart pre-processing."""
from __future__ import annotations
import io
import logging
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)

EASYOCR_LANG_MAP = {
    "en": ["en"],
    "hi": ["hi"],
    "ta": ["ta"],
    "fr": ["fr"],
    "de": ["de"],
    "multi": ["en", "hi"],
}

_easyocr_readers: dict = {}


def _bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
    """image bytes → OpenCV BGR numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    return img


def _bytes_to_pil(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def _get_easyocr_reader(lang_key: str):
    import easyocr, torch
    if lang_key not in _easyocr_readers:
        langs = EASYOCR_LANG_MAP.get(lang_key, ["en"])
        _easyocr_readers[lang_key] = easyocr.Reader(
            langs, gpu=torch.cuda.is_available(), verbose=False
        )
    return _easyocr_readers[lang_key]


def _prepare_for_ocr(image_bytes: bytes) -> np.ndarray:
    """
    Additional OCR-specific prep on top of the enhancement pipeline.
    Ensures image is in the best state for EasyOCR.
    """
    img = _bytes_to_numpy(image_bytes)
    # If already binarised (B&W), use directly
    # Upscale small images
    h, w = img.shape[:2]
    if w < 800:
        scale = 800 / w
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    return img


def ocr_with_easyocr(image_bytes: bytes, lang_key: str = "en") -> tuple[str, float]:
    """EasyOCR — primary engine."""
    try:
        reader = _get_easyocr_reader(lang_key)
        img_np = _prepare_for_ocr(image_bytes)

        # Run with paragraph mode OFF for better word-level detection
        results = reader.readtext(
            img_np,
            detail=1,
            paragraph=False,
            width_ths=0.7,      # merge nearby text boxes
            height_ths=0.7,
        )
        if not results:
            return "", 0.0

        # Sort results top-to-bottom, left-to-right (reading order)
        results_sorted = sorted(results, key=lambda r: (r[0][0][1], r[0][0][0]))

        # Build text preserving line breaks
        lines: list[list[str]] = []
        current_line: list[str] = []
        prev_y = None

        for bbox, text, conf in results_sorted:
            if conf < 0.05:
                continue
            y = bbox[0][1]
            if prev_y is not None and abs(y - prev_y) > 20:
                if current_line:
                    lines.append(current_line)
                current_line = []
            current_line.append(text)
            prev_y = y

        if current_line:
            lines.append(current_line)

        full_text = "\n".join(" ".join(line) for line in lines)
        all_confs = [r[2] for r in results_sorted if r[2] >= 0.05]
        avg_conf = sum(all_confs) / len(all_confs) if all_confs else 0.0

        return full_text.strip(), float(avg_conf)
    except Exception as e:
        logger.warning(f"EasyOCR failed: {e}")
        return "", 0.0


def ocr_with_tesseract(image_bytes: bytes, lang: str = "eng") -> tuple[str, float]:
    """Tesseract fallback — good for printed text."""
    try:
        import pytesseract
        image = _bytes_to_pil(image_bytes)
        # PSM 6 = assume uniform block of text
        config = f"--psm 6 --oem 3 -l {lang}"
        data = pytesseract.image_to_data(
            image, config=config, output_type=pytesseract.Output.DICT
        )
        words, confs = [], []
        for w, c in zip(data["text"], data["conf"]):
            c = int(c)
            if c > 0 and w.strip():
                words.append(w)
                confs.append(c)
        text = " ".join(words)
        avg_conf = (sum(confs) / len(confs) / 100.0) if confs else 0.0
        return text, avg_conf
    except Exception as e:
        logger.warning(f"Tesseract failed: {e}")
        return "", 0.0


def run_ocr(image_bytes: bytes, language: str = "en") -> dict:
    """
    Main OCR pipeline.
    Returns: {text, confidence, engine}
    """
    lang_key = language if language in EASYOCR_LANG_MAP else "en"
    tess_lang_map = {"en": "eng", "hi": "hin", "ta": "tam", "fr": "fra", "de": "deu"}
    tess_lang = tess_lang_map.get(language, "eng")

    # --- EasyOCR (primary) ---
    text, conf = ocr_with_easyocr(image_bytes, lang_key=lang_key)
    if text.strip():
        logger.info(f"EasyOCR: {len(text)} chars, conf={conf:.2f}")
        return {"text": text, "confidence": round(conf, 3), "engine": "easyocr"}

    # --- Tesseract fallback ---
    logger.info("EasyOCR returned empty — trying Tesseract")
    text, conf = ocr_with_tesseract(image_bytes, lang=tess_lang)
    if text.strip():
        logger.info(f"Tesseract: {len(text)} chars, conf={conf:.2f}")
        return {"text": text, "confidence": round(conf, 3), "engine": "tesseract"}

    logger.warning("All OCR engines returned empty text")
    return {"text": "", "confidence": 0.0, "engine": "none"}
