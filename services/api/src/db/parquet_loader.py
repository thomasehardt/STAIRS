import json
import logging
import os
import shutil
from pathlib import Path

import pandas as pd
import yaml
from astropy import units as u
from astropy.coordinates import SkyCoord
from src.catalog.catalog_models import TelescopeProfile
from src.planner.planner_models import ObservationLocation

logger = logging.getLogger(__name__)

CONFIG_FILE = Path("config.yaml")
CATALOG_DIR = Path("data/catalogs")
OPENNGC_DIR = CATALOG_DIR / "openngc"
TELESCOPE_PROFILES_DIR = Path("data/telescopes")

CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))
LOCATIONS_OUT = CACHE_ROOT / "user_locations.parquet"
TARGETS_OUT = CACHE_ROOT / "targets"
METADATA_OUT = CACHE_ROOT / "catalog_metadata.parquet"
TELESCOPES_OUT = CACHE_ROOT / "telescope_profiles.parquet"

# --- OpenNGC Mappings ---
CONST_MAP = {
    "And": "Andromeda",
    "Ant": "Antlia",
    "Aps": "Apus",
    "Aqr": "Aquarius",
    "Aql": "Aquila",
    "Ara": "Ara",
    "Ari": "Aries",
    "Aur": "Auriga",
    "Boo": "Bootes",
    "Cae": "Caelum",
    "Cam": "Camelopardalis",
    "Cnc": "Cancer",
    "CVn": "Canes Venatici",
    "CMa": "Canis Major",
    "CMi": "Canis Minor",
    "Cap": "Capricornus",
    "Car": "Carina",
    "Cas": "Cassiopeia",
    "Cen": "Centaurus",
    "Cep": "Cepheus",
    "Cet": "Cetus",
    "Cha": "Chamaeleon",
    "Cir": "Circinus",
    "Col": "Columba",
    "Com": "Coma Berenices",
    "CrA": "Corona Australis",
    "CrB": "Corona Borealis",
    "Crv": "Corvus",
    "Crt": "Crater",
    "Cru": "Crux",
    "Cyg": "Cygnus",
    "Del": "Delphinus",
    "Dor": "Dorado",
    "Dra": "Draco",
    "Equ": "Equuleus",
    "Eri": "Eridanus",
    "For": "Fornax",
    "Gem": "Gemini",
    "Gru": "Grus",
    "Her": "Hercules",
    "Hor": "Horologium",
    "Hya": "Hydra",
    "Hyi": "Hydrus",
    "Ind": "Indus",
    "Lac": "Lacerta",
    "Leo": "Leo",
    "LMi": "Leo Minor",
    "Lep": "Lepus",
    "Lib": "Libra",
    "Lup": "Lupus",
    "Lyn": "Lynx",
    "Lyr": "Lyra",
    "Men": "Mensa",
    "Mic": "Microscopium",
    "Mon": "Monoceros",
    "Mus": "Musca",
    "Nor": "Norma",
    "Oct": "Octans",
    "Oph": "Ophiuchus",
    "Ori": "Orion",
    "Pav": "Pavo",
    "Peg": "Pegasus",
    "Per": "Perseus",
    "Phe": "Phoenix",
    "Pic": "Pictor",
    "Psc": "Pisces",
    "PsA": "Piscis Austrinus",
    "Pup": "Puppis",
    "Pyx": "Pyxis",
    "Ret": "Reticulum",
    "Sge": "Sagitta",
    "Sgr": "Sagittarius",
    "Sco": "Scorpius",
    "Scl": "Sculptor",
    "Sct": "Scutum",
    "Ser": "Serpens",
    "Se1": "Serpens",
    "Se2": "Serpens",
    "Sex": "Sextans",
    "Tau": "Taurus",
    "Tel": "Telescopium",
    "Tri": "Triangulum",
    "TrA": "Triangulum Australe",
    "Tuc": "Tucana",
    "UMa": "Ursa Major",
    "UMi": "Ursa Minor",
    "Vel": "Vela",
    "Vir": "Virgo",
    "Vol": "Volans",
    "Vul": "Vulpecula",
}

TYPE_MAP = {
    "*": "Star",
    "**": "Double star",
    "*Ass": "Stellar Association",
    "OCl": "Open Cluster",
    "GCl": "Globular Cluster",
    "Cl+N": "Open Cluster",
    "G": "Galaxy",
    "GPair": "Galaxy Group",
    "GTrpl": "Galaxy Group",
    "GGroup": "Galaxy Group",
    "PN": "Planetary Nebula",
    "HII": "Emission Nebula",
    "DrkN": "Dark Nebula",
    "EmN": "Emission Nebula",
    "Neb": "Nebula",
    "RfN": "Reflection Nebula",
    "SNR": "Supernova remnant",
    "Nova": "Nova",
    "Ast": "Asterism",
    "QSO": "Quasar",
}


# --- Fallback Sizes (Degrees) for simulation if missing ---
TYPE_SIZE_FALLBACK = {
    "Star": 0.005,
    "Double star": 0.005,
    "Galaxy": 0.015,
    "Galaxy Group": 0.05,
    "Open Cluster": 0.1,
    "Globular Cluster": 0.08,
    "Planetary Nebula": 0.02,
    "Emission Nebula": 0.1,
    "Dark Nebula": 0.1,
    "Reflection Nebula": 0.1,
    "Supernova remnant": 0.1,
    "Asterism": 0.1,
}


def _needs_update(source_path: Path, target_path: Path) -> bool:
    """
    Returns True if target_path doesn't exist or is older than source_path.
    If source_path is a directory, checks all files within it.
    """
    if not target_path.exists():
        return True

    target_mtime = target_path.stat().st_mtime

    if source_path.is_dir():
        for file in source_path.glob("*"):
            if file.is_file() and file.stat().st_mtime > target_mtime:
                return True
        return False
    else:
        return source_path.stat().st_mtime > target_mtime


def load_data_to_parquet() -> None:
    """
    convert OpenNGC CSV catalog and telescope profile data to parquet for use by duckdb
    :return:
    """
    # 1. Ingest Catalogs
    if _needs_update(OPENNGC_DIR, METADATA_OUT) or not TARGETS_OUT.exists():
        if TARGETS_OUT.exists():
            shutil.rmtree(TARGETS_OUT)
        TARGETS_OUT.mkdir(parents=True, exist_ok=True)

        logger.info("ingesting OpenNGC catalogs")
        csv_files = ["NGC.csv", "addendum.csv"]
        dfs = []
        for f in csv_files:
            p = OPENNGC_DIR / f
            if p.exists():
                dfs.append(pd.read_csv(p, sep=";", low_memory=False))

        if not dfs:
            logger.error("no OpenNGC data found")
            return

        df = pd.concat(dfs, ignore_index=True)

        # Basic Cleanup
        df = df[df["Type"] != "NonEx"].copy()
        df = df[df["RA"].notna() & df["Dec"].notna()].copy()

        # Coordinate Conversion
        try:
            coords = SkyCoord(ra=df["RA"], dec=df["Dec"], unit=(u.hourangle, u.deg))
            df["ra_deg"] = coords.ra.deg
            df["dec_deg"] = coords.dec.deg
            df["right_ascension"] = coords.ra.hour
            df["declination"] = coords.dec.deg
        except Exception as e:
            logger.error(f"failed to parse coordinates: {e}")
            return

        # Mapping and Normalization
        df["constellation"] = df["Const"].map(CONST_MAP).fillna("Other")
        df["target_type"] = df["Type"].map(TYPE_MAP).fillna("Other")
        df["magnitude"] = df["V-Mag"].combine_first(df["B-Mag"])
        df["common_name"] = df["Common names"].where(df["Common names"].notna(), None)
        df["catalog_id"] = "openngc"

        # Angular Size [MajAx, MinAx] in Degrees
        def get_angular_size(r):
            if pd.notna(r["MajAx"]):
                if pd.notna(r["MinAx"]):
                    return [float(r["MajAx"]) / 60.0, float(r["MinAx"]) / 60.0]
                return [float(r["MajAx"]) / 60.0]

            # Fallback based on type
            t = TYPE_MAP.get(r["Type"], "Other")
            fallback = TYPE_SIZE_FALLBACK.get(t, 0.01)
            return [fallback]

        df["angular_size"] = df.apply(get_angular_size, axis=1)

        # Season
        df["season"] = df["right_ascension"].apply(
            lambda x: "winter"
            if 0 <= x < 6
            else "spring"
            if 6 <= x < 12
            else "summer"
            if 12 <= x < 18
            else "autumn"
        )

        # Identifiers
        def build_ids(row):
            ids = [str(row["Name"])]
            if pd.notna(row["M"]):
                ids.append(f"M{int(row['M'])}")
            if pd.notna(row["Identifiers"]):
                other = str(row["Identifiers"]).split(",")
                ids.extend([o.strip() for o in other if o.strip()])
            return list(set(ids))

        df["identifiers"] = df.apply(build_ids, axis=1)
        df["identifiers_str"] = df["identifiers"].apply(lambda x: ",".join(x))
        df["identifier"] = df["Name"]

        # Select columns for Parquet
        out_cols = [
            "identifier",
            "common_name",
            "ra_deg",
            "dec_deg",
            "target_type",
            "constellation",
            "magnitude",
            "catalog_id",
            "angular_size",
            "identifiers",
            "identifiers_str",
            "season",
            "right_ascension",
            "declination",
        ]
        final_df = df[out_cols].copy()

        # Write to Parquet
        final_df.to_parquet(
            TARGETS_OUT, partition_cols=["catalog_id"], engine="pyarrow"
        )

        # Metadata
        catalog_metadata = [
            {
                "catalog_id": "openngc",
                "name": "OpenNGC",
                "summary": "The Open New General Catalogue and Index Catalogue",
                "author": "Mattia Verga",
                "item_count": len(final_df),
            }
        ]
        pd.DataFrame(catalog_metadata).to_parquet(METADATA_OUT, engine="pyarrow")
    else:
        logger.debug("catalogs are already up to date")

    # 2. Ingest Telescope Profiles
    if _needs_update(TELESCOPE_PROFILES_DIR, TELESCOPES_OUT):
        logger.info("ingesting telescope profiles")
        telescope_profiles = []
        for path in TELESCOPE_PROFILES_DIR.glob("*.json"):
            with open(path) as f:
                profile_data = json.load(f)
                profile = TelescopeProfile(**profile_data)
                telescope_profiles.append(profile.model_dump())

        if telescope_profiles:
            pd.DataFrame(telescope_profiles).to_parquet(
                TELESCOPES_OUT, engine="pyarrow"
            )
        else:
            pd.DataFrame(
                columns=[
                    "name",
                    "aperture_mm",
                    "focal_length_mm",
                    "sensor_x",
                    "sensor_y",
                    "pixel_pitch_um",
                ]
            ).to_parquet(TELESCOPES_OUT, engine="pyarrow")
            logger.warning("no telescope profiles found")
    else:
        logger.debug("telescope profiles are already up to date")

    # 3. Ingest User Locations from Config
    if _needs_update(CONFIG_FILE, LOCATIONS_OUT):
        validated_locations = []
        if CONFIG_FILE.exists():
            logger.info("loading user locations from config file")
            with open(CONFIG_FILE) as f:
                config = yaml.safe_load(f) or {}

            raw_locations = []
            have_default = False
            for location in config.get("locations", []):
                is_current_default = location.get("default", False)
                is_default = False
                if not have_default and is_current_default:
                    is_default = True
                    have_default = True

                location_data = location.copy()
                location_data.pop("default", None)
                raw_locations.append({**location_data, "is_default": is_default})

            if raw_locations:
                if not have_default:
                    raw_locations[0]["is_default"] = True
                    if len(raw_locations) > 1:
                        logger.warning(
                            "no default location specified, using first location "
                            f"in config file ({raw_locations[0]['name']})"
                        )

                for location in raw_locations:
                    try:
                        is_default_location = location.pop("is_default", False)
                        location_obj = ObservationLocation(**location)
                        record = location_obj.model_dump()
                        record["is_default"] = is_default_location
                        validated_locations.append(record)
                    except Exception as e:
                        logger.error(f"error loading location from config file: {e}")

        if validated_locations:
            pd.DataFrame(validated_locations).to_parquet(
                LOCATIONS_OUT, engine="pyarrow"
            )
        else:
            # write an empty file
            pd.DataFrame(
                columns=[
                    "name",
                    "latitude",
                    "longitude",
                    "elevation_m",
                    "bortle_scale",
                    "timezone",
                    "horizon_mask",
                    "is_default",
                ]
            ).to_parquet(LOCATIONS_OUT, engine="pyarrow")
            logger.warning("no user locations found")
    else:
        logger.debug("user locations are already up to date")

    logger.info("startup parquet ingestion complete")
