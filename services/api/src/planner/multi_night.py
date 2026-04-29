import logging
from datetime import UTC

import astropy.units as u
import numpy as np
import pandas as pd
from astropy.coordinates import AltAz, get_body
from astropy.time import Time, TimeDelta
from src.api.schemas import ForecastDay
from src.astro_logic.scoring import (
    calculate_bortle_multiplier,
    calculate_weather_score_vectorized,
)
from src.astro_logic.visibility import get_astronomical_night
from src.planner.planner_models import ObservationLocation
from src.utils.cache import FileCache
from src.utils.ephemeris_manager import EphemerisManager
from src.utils.geo_cache import GeoCacheService
from src.utils.weather import WeatherService

logger = logging.getLogger(__name__)


class MultiNightPlanner:
    def __init__(self, location: ObservationLocation):
        self.location = location

    def calculate_night_score(
        self,
        night_start: Time,
        night_end: Time,
        weather_range: list | None = None,
    ) -> dict:
        observer = self.location.get_observer()
        duration_hours = (night_end - night_start).to(u.hour).value

        # considering 15-minute slots
        num_slots = int(duration_hours * 4)

        # no slots means no score ... don't bother
        if num_slots == 0:
            return {
                "total_dark_hours": 0.0,
                "effective_hours": 0.0,
                "quality_score": 0,
                "relative_quality": 0.0,
                "absolute_quality": 0.0,
            }

        times = night_start + np.arange(num_slots) * TimeDelta(15 * u.minute)

        ephemeris_manager = EphemerisManager()
        cached_moon_df = ephemeris_manager.get_cached_moon_qualities(
            latitude=self.location.latitude,
            longitude=self.location.longitude,
            night_start=night_start,
        )

        if cached_moon_df is not None and len(cached_moon_df) == num_slots:
            moon_qualities = cached_moon_df["moon_quality"].values
        else:
            moon_coords = get_body(body="moon", time=times, location=observer.location)
            altaz_frame = AltAz(obstime=times, location=observer.location)
            moon_alts = moon_coords.transform_to(altaz_frame).alt.deg
            mid_time = night_start + (night_end - night_start) / 2
            moon_illumination = observer.moon_illumination(mid_time)
            moon_qualities = 1.0 - (
                moon_illumination * 0.5 * (np.maximum(0, moon_alts) / 90.0)
            )

        weather_multipliers = np.ones(num_slots, dtype=float)
        if weather_range:
            weather_df = pd.DataFrame(weather_range)
            weather_df["ts"] = pd.to_datetime(weather_df["timestamp"]).dt.tz_convert(
                UTC
            )

            for i, t in enumerate(times):
                dt = t.to_datetime(timezone=UTC)
                past = weather_df[weather_df["ts"] <= dt]
                weather_point = past.iloc[-1] if not past.empty else weather_df.iloc[0]
                weather_multipliers[i] = calculate_weather_score_vectorized(
                    weather_point.get("cloud_cover_pct", 0),
                    weather_point.get("humidity_pct", 0),
                    weather_point.get("seeing"),
                )[0]

        quality_array = moon_qualities * weather_multipliers

        kernel = np.ones(4, dtype=float) / 4.0
        quality_bar = np.convolve(quality_array, kernel, mode="same")

        weights = quality_bar**2.0

        effective_hours = np.sum(quality_array * weights) * 0.25

        avg_weather = (
            np.mean(weather_multipliers) if len(weather_multipliers) > 0 else 1.0
        )

        note = (
            "Mostly Cloudy"
            if avg_weather < 0.2
            else "Partly Cloudy"
            if avg_weather < 0.6
            else None
        )

        relative_quality = (
            (effective_hours / duration_hours) * 100.0 if duration_hours > 0 else 0
        )

        bortle_multiplier = calculate_bortle_multiplier(self.location.bortle_scale)
        absolute_quality = relative_quality * bortle_multiplier

        return {
            "total_dark_hours": round(duration_hours, 2),
            "effective_hours": round(float(effective_hours), 2),
            "quality_score": int(relative_quality),
            "relative_quality": round(relative_quality, 1),
            "absolute_quality": round(absolute_quality, 1),
            "note": note,
        }

    def generate_forecast(
        self,
        days: int = 14,
        start_time: Time | None = None,
        weather_service: WeatherService | None = None,
    ) -> list[ForecastDay]:
        """
        generates visibility forecasts for the given number of days
        :param days:
        :param start_time:
        :param weather_service:
        :return:
        """
        if start_time is None:
            start_time = Time.now()

        observer = self.location.get_observer()

        try:
            current_search_time = observer.noon(start_time, which="nearest")
        except (ValueError, AttributeError):
            current_search_time = start_time

        loc_key = GeoCacheService.get_location_key(
            latitude=self.location.latitude, longitude=self.location.longitude
        )
        date_str = current_search_time.to_datetime(timezone=UTC).date().isoformat()
        cache_key = f"forecast_v2_{loc_key}_{date_str}_{days}"

        cache = FileCache()
        cached_data = cache.get(cache_key, ttl_seconds=3600)
        if cached_data:
            return [ForecastDay(**day) for day in cached_data]

        full_weather_range = []
        if weather_service:
            try:
                range_end = current_search_time + TimeDelta((days + 1) * u.day)
                full_weather_range = weather_service.get_forecast_range(
                    latitude=self.location.latitude,
                    longitude=self.location.longitude,
                    start_dt=current_search_time.to_datetime(timezone=UTC),
                    end_dt=range_end.to_datetime(timezone=UTC),
                )
            except Exception as e:
                logger.error(f"error fetching multi-night weather forecast: {e}")

        forecast = []
        loop_time = current_search_time

        for _i in range(days):
            night = get_astronomical_night(observer, loop_time)

            if night:
                night_start, night_end = night

                day_data = self.calculate_night_score(
                    night_start, night_end, full_weather_range
                )

                day_data["date"] = (
                    night_start.to_datetime(timezone=UTC).date().isoformat()
                )
                day_data["astronomical_night_start"] = night_start.to_datetime(
                    timezone=UTC
                )
                day_data["astronomical_night_end"] = night_end.to_datetime(timezone=UTC)
                forecast.append(ForecastDay(**day_data))

                loop_time = night_end + TimeDelta(1 * u.hour)
            else:
                forecast.append(
                    ForecastDay(
                        date=loop_time.to_datetime(timezone=UTC).date().isoformat(),
                        total_dark_hours=0.0,
                        effective_hours=0.0,
                        quality_score=0,
                        relative_quality=0.0,
                        absolute_quality=0.0,
                        note="no astronomical night found",
                    )
                )
                loop_time += TimeDelta(1 * u.day)

        cache.set(cache_key, [day.model_dump(mode="json") for day in forecast])

        return forecast
