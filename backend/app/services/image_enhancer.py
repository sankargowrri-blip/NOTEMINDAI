"""AI Image Enhancement Pipeline — optimised for handwritten note photos."""
from __future__ import annotations
import cv2
import numpy as np
from PIL import Image
import io


def load_image(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    return img


def to_bytes(img: np.ndarray, fmt: str = ".png") -> bytes:
    _, buf = cv2.imencode(fmt, img)
    return buf.tobytes()


def upscale_if_small(img: np.ndarray) -> np.ndarray:
    """Upscale images smaller than 1000px wide for better OCR."""
    h, w = img.shape[:2]
    if w < 1000:
        scale = 1000 / w
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    return img


def correct_skew(img: np.ndarray) -> np.ndarray:
    """Detect and correct skew using Hough transform — more robust."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 100:
        return img
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    # Only correct if skew is significant (>0.5 deg) and not too large (avoid false positives)
    if abs(angle) < 0.5 or abs(angle) > 30:
        return img
    (h, w) = img.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def remove_noise(img: np.ndarray) -> np.ndarray:
    """Fast bilateral filter — preserves edges better than NLM denoising."""
    return cv2.bilateralFilter(img, 9, 75, 75)


def enhance_contrast(img: np.ndarray) -> np.ndarray:
    """CLAHE on LAB L-channel for even contrast across the page."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def sharpen_image(img: np.ndarray) -> np.ndarray:
    """Unsharp mask — gentler than Laplacian, avoids over-sharpening."""
    blurred = cv2.GaussianBlur(img, (0, 0), 3)
    return cv2.addWeighted(img, 1.5, blurred, -0.5, 0)


def binarise_for_ocr(img: np.ndarray) -> np.ndarray:
    """
    Convert to clean black-on-white binary — ideal for OCR.
    Uses Otsu + adaptive threshold combination for best results.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Adaptive threshold handles uneven lighting
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    return cv2.cvtColor(adaptive, cv2.COLOR_GRAY2BGR)


def full_enhance_pipeline(image_bytes: bytes) -> bytes:
    """
    Optimised pipeline for handwritten note photos:
    1. Upscale if small
    2. Skew correction
    3. Noise removal
    4. Contrast enhancement
    5. Sharpening
    6. Binarisation (B&W clean) — done LAST so OCR gets clean text
    """
    try:
        img = load_image(image_bytes)
        img = upscale_if_small(img)
        img = correct_skew(img)
        img = remove_noise(img)
        img = enhance_contrast(img)
        img = sharpen_image(img)
        img = binarise_for_ocr(img)
        return to_bytes(img)
    except Exception:
        return image_bytes  # return original on any failure
