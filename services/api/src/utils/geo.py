import logging

from timezonefinder import TimezoneFinder

logger = logging.getLogger(__name__)
tzf = TimezoneFinder()


def get_tz_name(latitude: float, longitude: float) -> str:
    """
    get the timezone name for the given latitude/longitude
    :param latitude:
    :param longitude:
    :return: the timezone name, or "UTC" if not found
    """
    try:
        tz_name = tzf.timezone_at(lng=longitude, lat=latitude)
        return tz_name or "UTC"
    except Exception:
        logger.warning(
            "error getting timezone for latitude/longitude: "
            "{latitude}, {longitude}: {e}"
        )
        return "UTC"
