import unittest
from unittest.mock import MagicMock, TestCase
import numpy as np
import pandas as pd

# Mock classes to avoid dependency issues
class MockTelescopeProfile:
    def __init__(self, fov_min=1.0):
        self.fov_min = fov_min

class MockForecastData:
    def __init__(self, cloud_cover_percent=0, humidity=0, seeing=None):
        self.cloud_cover_percent = cloud_cover_percent
        self.humidity = humidity
        self.seeing = seeing

    def get(self, key, default=None):
        return getattr(self, key, default)

class MockAltAz:
    def __init__(self, alt_deg, az_deg):
        self.alt = MagicMock()
        self.alt.deg = alt_deg
        self.az = MagicMock()
        self.az.deg = az_deg

class MockTarget:
    def __init__(self, angular_size=None, target_type="Other", magnitude=20.0, size_maj=None, size_min=None):
        self.angular_size = angular_size
        self.target_type = target_type
        self.magnitude = magnitude
        self.size_maj = size_maj
        self.size_min = size_min

    def model_dump(self):
        return self.__dict__

    def get(self, key, default=None):
        return getattr(self, key, default)

import src.astro_logic.scoring as scoring

class TestScoring(TestCase):
    def test_get_target_size_fov(self):
        # Mock target object with angular_size attribute (Pydantic-like)
        mock_target_attr = MockTarget(angular_size=5.0, target_type="Galaxy")
        self.assertEqual(scoring.get_target_size_fov(mock_target_attr), 5.0)

        # Mock target object with get method (Pandas Series-like)
        mock_target_get = MockTarget(angular_size=10.0, target_type="Open Cluster")
        self.assertEqual(scoring.get_target_size_fov(mock_target_get), 10.0)

        # Test with None angular_size and target_type
        mock_target_none_size = MockTarget(angular_size=None, target_type="Emission Nebula")
        self.assertEqual(scoring.get_target_size_fov(mock_target_none_size), 30.0)

        mock_target_none_all = MockTarget(angular_size=None, target_type="Other")
        self.assertEqual(scoring.get_target_size_fov(mock_target_none_all), 1.0)

        # Test with empty size array
        mock_target_empty_size = MockTarget(angular_size=np.array([]), target_type="Star")
        self.assertEqual(scoring.get_target_size_fov(mock_target_empty_size), 0.01)

        # Test with Pandas Series
        mock_series = pd.Series({
            "angular_size": 15.0,
            "target_type": "Globular Cluster"
        })
        self.assertEqual(scoring.get_target_size_fov(mock_series), 15.0)

        mock_series_none = pd.Series({
            "target_type": "Galaxy"
        })
        self.assertEqual(scoring.get_target_size_fov(mock_series_none), 8.0)

    def test_calculate_altitude_score(self):
        max_altitudes = np.array([40.0, 60.0, 80.0, 90.0])
        min_alt = 30.0
        expected_scores = np.array([
            (40.0 - 30.0) / (90.0 - 30.0) * 100.0,
            (60.0 - 30.0) / (90.0 - 30.0) * 100.0,
            (80.0 - 30.0) / (90.0 - 30.0) * 100.0,
            (90.0 - 30.0) / (90.0 - 30.0) * 100.0
        ])
        np.testing.assert_allclose(scoring.calculate_altitude_score(max_altitudes, min_alt), expected_scores, atol=1e-4)

        max_altitudes_low = np.array([10.0, 29.9])
        expected_scores_low = np.array([0.0, 0.0])
        np.testing.assert_allclose(scoring.calculate_altitude_score(max_altitudes_low, min_alt), expected_scores_low, atol=1e-4)

        min_alt_high = 50.0
        max_altitudes_high_min = np.array([60.0, 70.0, 90.0])
        expected_scores_high_min = np.array([
            (60.0 - 50.0) / (90.0 - 50.0) * 100.0,
            (70.0 - 50.0) / (90.0 - 50.0) * 100.0,
            (90.0 - 50.0) / (90.0 - 50.0) * 100.0
        ])
        np.testing.assert_allclose(scoring.calculate_altitude_score(max_altitudes_high_min, min_alt_high), expected_scores_high_min, atol=1e-4)

        np.testing.assert_array_equal(scoring.calculate_altitude_score([]), np.array([]))

        max_altitudes_clip = np.array([-10.0, 95.0])
        expected_scores_clip = np.array([0.0, 100.0])
        np.testing.assert_allclose(scoring.calculate_altitude_score(max_altitudes_clip, min_alt), expected_scores_clip, atol=1e-4)

    def test_calculate_sb_score(self):
        sbs = np.array([18.0, 20.0, 22.0, 24.0])
        expected_scores = np.array([
            (24.0 - 18.0) / (24.0 - 18.0) * 100.0,
            (24.0 - 20.0) / (24.0 - 18.0) * 100.0,
            (24.0 - 22.0) / (24.0 - 18.0) * 100.0,
            (24.0 - 24.0) / (24.0 - 18.0) * 100.0
        ])
        np.testing.assert_allclose(scoring.calculate_sb_score(sbs), expected_scores, atol=1e-4)

        sbs_clip = np.array([10.0, 30.0])
        expected_scores_clip = np.array([100.0, 0.0])
        np.testing.assert_allclose(scoring.calculate_sb_score(sbs_clip), expected_scores_clip, atol=1e-4)

        np.testing.assert_array_equal(scoring.calculate_sb_score([]), np.array([]))

    def test_calculate_weather_score_vectorized(self):
        clouds = np.array([5.0])
        humidity = np.array([50.0])
        seeing = np.array([1.5])
        np.testing.assert_allclose(scoring.calculate_weather_score_vectorized(clouds, humidity, seeing), np.array([0.95]), atol=1e-4)

        clouds_bad = np.array([70.0])
        humidity_mod = np.array([70.0])
        seeing_bad = np.array([5.0])
        np.testing.assert_allclose(scoring.calculate_weather_score_vectorized(clouds_bad, humidity_mod, seeing_bad), np.array([0.0]), atol=1e-4)

        clouds_linear = np.array([30.0])
        humidity_linear = np.array([90.0])
        seeing_linear = np.array([3.0])
        np.testing.assert_allclose(scoring.calculate_weather_score_vectorized(clouds_linear, humidity_linear, seeing_linear), np.array([0.34]), atol=1e-4)

        clouds_ok = np.array([15.0])
        humidity_ok = np.array([60.0])
        np.testing.assert_allclose(scoring.calculate_weather_score_vectorized(clouds_ok, humidity_ok, seeing=None), np.array([0.875]), atol=1e-4)

        clouds_multi = np.array([5.0, 30.0, 70.0])
        humidity_multi = np.array([50.0, 90.0, 70.0])
        seeing_multi = np.array([1.5, 3.0, 5.0])
        expected_multi = np.array([0.95, 0.34, 0.0])
        np.testing.assert_allclose(scoring.calculate_weather_score_vectorized(clouds_multi, humidity_multi, seeing_multi), expected_multi, atol=1e-4)

        np.testing.assert_array_equal(scoring.calculate_weather_score_vectorized([], [], []), np.array([]))
        np.testing.assert_array_equal(scoring.calculate_weather_score_vectorized([], []), np.array([]))

    def test_calculate_weather_score(self):
        self.assertEqual(scoring.calculate_weather_score(None), 1.0)

        weather_data_good = MockForecastData(cloud_cover_percent=10, humidity=50, seeing=1.0)
        self.assertAlmostEqual(scoring.calculate_weather_score(weather_data_good), 1.0)

        weather_data_bad = MockForecastData(cloud_cover_percent=60, humidity=90, seeing=3.0)
        self.assertAlmostEqual(scoring.calculate_weather_score(weather_data_bad), 0.0)

        weather_data_missing = MockForecastData()
        self.assertAlmostEqual(scoring.calculate_weather_score(weather_data_missing), 1.0)

    def test_calculate_sqs_vectorized(self):
        alts = np.array([45.0, 30.0])
        azs = np.array([90.0, 180.0])
        expected = np.array([100.0, 80.0])
        np.testing.assert_allclose(scoring.calculate_sqs_vectorized(alts, azs, 1.0, 1.0), expected, atol=1e-4)

        alts_zenith = np.array([87.0, 89.0, 85.0])
        azs_meridian = np.array([180.0, 180.0, 180.0])
        expected_zenith_meridian = np.array([64.0, 48.0, 80.0])
        np.testing.assert_allclose(scoring.calculate_sqs_vectorized(alts_zenith, azs_meridian, 1.0, 1.0), expected_zenith_meridian, atol=1e-4)

        alts_combo = np.array([86.0])
        azs_combo = np.array([178.0])
        np.testing.assert_allclose(scoring.calculate_sqs_vectorized(alts_combo, azs_combo, 0.5, 0.9), np.array([32.4]), atol=1e-4)

        alts_clip = np.array([-10.0, 95.0])
        azs_clip = np.array([0.0, 180.0])
        expected_clip = np.array([100.0, 0.0])
        np.testing.assert_allclose(scoring.calculate_sqs_vectorized(alts_clip, azs_clip, 1.0, 1.0), expected_clip, atol=1e-4)

        np.testing.assert_array_equal(scoring.calculate_sqs_vectorized([], [], 1.0, 1.0), np.array([]))

    def test_calculate_sqs(self):
        self.assertAlmostEqual(scoring.calculate_sqs(current_altaz=None, weather_data=None, moon_multiplier=1.0), 100.0)

        mock_altaz_high = MockAltAz(alt_deg=45.0, az_deg=90.0)
        self.assertAlmostEqual(scoring.calculate_sqs(current_altaz=mock_altaz_high, weather_data=None, moon_multiplier=1.0), 100.0)

        mock_altaz_low = MockAltAz(alt_deg=87.0, az_deg=180.0)
        weather_data_bad = MockForecastData(cloud_cover_percent=70, humidity=90, seeing=3.0)
        self.assertAlmostEqual(scoring.calculate_sqs(current_altaz=mock_altaz_low, weather_data=weather_data_bad, moon_multiplier=1.0), 0.0)

        weather_data_good = MockForecastData(cloud_cover_percent=10, humidity=50, seeing=1.0)
        self.assertAlmostEqual(scoring.calculate_sqs(current_altaz=MockAltAz(alt_deg=60.0, az_deg=100.0), weather_data=weather_data_good, moon_multiplier=0.5), 50.0)

    def test_calculate_bortle_multiplier(self):
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(1), 1.0)
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(5), 0.55)
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(9), 0.05)
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(None), 1.0)
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(0), 1.0)
        self.assertAlmostEqual(scoring.calculate_bortle_multiplier(10), 1.0)

    def test_calculate_oss_vectorized(self):
        targets_df = pd.DataFrame({
            "magnitude": [15.0, 18.0, 12.0],
            "peak_alt": [60.0, 75.0, 40.0],
            "size_maj": [5.0, 1.0, 10.0],
            "size_min": [5.0, 1.0, 8.0],
            "target_type": ["Galaxy", "Star", "Open Cluster"]
        })
        profile = MockTelescopeProfile(fov_min=0.5)
        min_target_altitude = 30.0

        oss_rel_expected = np.array([15.0, 22.5, 5.0])
        aqs_abs_expected = np.array([15.0, 22.5, 5.0])

        oss_rel, aqs_abs = scoring.calculate_oss_vectorized(targets_df, profile, min_target_altitude)
        np.testing.assert_allclose(oss_rel, oss_rel_expected, atol=1e-4)
        np.testing.assert_allclose(aqs_abs, aqs_abs_expected, atol=1e-4)

        bortle_scale_7 = 7
        b_mult_7 = scoring.calculate_bortle_multiplier(bortle_scale_7)
        aqs_abs_expected_bortle7 = aqs_abs_expected * b_mult_7

        oss_rel_bortle7, aqs_abs_bortle7 = scoring.calculate_oss_vectorized(targets_df, profile, min_target_altitude, bortle_scale=bortle_scale_7)
        np.testing.assert_allclose(oss_rel_bortle7, oss_rel_expected, atol=1e-4)
        np.testing.assert_allclose(aqs_abs_bortle7, aqs_abs_expected_bortle7, atol=1e-4)

        targets_df_size_attr = pd.DataFrame({
            "angular_size": [5.0],
            "magnitude": [15.0],
            "peak_alt": [60.0],
            "target_type": ["Galaxy"]
        })
        oss_rel_missing, aqs_abs_missing = scoring.calculate_oss_vectorized(targets_df_size_attr, profile, min_target_altitude)
        np.testing.assert_allclose(oss_rel_missing, np.array([15.0]), atol=1e-4)
        np.testing.assert_allclose(aqs_abs_missing, np.array([15.0]), atol=1e-4)

        empty_df = pd.DataFrame(columns=["magnitude", "peak_alt", "size_maj", "size_min", "target_type"])
        oss_rel_empty, aqs_abs_empty = scoring.calculate_oss_vectorized(empty_df, profile, min_target_altitude)
        self.assertEqual(oss_rel_empty.shape, (0,))
        self.assertEqual(aqs_abs_empty.shape, (0,))

    def test_calculate_oss(self):
        profile = MockTelescopeProfile(fov_min=0.5)
        min_target_altitude = 30.0
        max_altitude = 60.0
        bortle_scale = 7

        target_dict = {
            "angular_size": 5.0,
            "target_type": "Galaxy",
            "magnitude": 15.0,
            "size_maj": 5.0,
            "size_min": 5.0
        }
        expected_oss_rel_dict = 15.0
        expected_aqs_abs_dict = 3.0

        oss_rel_dict, aqs_abs_dict = scoring.calculate_oss(target_dict, profile, max_altitude, min_target_altitude, bortle_scale=bortle_scale)
        self.assertAlmostEqual(oss_rel_dict, expected_oss_rel_dict)
        self.assertAlmostEqual(aqs_abs_dict, expected_aqs_abs_dict)

        target_model = MockTarget(angular_size=5.0, target_type="Galaxy", magnitude=15.0, size_maj=5.0, size_min=5.0)
        oss_rel_model, aqs_abs_model = scoring.calculate_oss(target_model, profile, max_altitude, min_target_altitude, bortle_scale=bortle_scale)
        self.assertAlmostEqual(oss_rel_model, expected_oss_rel_dict)
        self.assertAlmostEqual(aqs_abs_model, expected_aqs_abs_dict)

        target_dict_only_angular = {
            "angular_size": 1.0,
            "target_type": "Star",
            "magnitude": 18.0,
        }
        oss_rel_angular, aqs_abs_angular = scoring.calculate_oss(target_dict_only_angular, profile, max_altitude, min_target_altitude, bortle_scale=bortle_scale)
        self.assertAlmostEqual(oss_rel_angular, 15.0)
        self.assertAlmostEqual(aqs_abs_angular, 3.0)

        target_dict_fallback = {
            "target_type": "Emission Nebula",
            "magnitude": 15.0,
            "peak_alt": 75.0
        }
        oss_rel_fallback, aqs_abs_fallback = scoring.calculate_oss(target_dict_fallback, profile, max_altitude, min_target_altitude, bortle_scale=bortle_scale)
        self.assertAlmostEqual(oss_rel_fallback, 15.0)
        self.assertAlmostEqual(aqs_abs_fallback, 3.0)

        class MockTargetWithToDict:
            def __init__(self, data):
                self.data = data
            def to_dict(self):
                return self.data
        target_to_dict = MockTargetWithToDict({
            "angular_size": 5.0, "target_type": "Galaxy", "magnitude": 15.0,
            "size_maj": 5.0, "size_min": 5.0
        })
        oss_rel_todict, aqs_abs_todict = scoring.calculate_oss(target_to_dict, profile, max_altitude, min_target_altitude, bortle_scale=bortle_scale)
        self.assertAlmostEqual(oss_rel_todict, expected_oss_rel_dict)
        self.assertAlmostEqual(aqs_abs_todict, expected_aqs_abs_dict)

    def test_calculate_final_score(self):
        profile = MockTelescopeProfile(fov_min=0.5)
        min_target_altitude = 30.0
        max_altitude = 60.0
        bortle_scale = 7
        moon_multiplier = 0.5

        target_data = {
            "angular_size": 5.0, "target_type": "Galaxy", "magnitude": 15.0,
            "size_maj": 5.0, "size_min": 5.0
        }

        final_rel_1, final_abs_1 = scoring.calculate_final_score(
            target_data, profile, max_altitude, min_target_altitude,
            MockAltAz(alt_deg=45.0, az_deg=90.0), MockForecastData(cloud_cover_percent=10, humidity=50, seeing=1.0), bortle_scale=None, moon_multiplier=moon_multiplier
        )
        self.assertAlmostEqual(final_rel_1, 7.5)
        self.assertAlmostEqual(final_abs_1, 7.5)

        final_rel_2, final_abs_2 = scoring.calculate_final_score(
            target_data, profile, max_altitude, min_target_altitude,
            MockAltAz(alt_deg=87.0, az_deg=180.0), MockForecastData(cloud_cover_percent=60, humidity=90, seeing=3.0), bortle_scale=None, moon_multiplier=1.0
        )
        self.assertAlmostEqual(final_rel_2, 0.0)
        self.assertAlmostEqual(final_abs_2, 0.0)

        final_rel_3, final_abs_3 = scoring.calculate_final_score(
            target_data, profile, max_altitude, min_target_altitude,
            MockAltAz(alt_deg=45.0, az_deg=90.0), MockForecastData(cloud_cover_percent=10, humidity=50, seeing=1.0), bortle_scale=bortle_scale, moon_multiplier=1.0
        )
        self.assertAlmostEqual(final_rel_3, 15.0)
        self.assertAlmostEqual(final_abs_3, 3.0)

        final_rel_4, final_abs_4 = scoring.calculate_final_score(
            target_data, profile, max_altitude, min_target_altitude,
            MockAltAz(alt_deg=87.0, az_deg=180.0), MockForecastData(cloud_cover_percent=60, humidity=90, seeing=3.0), bortle_scale=bortle_scale, moon_multiplier=1.0
        )
        self.assertAlmostEqual(final_rel_4, 0.0)
        self.assertAlmostEqual(final_abs_4, 0.0)

        final_rel_5, final_abs_5 = scoring.calculate_final_score(
            target_data, profile, max_altitude, min_target_altitude,
            current_altaz=None, weather_data=None, bortle_scale=bortle_scale, moon_multiplier=1.0
        )
        self.assertAlmostEqual(final_rel_5, 15.0)
        self.assertAlmostEqual(final_abs_5, 3.0)

if __name__ == "__main__":
    unittest.main()
