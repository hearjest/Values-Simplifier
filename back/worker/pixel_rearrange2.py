import argparse
import os
from typing import Any, Dict

import cv2
import numpy as np
from PIL import Image
from scipy.optimize import linear_sum_assignment
from scipy.spatial.distance import cdist
from skimage import color


def load_square_rgb(path: str, side: int) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    m = min(w, h)
    left = (w - m) // 2
    top = (h - m) // 2
    img = img.crop((left, top, left + m, top + m))
    img = img.resize((side, side), Image.Resampling.LANCZOS)
    return np.array(img, dtype=np.uint8)


def decode_image_bytes(blob: bytes) -> np.ndarray:
    arr = np.frombuffer(blob, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Invalid image bytes")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def rearrange_pixels_array(
    img_rgb: np.ndarray,
    *,
    target_image_path: str,
    side: int = 64,
    alpha: float = 0.35,
    beta: float = 0.65,
) -> Dict[str, Any]:
    if not os.path.exists(target_image_path):
        raise FileNotFoundError(f"Missing target image: {target_image_path}")

    if img_rgb.ndim != 3 or img_rgb.shape[2] != 3:
        raise ValueError("Expected RGB image array")

    src = Image.fromarray(img_rgb.astype(np.uint8), mode="RGB")
    w, h = src.size
    m = min(w, h)
    left = (w - m) // 2
    top = (h - m) // 2
    src = src.crop((left, top, left + m, top + m)).resize((side, side), Image.Resampling.LANCZOS)
    src_rgb = np.array(src, dtype=np.uint8)
    tgt_rgb = load_square_rgb(target_image_path, side)

    h, w = src_rgb.shape[:2]
    src_lab = color.rgb2lab(src_rgb.astype(np.float32) / 255.0).reshape(-1, 3)
    tgt_lab = color.rgb2lab(tgt_rgb.astype(np.float32) / 255.0).reshape(-1, 3)

    yy, xx = np.indices((h, w))
    src_xy = np.column_stack([xx.ravel(), yy.ravel()]).astype(np.float32)
    tgt_xy = np.column_stack([xx.ravel(), yy.ravel()]).astype(np.float32)

    src_xy_norm = src_xy / np.array([max(w - 1, 1), max(h - 1, 1)], dtype=np.float32)
    tgt_xy_norm = tgt_xy / np.array([max(w - 1, 1), max(h - 1, 1)], dtype=np.float32)

    color_cost = cdist(src_lab, tgt_lab, metric="sqeuclidean").astype(np.float32)
    spatial_cost = cdist(src_xy_norm, tgt_xy_norm, metric="sqeuclidean").astype(np.float32)
    cost = beta * color_cost + alpha * spatial_cost
    cost -= cost.min()

    row_ind, col_ind = linear_sum_assignment(cost)

    src_flat = src_rgb.reshape(-1, 3)
    out_flat = np.zeros_like(src_flat)
    out_flat[col_ind] = src_flat[row_ind]
    out_rgb = out_flat.reshape(h, w, 3)

    out_bgr = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)
    ok, encoded = cv2.imencode(".png", out_bgr)
    if not ok:
        raise ValueError("Failed to encode rearranged image")

    mse = float(np.mean((out_rgb.astype(np.float32) - tgt_rgb.astype(np.float32)) ** 2))

    return {
        "outputted_bytes": encoded.tobytes(),
        "content_type": "image/png",
        "method": "pixel_rearrange_hungarian",
        "target_image_path": target_image_path,
        "mse": mse,
        "side": int(side),
    }


def process_bytes(source_blob: bytes) -> Dict[str, Any]:
    worker_dir = os.path.dirname(__file__)
    target_image_path = os.getenv("PIXEL_TARGET_IMAGE", os.path.join(worker_dir, "9jjoim.png"))
    side = int(os.getenv("PIXEL_REARRANGE_SIDE", "64"))
    alpha = float(os.getenv("PIXEL_ALPHA", "0.35"))
    beta = float(os.getenv("PIXEL_BETA", "0.65"))

    img_rgb = decode_image_bytes(source_blob)
    return rearrange_pixels_array(
        img_rgb,
        target_image_path=target_image_path,
        side=max(16, min(128, side)),
        alpha=alpha,
        beta=beta,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rearrange source image pixels to form a target image.")
    parser.add_argument("--source", required=True, help="Path to source image")
    parser.add_argument("--target", default="9jjoim.png", help="Path to target image")
    parser.add_argument("--out", default="pixel_rearrange2_output.png", help="Output PNG path")
    parser.add_argument("--side", type=int, default=64)
    parser.add_argument("--alpha", type=float, default=0.35)
    parser.add_argument("--beta", type=float, default=0.65)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    with open(args.source, "rb") as f:
        blob = f.read()

    img_rgb = decode_image_bytes(blob)
    res = rearrange_pixels_array(
        img_rgb,
        target_image_path=args.target,
        side=max(16, min(128, args.side)),
        alpha=args.alpha,
        beta=args.beta,
    )
