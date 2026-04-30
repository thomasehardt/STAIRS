from unittest import TestCase

import astropy.units as u
import numpy as np
from astroplan import Observer
from astropy.coordinates import SkyCoord
from astropy.time import Time
from src.astro_logic.visibility import (
    find_visible_window,
    get_moon_quality,
    get_peak_altitudes,
)

orion_nebula = {"ra": "05h35m17s", "dec": "−05d23m28s", "expected_peak": 33.1}

andromeda_galaxy = {
    "ra": "00h42m44s",
    "dec": "+41d16m09s",
    "expected_peak": 75.9,
}

sagittarius_cluster = {
    "ra": "18h36m",
    "dec": "-23d54m",
    "expected_peak": -28.2,
}

london = Observer(
    latitude=51.5072 * u.deg,
    longitude=0.1276 * u.deg,
)


class Test(TestCase):
    def test_get_peak_altitude(self) -> None:
        observer = london

        start_time = Time("2026-01-15T18:00:00Z")
        end_time = start_time + 4 * u.hour
        time_range = (start_time, end_time)

        targets = SkyCoord(
            ra=[
                orion_nebula["ra"],
                andromeda_galaxy["ra"],
                sagittarius_cluster["ra"],
            ],
            dec=[
                orion_nebula["dec"],
                andromeda_galaxy["dec"],
                sagittarius_cluster["dec"],
            ],
            frame="icrs",
        )

        calculated_peaks = get_peak_altitudes(
            observer=observer,
            time_range=time_range,
            targets=targets,
        )

        self.assertEqual(calculated_peaks.shape, (3,))
        self.assertTrue(np.issubdtype(calculated_peaks.dtype, np.floating))

        self.assertTrue(
            np.all(calculated_peaks >= -90) and np.all(calculated_peaks <= 90)
        )

        expected_peaks = np.array(
            [
                orion_nebula["expected_peak"],
                andromeda_galaxy["expected_peak"],
                sagittarius_cluster["expected_peak"],
            ]
        )

        np.testing.assert_allclose(calculated_peaks, expected_peaks, atol=0.5)

    def test_get_peak_altitudes_single_target(self) -> None:
        observer = london

        start_time = Time("2026-01-15T18:00:00Z")
        end_time = start_time + 4 * u.hour
        time_range = (start_time, end_time)

        target = SkyCoord(
            ra=orion_nebula["ra"],
            dec=orion_nebula["dec"],
            frame="icrs",
        )

        calculated_peaks = get_peak_altitudes(
            observer=observer,
            time_range=time_range,
            targets=target,
        )

        self.assertEqual(calculated_peaks.shape, (1,))
        self.assertTrue(np.issubdtype(calculated_peaks.dtype, np.floating))
        self.assertGreaterEqual(calculated_peaks[0], -90.0)
        self.assertLessEqual(calculated_peaks[0], 90.0)

        np.testing.assert_allclose(
            calculated_peaks[0],
            orion_nebula["expected_peak"],
            atol=0.5,
        )

    def test_find_visible_window(self) -> None:
        observer = london

        start_time = Time("2026-01-15T18:00:00Z")
        end_time = start_time + 4 * u.hour
        time_range = (start_time, end_time)

        target = SkyCoord(
            ra=orion_nebula["ra"],
            dec=orion_nebula["dec"],
            frame="icrs",
        )

        visible_window = find_visible_window(
            observer=observer,
            time_range=time_range,
            target=target,
            min_alt=30,
        )
        visible_start = (
            visible_window[0].to_datetime() if visible_window is not None else None
        )
        visible_end = (
            visible_window[1].to_datetime() if visible_window is not None else None
        )

        self.assertIsNotNone(visible_window)
        self.assertGreaterEqual(visible_start, start_time)
        self.assertEqual(visible_end, end_time)

        expected_start_rough = Time("2026-01-15T20:30:00Z")
        assert visible_window is not None
        self.assertAlmostEqual(
            visible_window[0],
            expected_start_rough,
            delta=15 * u.minute,
        )

        end_time = start_time + 10 * u.hour
        visible_window = find_visible_window(
            observer=observer,
            time_range=(start_time, end_time),
            target=target,
            min_alt=30,
        )
        visible_start = (
            visible_window[0].to_datetime() if visible_window is not None else None
        )
        visible_end = (
            visible_window[1].to_datetime() if visible_window is not None else None
        )

        expected_end_rough = Time("2026-01-15T23:30:00Z")
        self.assertIsNotNone(visible_window)
        self.assertGreaterEqual(visible_start, start_time)
        self.assertLessEqual(visible_end, end_time)
        assert visible_window is not None
        self.assertAlmostEqual(
            visible_window[-1], expected_end_rough, delta=15 * u.minute
        )

    def test_get_moon_quality(self) -> None:
        observer = london

        # new moon = 1.0 quality score
        new_moon_time = Time("2024-04-08T04:05:00Z")
        quality = get_moon_quality(
            observer=observer,
            time=new_moon_time,
        )
        self.assertAlmostEqual(quality, 1.0, places=2)

        # full moon overhead = 0.5 quality score
        observer_90_degree_full_moon = Observer(
            latitude=1.2 * u.deg,
            longitude=-106.3 * u.deg,
        )
        full_moon_zenith = Time("2024-03-25T07:13:00Z")
        quality = get_moon_quality(
            observer=observer_90_degree_full_moon,
            time=full_moon_zenith,
        )
        self.assertAlmostEqual(quality, 0.51, places=2)

        # below horizon = 1.0 quality score
        moon_below_horizon_time = Time("2024-04-01T01:00:00Z")
        quality = get_moon_quality(
            observer=observer,
            time=moon_below_horizon_time,
        )
        self.assertAlmostEqual(quality, 1.0, places=2)
