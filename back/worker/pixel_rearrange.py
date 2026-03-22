import os
from typing import Dict, Any, Tuple

import cv2
import numpy as np
from PIL import Image
from scipy.optimize import linear_sum_assignment
from scipy.spatial.distance import cdist
from scipy.special import logsumexp
from skimage import color


def _decode_image_bytes(blob: bytes) -> np.ndarray:
    arr = np.frombuffer(blob, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Invalid source image bytes")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def _center_crop_square_rgb(img_rgb: np.ndarray) -> np.ndarray:
    h, w = img_rgb.shape[:2]
    m = min(h, w)
    top = (h - m) // 2
    left = (w - m) // 2
    return img_rgb[top : top + m, left : left + m]


def _resize_rgb(img_rgb: np.ndarray, side: int) -> np.ndarray:
    return cv2.resize(img_rgb, (side, side), interpolation=cv2.INTER_AREA)


def _load_target_rgb(path: str, side: int) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    arr = np.array(img, dtype=np.uint8)
    arr = _center_crop_square_rgb(arr)
    return _resize_rgb(arr, side)


def _sinkhorn_log(cost_matrix: np.ndarray, eps: float, iters: int) -> Tuple[np.ndarray, np.ndarray]:
    n_rows, n_cols = cost_matrix.shape
    a = np.full((n_rows,), 1.0 / n_rows, dtype=np.float64)
    b = np.full((n_cols,), 1.0 / n_cols, dtype=np.float64)
    log_a = np.log(a)
    log_b = np.log(b)

    c = cost_matrix.astype(np.float64)
    c = c / (c.std() + 1e-8)
    log_k = -c / max(eps, 1e-6)

    f = np.zeros((n_rows,), dtype=np.float64)
    g = np.zeros((n_cols,), dtype=np.float64)

    for _ in range(iters):
        f = log_a - logsumexp(log_k + g[None, :], axis=1)
        g = log_b - logsumexp(log_k + f[:, None], axis=0)

    log_p = log_k + f[:, None] + g[None, :]
    return np.exp(log_p), log_p


def rearrange_pixels_to_target(
    source_blob: bytes,
    *,
    target_image_path: str,
    side: int = 64,
    alpha: float = 0.30,
    beta: float = 0.70,
    edge_boost: float = 0.45,
    sinkhorn_eps: float = 0.045,
    sinkhorn_iters: int = 180,
    sinkhorn_blend: float = 0.35,
) -> Dict[str, Any]:
    if not os.path.exists(target_image_path):
        raise FileNotFoundError(f"Target image not found: {target_image_path}")

    src_rgb = _decode_image_bytes(source_blob)
    src_rgb = _center_crop_square_rgb(src_rgb)
    src_rgb = _resize_rgb(src_rgb, side)
    tgt_rgb = _load_target_rgb(target_image_path, side)

    h, w = src_rgb.shape[:2]
    src_flat = src_rgb.reshape(-1, 3)

    src_lab = color.rgb2lab(src_rgb.astype(np.float32) / 255.0).reshape(-1, 3)
    tgt_lab = color.rgb2lab(tgt_rgb.astype(np.float32) / 255.0).reshape(-1, 3)

    yy, xx = np.indices((h, w))
    src_xy = np.column_stack([xx.ravel(), yy.ravel()]).astype(np.float32)
    tgt_xy = np.column_stack([xx.ravel(), yy.ravel()]).astype(np.float32)

    src_xy_norm = src_xy / np.array([max(w - 1, 1), max(h - 1, 1)], dtype=np.float32)
    tgt_xy_norm = tgt_xy / np.array([max(w - 1, 1), max(h - 1, 1)], dtype=np.float32)

    color_cost = cdist(src_lab, tgt_lab, metric="sqeuclidean").astype(np.float32)
    spatial_cost = cdist(src_xy_norm, tgt_xy_norm, metric="sqeuclidean").astype(np.float32)
    base_cost = beta * color_cost + alpha * spatial_cost

    gray = color.rgb2gray(tgt_rgb.astype(np.float32) / 255.0)
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = 0.5 * (gray[:, 2:] - gray[:, :-2])
    gy[1:-1, :] = 0.5 * (gray[2:, :] - gray[:-2, :])
    edge = np.sqrt(gx * gx + gy * gy)
    edge = edge / (edge.max() + 1e-8)

    edge_weight = (1.0 + edge_boost * edge).reshape(1, -1).astype(np.float32)
    cost = base_cost * edge_weight
    cost -= cost.min()

    _, log_plan = _sinkhorn_log(cost, eps=sinkhorn_eps, iters=sinkhorn_iters)

    surprisal = -log_plan.astype(np.float32)
    surprisal -= surprisal.min()
    surprisal /= (surprisal.std() + 1e-8)

    cost_norm = cost.astype(np.float32)
    cost_norm -= cost_norm.min()
    cost_norm /= (cost_norm.std() + 1e-8)

    refined_cost = (1.0 - sinkhorn_blend) * cost_norm + sinkhorn_blend * surprisal

    row_ind, col_ind = linear_sum_assignment(refined_cost)

    out_flat = np.zeros_like(src_flat)
    out_flat[col_ind] = src_flat[row_ind]
    out_rgb = out_flat.reshape(h, w, 3)

    out_bgr = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)
    ok, encoded = cv2.imencode(".png", out_bgr)
    if not ok:
        raise ValueError("Failed to encode rearranged image")

    return {
        "outputted_bytes": encoded.tobytes(),
        "content_type": "image/png",
        "method": "pixel_rearrange_sinkhorn",
        "side": int(side),
        "target_image_path": target_image_path,
    }


def process_bytes(source_blob: bytes) -> Dict[str, Any]:
    worker_dir = os.path.dirname(__file__)
    target_image_path = os.getenv("PIXEL_TARGET_IMAGE", os.path.join(worker_dir, "9jjoim.png"))

    side = int(os.getenv("PIXEL_REARRANGE_SIDE", "64"))
    side = max(16, min(128, side))

    alpha = float(os.getenv("PIXEL_ALPHA", "0.30"))
    beta = float(os.getenv("PIXEL_BETA", "0.70"))
    edge_boost = float(os.getenv("PIXEL_EDGE_BOOST", "0.45"))
    sinkhorn_eps = float(os.getenv("PIXEL_SINKHORN_EPS", "0.045"))
    sinkhorn_iters = int(os.getenv("PIXEL_SINKHORN_ITERS", "180"))
    sinkhorn_blend = float(os.getenv("PIXEL_SINKHORN_BLEND", "0.35"))

    return rearrange_pixels_to_target(
        source_blob,
        target_image_path=target_image_path,
        side=side,
        alpha=alpha,
        beta=beta,
        edge_boost=edge_boost,
        sinkhorn_eps=sinkhorn_eps,
        sinkhorn_iters=sinkhorn_iters,
        sinkhorn_blend=sinkhorn_blend,
    )
