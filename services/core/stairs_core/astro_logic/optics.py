from math import atan, pi


def _calculate_fov(
    focal_length_mm: float,
    sensor_px: int,
    pixel_pitch_um: float,
) -> float:
    h = sensor_px * pixel_pitch_um / 1000
    fov = 2 * atan(h / (2 * focal_length_mm)) * 60 * 180 / pi
    return fov


def calculate_fov_rectangle(
    focal_length_mm: float, sensor_px: tuple[int, int], pixel_pitch_um: float
) -> tuple[float, float]:
    fov_x = _calculate_fov(
        focal_length_mm=focal_length_mm,
        sensor_px=sensor_px[0],
        pixel_pitch_um=pixel_pitch_um,
    )
    fov_y = _calculate_fov(
        focal_length_mm=focal_length_mm,
        sensor_px=sensor_px[1],
        pixel_pitch_um=pixel_pitch_um,
    )
    return fov_x, fov_y
