from __future__ import annotations

import json
import logging
import os
from typing import Annotated, Any, Literal, get_args

import pandas as pd
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    FilePath,
    field_validator,
    model_validator,
)
from src.astro_logic.optics import calculate_fov_rectangle
from src.catalog.units import Degrees, Hours, LightYears

logger = logging.getLogger(__name__)

PositiveInt = Annotated[int, Field(gt=0)]
PositiveFloat = Annotated[float, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1, pattern=r".*\S.*")]


class TelescopeProfile(BaseModel):
    """
    represents a hardware configuration for a smart telescope
    """

    name: str = NonEmptyStr
    aperture_mm: int = PositiveInt
    focal_length_mm: int = PositiveInt
    sensor_x: int = PositiveInt
    sensor_y: int = PositiveInt
    pixel_pitch_um: float = PositiveFloat

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


# Expanded to include more generic types found in NGC/IC catalogs
TargetClass = Literal[
    "Asterism",
    "Dark Nebula",
    "Double star",
    "Emission Nebula",
    "Galaxy Group",
    "Galaxy",
    "Globular Cluster",
    "Open Cluster",
    "Planetary Nebula",
    "Quasar",
    "Reflection Nebula",
    "Star Cloud",
    "Star",
    "Star Cluster",
    "Stellar Association",
    "Supernova remnant",
    "Other",
    "Nova",
    "Nebula",
    "Cluster",
]

Constellation = Literal[
    "Andromeda",
    "Antlia",
    "Apus",
    "Aquarius",
    "Aquila",
    "Ara",
    "Aries",
    "Auriga",
    "Bootes",
    "Caelum",
    "Camelopardalis",
    "Cancer",
    "Canes Venatici",
    "Canis Major",
    "Canis Minor",
    "Capricornus",
    "Carina",
    "Cassiopeia",
    "Centaurus",
    "Cepheus",
    "Cetus",
    "Chamaeleon",
    "Circinus",
    "Columba",
    "Coma Berenices",
    "Corona Australis",
    "Corona Borealis",
    "Corvus",
    "Crater",
    "Crux",
    "Cygnus",
    "Delphinus",
    "Dorado",
    "Draco",
    "Equuleus",
    "Eridanus",
    "Fornax",
    "Gemini",
    "Grus",
    "Hercules",
    "Horologium",
    "Hydra",
    "Hydrus",
    "Indus",
    "Lacerta",
    "Leo",
    "Leo Minor",
    "Lepus",
    "Libra",
    "Lupus",
    "Lynx",
    "Lyra",
    "Mensa",
    "Microscopium",
    "Monoceros",
    "Musca",
    "Norma",
    "Octans",
    "Ophiuchus",
    "Orion",
    "Pavo",
    "Pegasus",
    "Perseus",
    "Phoenix",
    "Pictor",
    "Pisces",
    "Piscis Austrinus",
    "Puppis",
    "Pyxis",
    "Reticulum",
    "Sagitta",
    "Sagittarius",
    "Scorpius",
    "Sculptor",
    "Scutum",
    "Serpens",
    "Sextans",
    "Taurus",
    "Telescopium",
    "Triangulum",
    "Triangulum Australe",
    "Tucana",
    "Ursa Major",
    "Ursa Minor",
    "Vela",
    "Virgo",
    "Volans",
    "Vulpecula",
    "Other",
]

Season = Literal["winter", "spring", "summer", "autumn"]

# angular size is given as a tuple of 0, 1, or 2 values
AngularSize = tuple[()] | tuple[Degrees] | tuple[Degrees, Degrees]


class TargetRecord(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    identifier: str = Field(..., min_length=1)
    right_ascension: Hours = Field(..., ge=0, lt=24)
    declination: Degrees = Field(..., ge=-90, le=90)

    identifiers: list[str] = Field(default_factory=list)
    target_type: TargetClass = Field(..., alias="type")
    sub_type: str | None = None
    magnitude: float | None = None
    angular_size: AngularSize = Field(default_factory=tuple, alias="size")
    distance: LightYears | None = Field(None, gt=0)
    constellation: Constellation
    season: Season | None = None
    common_name: str | None = None

    @model_validator(mode="before")
    @classmethod
    def preprocess_record(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        for field in ["common_name", "season"]:
            val = data.get(field)
            if isinstance(val, list):
                data[field] = val[0] if val else None

        target_type = data.get("type")
        sub_type = data.get("sub_type")

        if target_type == "Other":
            mapping = {
                "Dn": "Emission Nebula",
                "Gc": "Globular Cluster",
                "Oc": "Open Cluster",
                "Pn": "Planetary Nebula",
                "Snr": "Supernova remnant",
            }
            data["type"] = mapping.get(sub_type, "Other")
        elif target_type == "Nebula" and sub_type == "Planetary":
            data["type"] = "Planetary Nebula"

        return data

    @field_validator("common_name", "season", "magnitude", "distance", mode="before")
    @classmethod
    def handle_empty_list_or_none(cls, v: Any) -> Any:
        """
        coerce empty lists, None, or NaN into None for optional fields
        :param v:
        :return:
        """
        if isinstance(v, list) and len(v) == 0:
            return None
        if v is None:
            return None
        try:
            if pd.isna(v):
                return None
        except (ImportError, TypeError):
            # something other than isna - we just assume it's skippable
            pass
        return v

    @field_validator("angular_size", mode="before")
    @classmethod
    def validate_angular_size(cls, v: Any) -> Any:
        """
        handle nulls or empty lists in angular size field
        :param v:
        :return:
        """
        if v is None:
            return ()

        if hasattr(v, "tolist"):
            v = v.tolist()
        if isinstance(v, list) and len(v) == 0:
            return ()
        if not isinstance(v | (list, tuple)):
            raise ValueError(f"size must be a tuple or list, got {type(v).__name__}")
        if len(v) > 2:
            raise ValueError(f"size must be a tuple or list of length 2, got {len(v)}")
        return tuple(v)

    @field_validator("constellation", mode="before")
    @classmethod
    def normalize_constellation(cls, v: Any) -> str:
        """
        normalize constellation names
        :param v:
        :return:
        """
        if not isinstance(v, str) or not v:
            return "Other"

        normalized = v.replace("ö", "o")
        allowed = get_args(Constellation)
        if normalized not in allowed:
            return "Other"
        return normalized

    @field_validator("target_type", mode="before")
    @classmethod
    def normalize_target_type(cls, v: Any) -> str:
        """
        normalize common target type variations
        :param v:
        :return:
        """
        if v == "Nebula (emission)":
            return "Emission Nebula"
        elif v == "Nebula (planetary)":
            return "Planetary Nebula"
        elif v == "Cluster (open)":
            return "Open Cluster"
        elif v == "Cluster (globular)":
            return "Globular Cluster"

        allowed = get_args(TargetClass)
        if v not in allowed:
            logger.warning(f"Invalid target type '{v}' provided, defaulting to 'Other'")
            return "Other"
        return v


class ObjectCatalog(BaseModel):
    catalog_id: str
    name: str
    metadata: dict[str, Any] | None = None
    records: list[TargetRecord] = Field(default_factory=list)

    def add_record(self, record: TargetRecord) -> None:
        self.records.append(record)

    def __len__(self) -> int:
        return len(self.records)

    @classmethod
    def from_json(cls, json_file: FilePath) -> ObjectCatalog:
        with open(json_file) as file:
            loaded = json.load(file)

        if isinstance(loaded, list):
            raw_records = loaded
            catalog_data = {}
        elif isinstance(loaded, dict):
            raw_records = loaded.get("records", [])
            catalog_data = loaded
        else:
            raw_records = []
            catalog_data = {}

        base_name = os.path.splitext(os.path.basename(json_file))[0]
        catalog_id = catalog_data.get("catalog_id") or base_name
        name = catalog_data.get("name") or base_name.capitalize()

        valid_records = []
        for record in raw_records:
            try:
                valid_records.append(TargetRecord.model_validate(record))
            except Exception as e:
                logging.error(
                    f"validation error in {catalog_id} "
                    f"[{record.get('identifier', 'UNKNOWN')}]: {e}"
                )

        return cls(
            catalog_id=catalog_id,
            name=name,
            metadata=catalog_data.get("metadata"),
            records=valid_records,
        )
