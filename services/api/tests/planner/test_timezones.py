from astropy.time import Time
from src.planner.planner_models import ObservationLocation


def test_timezone_resolution():
    """Verify that the timezone is correctly resolved from coordinates."""
    # Los Angeles
    la = ObservationLocation(
        name="LA", latitude=34.05, longitude=-118.24, bortle_scale=None, elevation_m=0.0
    )
    assert la.timezone == "America/Los_Angeles"

    # London
    london = ObservationLocation(
        name="London", latitude=51.50, longitude=0.0, bortle_scale=None, elevation_m=0.0
    )
    assert london.timezone == "Europe/London"

    # Tokyo
    tokyo = ObservationLocation(
        name="Tokyo",
        latitude=35.67,
        longitude=139.65,
        bortle_scale=None,
        elevation_m=0.0,
    )
    assert tokyo.timezone == "Asia/Tokyo"


def test_local_time_conversion():
    """Verify that Observer correctly converts UTC to local time."""
    la = ObservationLocation(
        name="LA", latitude=34.05, longitude=-118.24, bortle_scale=None, elevation_m=0.0
    )
    observer = la.get_observer()

    # 2026-01-01 05:00 UTC is 2025-12-31 21:00 PST (UTC-8)
    utc_time = Time("2026-01-01T05:00:00")
    local_dt = observer.astropy_time_to_datetime(utc_time)

    assert local_dt.hour == 21
    assert local_dt.day == 31
    assert local_dt.month == 12
    assert local_dt.year == 2025
    # Check offset
    assert local_dt.utcoffset().total_seconds() == -8 * 3600


def test_dst_handling():
    """Verify that DST is correctly handled for local time conversion."""
    # New York City
    nyc = ObservationLocation(
        name="NYC", latitude=40.71, longitude=-74.00, bortle_scale=None, elevation_m=0.0
    )
    observer = nyc.get_observer()

    # Winter (EST, UTC-5)
    winter_utc = Time("2026-01-01T12:00:00")
    winter_local = observer.astropy_time_to_datetime(winter_utc)
    assert winter_local.utcoffset().total_seconds() == -5 * 3600

    # Summer (EDT, UTC-4) - DST starts March 8 in 2026
    summer_utc = Time("2026-07-01T12:00:00")
    summer_local = observer.astropy_time_to_datetime(summer_utc)
    assert summer_local.utcoffset().total_seconds() == -4 * 3600
