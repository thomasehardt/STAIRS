from astroplan import Observer
from astropy import units as u
from astropy.coordinates import SkyCoord
from astropy.time import Time


def test_absolute_sirius_position():
    """
    Verify the position of Sirius (the brightest star) from a known location/time.
    Location: Los Angeles (34.05, -118.24)
    Time: 2026-01-01 05:00:00 UTC
    """
    # Sirius Coordinates (ICRS)
    sirius = SkyCoord(ra="06h45m08.9s", dec="-16d42m58s", frame="icrs")

    la = Observer(
        latitude=34.05 * u.deg, longitude=-118.24 * u.deg, elevation=100 * u.m
    )
    time = Time("2026-01-01T05:00:00Z")

    altaz = la.altaz(time, sirius)

    # Expected: Around 5:00 UTC (9 PM local time on New Year's Eve in LA),
    # Sirius should be in the South-East, fairly low but rising.
    # Reference calculation: Alt ~24.2, Az ~133.2
    assert 23.0 < altaz.alt.deg < 25.0
    assert 132.0 < altaz.az.deg < 134.0


def test_polaris_stability():
    """
    Verify that Polaris stays near the North Pole.
    Location: New York City (40.71, -74.00)
    Time: Throughout the night
    """
    polaris = SkyCoord(ra="02h31m49s", dec="+89d15m51s", frame="icrs")
    nyc = Observer(latitude=40.71 * u.deg, longitude=-74.0 * u.deg)

    # Check at three different times during the night
    times = Time(
        ["2026-03-20T00:00:00Z", "2026-03-20T04:00:00Z", "2026-03-20T08:00:00Z"]
    )

    altaz = nyc.altaz(times, polaris)

    for i in range(len(times)):
        # Altitude should be very close to the latitude of the observer
        assert abs(altaz[i].alt.deg - 40.71) < 1.0
        # Azimuth should be very close to North (0 or 360)
        az = altaz[i].az.deg
        assert az < 2.0 or az > 358.0


def test_sun_at_equinox():
    """
    Verify Sun position at Spring Equinox at the equator.
    Location: Quito, Ecuador (0.0, -78.5)
    Time: 2026-03-20 17:15:00 UTC (Solar Noon)
    """
    quito = Observer(latitude=0.0 * u.deg, longitude=-78.5 * u.deg)
    # Vernal equinox 2026 is around March 20, 14:02 UTC
    # Solar noon in Quito is roughly 12:15 local time (17:15 UTC)
    time = Time("2026-03-20T17:15:00Z")

    sun_altaz = quito.sun_altaz(time)

    # At the equinox on the equator at solar noon, the sun should be directly
    # overhead (Zenith)
    assert sun_altaz.alt.deg > 88.0
