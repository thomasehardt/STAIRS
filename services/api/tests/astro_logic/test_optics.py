from unittest import TestCase

from src.astro_logic.optics import calculate_fov_rectangle

def fov_for_sensor(
    sensor_params: dict
) -> tuple[float, float]:
    return calculate_fov_rectangle(**sensor_params)

class Test(TestCase):
    s50 = {
        "focal_length_mm": 250,
        "sensor_px": (1920, 1080),
        "pixel_pitch_um": 2.9,
    }
    expected_s50_fov_x, expected_s50_fov_y = [ 76.56, 43.06]
 
    s30 = {
        "focal_length_mm": 150,
        "sensor_px": (1920, 1080),
        "pixel_pitch_um": 2.9,
    }
    expected_s30_fov_x, expected_s30_fov_y = [127.59, 71.78]

    s30_pro = {
        "focal_length_mm": 160,
        "sensor_px": (3840, 2160),
        "pixel_pitch_um": 2.9,
    }
    expected_s30_pro_fov_x, expected_s30_pro_fov_y = [239.17, 134.57]


    def test_calculate_fov(self) -> None:
        s50_fov_x, s50_fov_y = fov_for_sensor(self.s50)
        self.assertAlmostEqual(s50_fov_x, self.expected_s50_fov_x, delta=0.01)
        self.assertAlmostEqual(s50_fov_y, self.expected_s50_fov_y, delta=0.01)

        s30_fov_x, s30_fov_y = fov_for_sensor(self.s30)
        self.assertAlmostEqual(s30_fov_x, self.expected_s30_fov_x, delta=0.01)
        self.assertAlmostEqual(s30_fov_y, self.expected_s30_fov_y, delta=0.01)

        s30_pro_fov_x, s30_pro_fov_y = fov_for_sensor(self.s30_pro)
        self.assertAlmostEqual(s30_pro_fov_x, self.expected_s30_pro_fov_x, delta=0.01)
        self.assertAlmostEqual(s30_pro_fov_y, self.expected_s30_pro_fov_y, delta=0.01)
