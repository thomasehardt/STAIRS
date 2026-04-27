from datetime import datetime

import astropy.units as u
from astroplan import Observer
from astropy.time import Time
from src.astro_logic.visibility import (
    does_day_have_astronomical_day,
    does_day_have_astronomical_night,
    find_horizon_crossings,
    find_next_astronomical_night,
    get_astronomical_night,
)


def test_astronomical_day_night_check():
    # Greenwich
    london = Observer(latitude=51.48 * u.deg, longitude=0.0 * u.deg)

    # Equinox (Equal day/night roughly)
    dt = datetime(2026, 3, 20, 12, 0, 0)
    assert does_day_have_astronomical_day(london, dt) is True
    assert does_day_have_astronomical_night(london, dt) is True

    # Arctic Summer (No night)
    tromso = Observer(latitude=69.65 * u.deg, longitude=18.95 * u.deg)
    summer_dt = datetime(2026, 6, 21, 12, 0, 0)
    assert does_day_have_astronomical_day(tromso, summer_dt) is True
    assert does_day_have_astronomical_night(tromso, summer_dt) is False


def test_find_next_astronomical_night():
    london = Observer(latitude=51.48 * u.deg, longitude=0.0 * u.deg)

    # Noon - should find night starting in a few hours
    start_time = Time("2026-03-20T12:00:00Z")
    night_start, night_end = find_next_astronomical_night(london, start_time)

    assert night_start > start_time
    assert (night_end - night_start).to(u.hour).value > 0


def test_get_astronomical_night_already_night():
    london = Observer(latitude=51.48 * u.deg, longitude=0.0 * u.deg)

    # Midnight - should start NOW
    start_time = Time("2026-03-20T00:00:00Z")
    night_start, night_end = get_astronomical_night(london, start_time)

    assert night_start == start_time
    assert night_end > start_time


def test_find_horizon_crossings():
    london = Observer(latitude=51.48 * u.deg, longitude=0.0 * u.deg)
    dt = datetime(2026, 3, 20, 12, 0, 0)

    # Sun setting
    setting = find_horizon_crossings(london, dt, direction="setting")
    assert setting is not None

    # Sun rising
    rising = find_horizon_crossings(london, dt, direction="rising")
    assert rising is not None
