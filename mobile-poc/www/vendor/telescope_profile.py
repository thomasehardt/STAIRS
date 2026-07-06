# Mobile port note: extracted verbatim from
# services/api/src/catalog/catalog_models.py (TelescopeProfile class only -
# that file's other ~300 lines define unrelated catalog-row models we don't
# need on-device). The class body itself is untouched.
from typing import Annotated

from pydantic import BaseModel, Field
from optics import calculate_fov_rectangle

PositiveInt = Annotated[int, Field(gt=0)]
PositiveFloat = Annotated[float, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1, pattern=r".*\S.*")]


class TelescopeProfile(BaseModel):
    """
    represents a hardware configuration for a smart telescope
    """

    name: NonEmptyStr
    aperture_mm: PositiveInt
    focal_length_mm: PositiveInt
    sensor_x: PositiveInt
    sensor_y: PositiveInt
    pixel_pitch_um: PositiveFloat
    read_noise_e: PositiveFloat = 1.5  # default for modern CMOS
    quantum_efficiency: float = 0.8  # 80% QE common for modern sensors

    def calculate_fov(self) -> tuple[float, float]:
        """
        calculates FOV in arcmins based on the sensor size and pixel pitch
        :return:
        """
        return calculate_fov_rectangle(
            focal_length_mm=self.focal_length_mm,
            sensor_px=(self.sensor_x, self.sensor_y),
            pixel_pitch_um=self.pixel_pitch_um,
        )

    @property
    def fov_min(self) -> float:
        """
        returns the minimum dimension of the FOV (our bottleneck here)
        :return:
        """
        return min(self.calculate_fov())
