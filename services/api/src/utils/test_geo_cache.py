from unittest import TestCase

from utils.geo_cache import GeoCacheService


class GeoCacheServiceTest(TestCase):
    def test_get_location_key(self):
        self.assertEqual(
            GeoCacheService.get_location_key(1, -90.895), "lat_1.00_lon_-90.89"
        )
        self.assertEqual(
            GeoCacheService.get_location_key(1, -90.896), "lat_1.00_lon_-90.90"
        )
