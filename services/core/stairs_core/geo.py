import logging

logger = logging.getLogger(__name__)

try:
    from timezonefinder import TimezoneFinder

    _tzf: "TimezoneFinder | None" = TimezoneFinder()
except ImportError:  # optional extra ("stairs-core[tz]"); absent in Pyodide
    _tzf = None


def get_tz_name(latitude: float, longitude: float) -> str:
    """
    get the timezone name for the given latitude/longitude
    :param latitude:
    :param longitude:
    :return: the timezone name, or "UTC" if not found or timezonefinder is unavailable
    """
    if _tzf is None:
        return "UTC"
    try:
        tz_name = _tzf.timezone_at(lng=longitude, lat=latitude)
        return tz_name or "UTC"
    except Exception as e:
        logger.warning(
            "error getting timezone for latitude/longitude: "
            f"{latitude}, {longitude}: {e}"
        )
        return "UTC"


def location_key(latitude: float, longitude: float) -> str:
    """
    normalize latitude/longitude to 0.01-degree precision, for cache keys
    :param latitude:
    :param longitude:
    :return:
    """
    return f"lat_{round(latitude, 2):.2f}_lon_{round(longitude, 2):.2f}"
