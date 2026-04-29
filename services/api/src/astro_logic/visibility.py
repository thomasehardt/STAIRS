import logging
from datetime import datetime

import astropy.units as u
import numpy as np
from astroplan import Observer
from astropy.coordinates import AltAz, SkyCoord
from astropy.time import Time, TimeDelta
from astropy.utils import iers
from numpy import typing as npt

"""
contains logic related to the viewer at a point in time (i.e., a location + timestamp)
"""

logger = logging.getLogger(__name__)
iers.conf.auto_download = False


def get_astronomical_day_for_date(
    observer: Observer,
    dt: datetime,
) -> dict[str, Time | None]:
    astronomical_twilight_alt = -18

    day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    day_time = Time(day_start)

    day_noon = observer.noon(day_time, which="next")
    day_midnight = observer.midnight(day_time, which="next")

    noon_altitude = observer.sun_altaz(day_noon).alt.deg
    midnight_altitude = observer.sun_altaz(day_midnight).alt.deg

    return {
        "start": None if noon_altitude < astronomical_twilight_alt else day_noon,
        "end": None if midnight_altitude > astronomical_twilight_alt else day_midnight,
    }


def does_day_have_astronomical_day(
    observer: Observer,
    dt: datetime,
) -> bool:
    return get_astronomical_day_for_date(observer, dt)["start"] is not None


def does_day_have_astronomical_night(
    observer: Observer,
    dt: datetime,
) -> bool:
    return get_astronomical_day_for_date(observer, dt)["end"] is not None


def find_horizon_crossings(
    observer: Observer, start_dt: datetime, direction: str = "setting"
) -> Time | None:
    astronomical_twilight_alt = -18
    test_time = start_dt

    found = False
    # search for the first crossing of the horizon in the next year
    # TODO: do we need to limit this to the next 24 hours?
    for _ in range(366):
        sol_altitude = observer.sun_altaz(test_time).alt.deg
        if direction == "setting":
            found = True
            break
        else:
            if sol_altitude >= astronomical_twilight_alt:
                found = True
                break
        test_time += TimeDelta(1 * u.day)

    if not found:
        logger.error(
            f"could not find a horizon crossing for {start_dt} within 366 days"
        )
        return None

    search_anchor = test_time - TimeDelta(12 * u.hour)

    if direction == "setting":
        return observer.twilight_evening_astronomical(search_anchor, which="next")
    else:
        return observer.twilight_morning_astronomical(search_anchor, which="next")


def find_next_astronomical_night(
    observer: Observer, start_time: Time, date_window_days: int = 14
) -> tuple[Time, Time]:
    """
    find the next dark period from the given location and timestamp.
    :param observer:
    :param start_time:
    :param date_window_days:
    :return:
    """
    astronomical_twilight_alt = -18

    max_time = start_time + TimeDelta(date_window_days * u.day)

    # case: it is already dark
    if observer.sun_altaz(start_time).alt.deg <= astronomical_twilight_alt:
        night_start = start_time
        morning = find_next_astronomical_morning(
            observer=observer, start_time=start_time, date_window_days=date_window_days
        )
        return night_start, (morning or max_time)

    # case: it is not currently dark, but it is dark in the time period
    found_nadir = None
    for day_offset in range(date_window_days + 1):
        check_time = start_time + TimeDelta(day_offset * u.day)

        try:
            # worst case: solar midnight
            nadir = observer.midnight(time=check_time, which="next")

            if nadir > max_time:
                # found the next night, but it's after our window
                break

            if observer.sun_altaz(nadir).alt.deg <= astronomical_twilight_alt:
                # found a nadir ... and it's low enough
                found_nadir = nadir
                break
        except ValueError:
            # we do not have an astronomical night
            continue

    if not found_nadir:
        raise ValueError(f"no astronomical night found within {date_window_days} days")

    # find the exact start of the first night in the series
    actual_start = observer.twilight_evening_astronomical(
        time=found_nadir, which="previous"
    )

    # ensure it's not in the past
    if actual_start < start_time:
        actual_start = start_time

    remaining_days = (max_time - actual_start).to(u.day).value

    morning = find_next_astronomical_morning(
        observer=observer, start_time=actual_start, date_window_days=remaining_days
    )

    return actual_start, (morning or max_time)


def find_next_astronomical_morning(
    observer: Observer, start_time: Time, date_window_days: int = 14
) -> Time | None:
    """
    finds the next astronomical morning within the specified window
    returns None if it happens after the window (or never occurs)
    :param observer:
    :param start_time:
    :param date_window_days:
    :return:
    """

    max_time = start_time + TimeDelta(date_window_days * u.day)
    curr = start_time

    skip_increment = TimeDelta(5 * u.day)

    while curr < max_time:
        try:
            morning = observer.twilight_morning_astronomical(time=curr, which="next")

            if morning <= max_time:
                return morning
            else:
                return None
        except ValueError:
            # within this period, the sun does not set
            curr += skip_increment

    return None


def get_astronomical_night(
    observer: Observer, start_time: Time, date_window_days: int = 14
) -> tuple[Time, Time] | None:
    """
    find the dark period that starts at the given time, up to the given number of days
    :param observer:
    :param start_time:
    :param date_window_days:
    :return:
    """
    astronomical_twilight_alt = -18

    max_time = start_time + TimeDelta(date_window_days * u.day)

    # is it night now?
    if observer.sun_altaz(time=start_time).alt.deg <= astronomical_twilight_alt:
        morning = find_next_astronomical_morning(
            observer=observer, start_time=start_time, date_window_days=date_window_days
        )
        return start_time, (morning or max_time)

    try:
        return find_next_astronomical_night(
            observer=observer, start_time=start_time, date_window_days=date_window_days
        )
    except ValueError:
        return None


def get_peak_altitudes(
    observer: Observer, targets: SkyCoord, time_range: tuple[Time, Time]
) -> npt.NDArray[np.float64]:
    """
    vectorized coarse filter to find the max altitude each target reaches
    in the given timeframe
    :param observer:
    :param targets:
    :param time_range:
    :return:
    """
    start_time, end_time = time_range
    duration = end_time - start_time
    offsets = np.linspace(0, 1, 5) * duration
    sample_times = start_time + offsets

    if observer.location is None:
        raise ValueError("observer location must be set to calculate peak altitudes")

    # if a single value is passed in, we have a scalar not a vector
    if getattr(targets, "isscalar", False) or targets.ndim == 0:
        targets = targets.reshape((1,))

    targets_2d = targets[:, np.newaxis]

    altaz_frame = AltAz(
        obstime=sample_times[np.newaxis, :],
        location=observer.location,
    )

    altitudes = np.asarray(targets_2d.transform_to(altaz_frame).alt.deg)

    peak_altitudes = np.max(altitudes, axis=1)
    return peak_altitudes.astype(np.float64)


def find_visible_window(
    observer: Observer,
    target: SkyCoord,
    time_range: tuple[Time, Time],
    min_alt: float = 30.0,
) -> tuple[Time, Time] | None:
    """
    returns the (start, end) Time objects for the visible window of the given target
    within the time_range and above min_alt
    :param observer:
    :param target:
    :param time_range:
    :param min_alt:
    :return:
    """
    start_time, end_time = time_range
    horizon = min_alt * u.deg

    # is the target observable at start_time?
    target_is_up = observer.target_is_up(
        time=start_time,
        target=target,
        horizon=horizon,
    )

    if target_is_up:
        rise_time = start_time
    else:
        try:
            # when does it rise?
            rise_time = observer.target_rise_time(
                time=start_time,
                target=target,
                which="next",
                horizon=horizon,
            )
            if rise_time > end_time:
                return None
        except ValueError:
            # target doesn't rise during our timeframe
            return None

    try:
        set_time = observer.target_set_time(
            time=rise_time,
            target=target,
            which="next",
            horizon=horizon,
        )
    except ValueError:
        # fun astroplan edge case - throws an error if the target does not set
        set_time = end_time

    actual_end = min(set_time, end_time)

    # TODO: can this actually happen?
    if actual_end <= rise_time:
        return None

    return rise_time, actual_end


def get_moon_quality(observer: Observer, time: Time) -> float:
    """
    returns a float representing the moon's quality at the given time
    quality is a measure of the Moon's brightness:
    1.0 = new moon / set moon
    0.5 = full moon directly overhead
    :param observer:
    :param time:
    :return:
    """
    moon_illumination = observer.moon_illumination(time)
    moon_altitude = observer.moon_altaz(time).alt.deg

    moon_quality = 1.0 - (moon_illumination * 0.5 * (max(0, moon_altitude) / 90.0))

    return moon_quality
