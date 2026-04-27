from __future__ import annotations

import logging
from datetime import datetime

import astropy.units as u
import numpy as np
import numpy.typing as npt
import pandas as pd
import pytz
from astroplan import Observer
from astropy.coordinates import EarthLocation
from astropy.time import Time
from pydantic import BaseModel, Field, field_validator, model_validator
from src.utils.geo import get_tz_name

logger = logging.getLogger(__name__)


def astropy_time_to_datetime(self: Observer, t: Time) -> datetime | None:
    """
    Converts an astropy Time object to a localized python datetime object
    using the observer's timezone.
    Handles masked arrays or arrays with a single element.
    """
    if t is None:
        return None

    try:
        # If it's a masked array or has a mask attribute
        if hasattr(t, "mask") and np.any(t.mask):
            return None

        dt = t.to_datetime(timezone=self.timezone)

        # If it returned an array (e.g. from a length-1 Time object)
        if isinstance(dt, np.ndarray | list):
            if len(dt) > 0:
                # Handle masked numpy array of objects
                val = dt[0]
                if pd.isna(val):
                    return None
                return val
            return None

        if pd.isna(dt):
            return None

        return dt
    except Exception:
        return None


# Monkey-patch astroplan.Observer to include our utility method
Observer.astropy_time_to_datetime = astropy_time_to_datetime


class ObservationLocation(BaseModel):
    """
    Represents a location for astronomical observations, including
    latitude, longitude, and timezone, backed by our database
    """

    id: int | None = None
    name: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation_m: float = Field(0.0, ge=0)
    bortle_scale: int | None = Field(None, ge=1, le=9)
    timezone: str | None = None

    horizon_mask: list[tuple[float, float]] = Field(default_factory=list)

    @model_validator(mode="after")
    def resolve_missing_timezone(self) -> ObservationLocation:
        if not self.timezone:
            self.timezone = get_tz_name(
                latitude=self.latitude, longitude=self.longitude
            )
        return self

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, timezone: str | None) -> str | None:
        if timezone is None:
            return timezone

        if timezone not in pytz.all_timezones:
            raise ValueError(
                f"'{timezone}' is not a valid timezone. "
                f"check pytz.all_timezones for a list of valid timezones"
            )

        return timezone

    def get_observer(self) -> Observer:
        """
        returns the astroplan.Observer instance for calculations
        :return:
        """
        location = EarthLocation(
            lat=self.latitude * u.deg,
            lon=self.longitude * u.deg,
            height=self.elevation_m * u.m,
        )

        tz = self.timezone or get_tz_name(
            latitude=self.latitude, longitude=self.longitude
        )
        return Observer(location=location, name=self.name, timezone=tz)

    def is_blocked(self, az: float, alt: float) -> bool:
        """
        returns true if the horizon masks block the target
        :param az:
        :param alt:
        :return:
        """
        return bool(self.is_blocked_vectorized(az, alt)[0])

    def is_blocked_vectorized(
        self,
        az: npt.ArrayLike,
        alt: npt.ArrayLike,
    ) -> np.ndarray:
        """
        vectorized version of is_blocked
        :param az:
        :param alt:
        :return:
        """
        az_arr = np.atleast_1d(az)
        alt_arr = np.atleast_1d(alt)

        if not self.horizon_mask:
            return alt_arr < 0

        mask = np.array(sorted(self.horizon_mask))
        mask_azs = mask[:, 0]
        mask_alts = mask[:, 1]

        interpolated_alts = np.interp(
            az_arr,
            mask_azs,
            mask_alts,
            period=360,
        )

        return alt_arr < interpolated_alts
