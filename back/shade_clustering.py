import os
import json
from typing import Optional, Tuple, Dict, Any
import numpy as np
from PIL import Image
import cv2
from skimage import color, segmentation, util
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def load_image_rgb(path: str, max_dim: int = 1200) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    scale = min(1.0, float(max_dim) / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return np.array(img)

def rgb_to_lab(img_rgb: np.ndarray) -> np.ndarray:
    img_float = img_rgb.astype(np.float32) / 255.0
    lab = color.rgb2lab(img_float)
    return lab

def bilateral_denoise(img_rgb: np.ndarray, d=9, sigmaColor=75, sigmaSpace=75) -> np.ndarray:
    return cv2.bilateralFilter(img_rgb, d=d, sigmaColor=sigmaColor, sigmaSpace=sigmaSpace)

def compute_superpixels(img_rgb: np.ndarray, n_segments: int = 600, compactness: float = 10.0) -> np.ndarray:
    """
    Return a 2D array (h,w) of superpixel labels, start_label=0.
    """
    img_float = img_rgb.astype(np.float32) / 255.0
    segments = segmentation.slic(img_float, n_segments=n_segments, compactness=compactness, start_label=0)
    return segments

def superpixel_mean_L(lab: np.ndarray, segments: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Returns:
      - feats: (n_segments, 1) mean L value (0..100)
      - counts: (n_segments,) pixel counts
    """
    nseg = int(segments.max()) + 1
    L = lab[..., 0]
    feats = np.zeros((nseg, 1), dtype=np.float32)
    counts = np.zeros((nseg,), dtype=np.int32)
    # vectorized accumulation: iterate segments indices
    for s in range(nseg):
        mask = (segments == s)
        if not np.any(mask):
            feats[s, 0] = 0.0
            counts[s] = 0
        else:
            feats[s, 0] = float(L[mask].mean())
            counts[s] = int(mask.sum())
    return feats, counts

def choose_k_silhouette(feats: np.ndarray, k_min: int = 2, k_max: int = 8) -> int:
    """
    Choose k by maximizing silhouette score (costly for large data).
    feats: (n_samples, n_features)
    """
    best_k = k_min
    best_score = -1.0
    n_samples = feats.shape[0]
    if n_samples < 2:
        return 1
    k_upper = min(k_max, n_samples - 1)
    for k in range(k_min, max(k_min, k_upper) + 1):
        km = KMeans(n_clusters=k, random_state=0, n_init=10)
        labels = km.fit_predict(feats)
        if len(np.unique(labels)) < 2:
            continue
        score = silhouette_score(feats, labels)
        if score > best_score:
            best_score = score
            best_k = k
    return best_k

def choose_k_by_quantiles(feats: np.ndarray, n_bins: int = 6) -> int:
    """
    Simple fallback: use quantile bins on the L values to estimate k.
    """
    vals = feats[:, 0]
    unique = np.unique(vals)
    if unique.size < 2:
        return 1
    return min(n_bins, unique.size)

def cluster_kmeans(feats: np.ndarray, n_clusters: int) -> Tuple[np.ndarray, np.ndarray]:
    km = KMeans(n_clusters=n_clusters, random_state=0, n_init=10)
    labels = km.fit_predict(feats)
    centers = km.cluster_centers_.flatten()
    return labels, centers

def build_cluster_map(segments: np.ndarray, seg_labels: np.ndarray) -> np.ndarray:
    cluster_map = np.zeros_like(segments, dtype=np.int32)
    for seg_id, cl in enumerate(seg_labels):
        cluster_map[segments == seg_id] = int(cl)
    return cluster_map

def cluster_to_grayscale_image(cluster_map: np.ndarray, centers: np.ndarray) -> np.ndarray:
    """
    Map each cluster id to its center L (0..100) -> 0..255 grayscale image
    """
    h, w = cluster_map.shape
    out = np.zeros((h, w), dtype=np.uint8)
    for cl, val in enumerate(centers):
        L8 = int(np.clip((val / 100.0) * 255.0, 0, 255))
        out[cluster_map == cl] = L8
    return out

def cluster_index_image(cluster_map: np.ndarray) -> np.ndarray:
    """
    Colorized index image for debugging (map cluster ids to 0..255 range)
    """
    n_clusters = int(cluster_map.max()) + 1
    if n_clusters <= 1:
        return (cluster_map.astype(np.uint8) * 255)
    # simple mapping
    palette = np.linspace(0, 255, n_clusters).astype(np.uint8)
    out = palette[cluster_map]
    return out.astype(np.uint8)

def cluster_shades(
    input_path: str,
    out_dir: str,
    *,
    max_dim: int = 1200,
    n_segments: int = 600,
    compactness: float = 10.0,
    n_shades: Optional[int] = None,
    auto_method: str = "silhouette",
    k_max: int = 8
) -> Dict[str, Any]:
    """
    Main function: clusters perceived shading and writes outputs.

    Returns a metadata dict with paths and cluster info.
    """
    print("is this even working")
    ensure_dir(out_dir)
    img_rgb = load_image_rgb(input_path, max_dim=max_dim)
    denoised = bilateral_denoise(img_rgb)
    lab = rgb_to_lab(denoised)
    segments = compute_superpixels(denoised, n_segments=n_segments, compactness=compactness)
    feats, counts = superpixel_mean_L(lab, segments)
    print("down here!")
    if n_shades is not None and n_shades >= 1:
        k = int(max(1, n_shades))
    else:
        if auto_method == "silhouette":
            k = choose_k_silhouette(feats, k_min=2, k_max=k_max)
        else:
            k = choose_k_by_quantiles(feats, n_bins=k_max)

    if k <= 1:
        seg_labels = np.zeros((feats.shape[0],), dtype=np.int32)
        centers = np.array([float(feats[:, 0].mean())])
    else:
        seg_labels, centers = cluster_kmeans(feats, n_clusters=k)

    cluster_map = build_cluster_map(segments, seg_labels)
    gray_clustered = cluster_to_grayscale_image(cluster_map, centers)
    index_img = cluster_index_image(cluster_map)

    base = os.path.splitext(os.path.basename(input_path))[0]
    gray_path = os.path.join(out_dir, f"{base}_clustered_gray.png")
    idx_path = os.path.join(out_dir, f"{base}_clustered_index.png")
    meta_path = os.path.join(out_dir, f"{base}_cluster_meta.json")
    
    web_gray_path = f"/temp2/{base}_clustered_gray.png"

    cv2.imwrite(gray_path, gray_clustered)
    cv2.imwrite(idx_path, index_img)


    meta = {
        "input": input_path,
        "clustered_gray": web_gray_path,
        "clustered_index": idx_path,
        "n_segments": int(n_segments),
        "n_shades_chosen": int(k),
        "cluster_centers_L": [float(c) for c in centers],
        "segment_counts": [int(c) for c in counts.tolist()],
    }

    return meta
