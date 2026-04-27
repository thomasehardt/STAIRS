import logging
from typing import Any

import numpy as np
import pandas as pd
from numpy import typing as npt
from src.api.schemas import ForecastData
from src.catalog.telescope import TelescopeProfile

TARGET_CLASS_FALLBACKS = {
    "Asterism": 15.0,
    "Dark Nebula": 20.0,
    "Double star": 0.1,
    "Emission Nebula": 30.0,
    "Galaxy Group": 15.0,
    "Galaxy": 8.0,
    "Globular Cluster": 10.0,
    "Open Cluster": 15.0,
    "Planetary Nebula": 2.0,
    "Quasar": 0.1,
    "Reflection Nebula": 15.0,
    "Star Cloud": 45.0,
    "Star": 0.01,
    "Stellar Association": 30.0,
    "Supernova remnant": 20.0,
}

logger = logging.getLogger(__name__)


def get_target_size_fov(target: Any) -> float:
    """
    Standardizes 0, 1, or 2-value size tuples into a single 'major' dimension for FOV
    Fit. Handles both Pydantic models and Pandas Series (DuckDB rows).
    """
    if hasattr(target, "angular_size"):
        size = target.angular_size
    else:
        size = target.get("angular_size")

    if size is None:
        return TARGET_CLASS_FALLBACKS.get(getattr(target, "target_type", "Other"), 1.0)

    size_arr = np.atleast_1d(size)
    if size_arr.size == 0:
        target_type = (
            getattr(target, "target_type", None) or target.get("target_type") or "Other"
        )
        return TARGET_CLASS_FALLBACKS.get(target_type, 1.0)

    return float(np.max(size_arr))


def calculate_altitude_score(
    max_altitude: npt.ArrayLike, target_min_altitude: float = 30.0
) -> np.ndarray:
    max_alt = np.atleast_1d(max_altitude).astype(float)
    scores = np.zeros_like(max_alt)
    mask = max_alt >= target_min_altitude
    scores[mask] = (
        (max_alt[mask] - target_min_altitude) / (90.0 - target_min_altitude) * 100.0
    )
    return np.clip(scores, 0.0, 100.0)


def calculate_sb_score(sb: npt.ArrayLike) -> np.ndarray:
    sb_arr = np.atleast_1d(sb).astype(float)
    scores = (24.0 - sb_arr) / (24.0 - 18.0) * 100.0
    return np.clip(scores, 0.0, 100.0)


def calculate_weather_score_vectorized(
    clouds: npt.ArrayLike,
    humidity: npt.ArrayLike,
    seeing: npt.ArrayLike | None = None,
) -> np.ndarray:
    clouds_arr = np.atleast_1d(clouds)
    humidity_arr = np.atleast_1d(humidity)

    cloud_multipliers = np.ones_like(clouds_arr, dtype=float)
    mask_cloud_zero = clouds_arr > 50
    mask_cloud_linear = (clouds_arr > 10) & (clouds_arr <= 50)

    cloud_multipliers[mask_cloud_zero] = 0.0
    cloud_multipliers[mask_cloud_linear] = 1.0 - (
        clouds_arr[mask_cloud_linear] - 10
    ) / (50 - 10)

    humidity_multipliers = np.ones_like(humidity_arr, dtype=float)
    humidity_multipliers[humidity_arr > 85] = 0.85

    seeing_multipliers = np.ones_like(clouds_arr, dtype=float)
    if seeing is not None:
        seeing_arr = np.atleast_1d(seeing)
        mask_seeing_bad = seeing_arr >= 4.0
        mask_seeing_linear = (seeing_arr > 1.0) & (seeing_arr < 4.0)
        seeing_multipliers[mask_seeing_bad] = 0.7
        seeing_multipliers[mask_seeing_linear] = (
            1.0 - (seeing_arr[mask_seeing_linear] - 1.0) / (4.0 - 1.0) * 0.3
        )

    return np.clip(
        cloud_multipliers * humidity_multipliers * seeing_multipliers, 0.0, 1.0
    )


def calculate_weather_score(weather: ForecastData | None) -> float:
    if not weather:
        return 1.0

    return float(
        calculate_weather_score_vectorized(
            weather.get("cloud_cover_pct", 0),
            weather.get("humidity_pct", 0),
            weather.get("seeing"),
        )[0]
    )


def calculate_sqs_vectorized(
    alts: npt.ArrayLike,
    azs: npt.ArrayLike,
    weather_multiplier: float = 1.0,
    moon_multiplier: float = 1.0,
) -> np.ndarray:
    alts_arr = np.atleast_1d(alts)
    azs_arr = np.atleast_1d(azs)
    multipliers = np.full_like(
        alts_arr, weather_multiplier * moon_multiplier, dtype=float
    )

    mask_zenith = alts_arr > 85.0
    zenith_penalty = (alts_arr[mask_zenith] - 85.0) / (90.0 - 85.0) * 0.5
    multipliers[mask_zenith] *= 1.0 - zenith_penalty

    mask_meridian = (azs_arr >= 175.0) & (azs_arr <= 185.0)
    multipliers[mask_meridian] *= 0.8

    return np.clip(multipliers * 100.0, 0.0, 100.0)


def calculate_sqs(
    current_altaz: Any | None = None,
    weather_data: ForecastData | None = None,
    moon_multiplier: float = 1.0,
) -> float:
    w_mult = calculate_weather_score(weather_data)
    if current_altaz is None:
        return w_mult * moon_multiplier * 100.0

    # Accessing attributes defined in AltAzLike protocol
    return float(
        calculate_sqs_vectorized(
            current_altaz.alt.deg, current_altaz.az.deg, w_mult, moon_multiplier
        )[0]
    )


def calculate_bortle_multiplier(bortle_scale: int | None) -> float:
    """
    returns a multiplier (0.0 - 1.0) to convert a relative score to an absolute score
    based on light pollution
    :param bortle_scale:
    :return:
    """
    if bortle_scale is None:
        return 1.0

    multipliers = {
        1: 1.0,
        2: 0.95,
        3: 0.9,
        4: 0.75,
        5: 0.55,
        6: 0.35,
        7: 0.2,
        8: 0.1,
        9: 0.05,
    }
    return multipliers.get(bortle_scale, 1.0)


def calculate_oss_vectorized(
    targets_df: pd.DataFrame,
    profile: TelescopeProfile,
    min_target_altitude: float = 30.0,
    bortle_scale: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    calculates both relative OSS and absolute AQS for a batch of targets
    :param targets_df:
    :param profile:
    :param min_target_altitude:
    :param bortle_scale:
    :return: (oss_relative, aqs_absolute)
    """
    # weights for our scores
    w_fov, w_sb, w_alt = 0.4, 0.3, 0.3

    # get the fov score
    if "size_maj" in targets_df.columns:
        sizes = targets_df["size_maj"].fillna(1.0).values
    else:
        sizes = np.array([get_target_size_fov(row) for _, row in targets_df.iterrows()])

    fov_min = profile.fov_min
    fov_exponent = -1.0 * (((sizes / fov_min) - 0.5) ** 2) / 0.1
    fov_scores = 100.0 * np.exp(fov_exponent)

    # calculate relative sb score
    mags = targets_df["magnitude"].fillna(20.0).values
    if "size_min" in targets_df.columns:
        size_min_vals = targets_df["size_min"].values
        areas = sizes * np.where(pd.isna(size_min_vals), sizes, size_min_vals)
    else:
        areas = sizes * sizes

    areas = np.maximum(areas, 0.0001)
    sb = mags + 2.5 * np.log10(areas) + 0.26 + 8.89
    sb_scores_rel = calculate_sb_score(sb)

    # calculate altitude score
    peak_alts = targets_df["peak_alt"].values
    alt_scores = calculate_altitude_score(peak_alts, min_target_altitude)

    # calculate relative oss score
    oss_rel = (fov_scores * w_fov) + (sb_scores_rel * w_sb) + (alt_scores * w_alt)

    # calculate absolute aqs score
    b_mult = calculate_bortle_multiplier(bortle_scale)
    aqs_abs = oss_rel * b_mult

    return oss_rel, aqs_abs


def calculate_oss(
    target: Any,
    profile: TelescopeProfile,
    max_altitude: float,
    min_target_altitude: float = 30.0,
    bortle_scale: int | None = None,
) -> tuple[float, float]:
    """
    :param target:
    :param profile:
    :param max_altitude:
    :param min_target_altitude:
    :param bortle_scale:
    :return: (relative_oss, absolute_aqs)
    """
    # The logic here already handles dict or object conversion.
    # The specific checks (isinstance dict, hasattr model_dump, to_dict)
    # are compatible with the CelestialTarget Protocol and Dict[str, Any].

    if isinstance(target, dict):
        data = target.copy()
    elif hasattr(target, "model_dump"):
        # This part assumes target is an object with model_dump
        data = target.model_dump()
    else:
        # This part assumes target is an object with to_dict
        data = target.to_dict().copy()

    if "size_maj" not in data:
        size = data.get("angular_size")
        if size is not None:
            size_arr = np.atleast_1d(size)
            if size_arr.size > 0:
                data["size_maj"] = float(np.max(size_arr))
                data["size_min"] = float(np.min(size_arr))

    df = pd.DataFrame([data])
    df["peak_alt"] = max_altitude

    oss, aqs = calculate_oss_vectorized(df, profile, min_target_altitude, bortle_scale)
    return round(float(oss[0]), 1), round(float(aqs[0]), 1)


def calculate_final_score(
    target: Any,
    profile: TelescopeProfile,
    max_altitude: float,
    min_target_altitude: float = 30.0,
    current_altaz: Any | None = None,
    weather_data: ForecastData | None = None,
    bortle_scale: int | None = None,
    moon_multiplier: float = 1.0,
) -> tuple[float, float]:
    """
    calculates final scores (relative and absolute) for a single target, adjusting for
    sky quality (weather, meridian, zenith)
    :param target:
    :param profile:
    :param max_altitude:
    :param min_target_altitude:
    :param current_altaz:
    :param weather_data:
    :param bortle_scale:
    :param moon_multiplier:
    :return: (final_relative, final_absolute)
    """
    oss_rel, aqs_abs = calculate_oss(
        target, profile, max_altitude, min_target_altitude, bortle_scale
    )
    sqs_multiplier = calculate_sqs(current_altaz, weather_data, moon_multiplier) / 100.0

    return round(oss_rel * sqs_multiplier, 1), round(aqs_abs * sqs_multiplier, 1)
