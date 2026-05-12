import logging
import os
import threading
from pathlib import Path

import duckdb
from duckdb import DuckDBPyConnection

CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))
TARGETS_PATHS = str(CACHE_ROOT / "targets/**/*.parquet")
TELESCOPE_PROFILES_PATH = str(CACHE_ROOT / "telescope_profiles.parquet")
METADATA_PATH = str(CACHE_ROOT / "catalog_metadata.parquet")
LOCATIONS_PATH = str(CACHE_ROOT / "user_locations.parquet")
PERSISTENT_DB_PATH = str(CACHE_ROOT / "planner.duckdb")

# our session will be a singleton
_duck_session = None
_duck_lock = threading.Lock()


class DuckSession:
    def __init__(self) -> None:
        if not CACHE_ROOT.exists():
            logging.info(f"creating cache directory: {CACHE_ROOT}")
        CACHE_ROOT.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(PERSISTENT_DB_PATH)
        self._init_persistent_tables()
        self._refresh_views()

    def _init_persistent_tables(self) -> None:
        """
        creates the persistent tables if they don't exist
        :return:
        """
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS observation_log (
                id INTEGER PRIMARY KEY,
                target_id VARCHAR NOT NULL,
                session_date DATE NOT NULL,
                notes VARCHAR,
                rating INTEGER CHECK (rating BETWEEN 1 AND 5),
                status VARCHAR DEFAULT 'Captured',
                created_at TIMESTAMP DEFAULT current_timestamp
            )
        """)

    def _refresh_views(self) -> None:
        """
        refreshes the views in the database to ensure they point to the
        latest parquet files. falls back to empty tables if files are missing.
        :return:
        """
        # 1. Targets
        import glob

        targets_files = glob.glob(TARGETS_PATHS, recursive=True)
        if targets_files:
            self.conn.execute(
                "CREATE OR REPLACE VIEW targets AS "
                f"SELECT * FROM read_parquet('{TARGETS_PATHS}')"
            )
        else:
            logging.warning(
                "no target parquet files found at %s, creating empty table",
                TARGETS_PATHS,
            )
            self.conn.execute("""
                CREATE OR REPLACE TABLE targets (
                    identifier VARCHAR,
                    common_name VARCHAR,
                    ra_deg DOUBLE,
                    dec_deg DOUBLE,
                    target_type VARCHAR,
                    constellation VARCHAR,
                    magnitude DOUBLE,
                    catalog_id VARCHAR,
                    angular_size DOUBLE[],
                    identifiers VARCHAR[],
                    identifiers_str VARCHAR,
                    season VARCHAR,
                    right_ascension DOUBLE,
                    declination DOUBLE
                )
            """)

        # 2. Profiles
        if Path(TELESCOPE_PROFILES_PATH).exists():
            self.conn.execute(
                "CREATE OR REPLACE VIEW profiles AS "
                f"SELECT * FROM read_parquet('{TELESCOPE_PROFILES_PATH}')"
            )
        else:
            logging.warning(
                "no profile parquet files found at %s, creating empty table",
                TELESCOPE_PROFILES_PATH,
            )
            self.conn.execute("""
                CREATE OR REPLACE TABLE profiles (
                    name VARCHAR,
                    aperture_mm DOUBLE,
                    focal_length_mm DOUBLE,
                    sensor_x INTEGER,
                    sensor_y INTEGER,
                    pixel_pitch_um DOUBLE,
                    read_noise_e DOUBLE,
                    quantum_efficiency DOUBLE
                )
            """)

        # 3. Metadata
        if Path(METADATA_PATH).exists():
            self.conn.execute(
                "CREATE OR REPLACE VIEW catalog_metadata AS "
                f"SELECT * FROM read_parquet('{METADATA_PATH}')"
            )
        else:
            self.conn.execute("""
                CREATE OR REPLACE TABLE catalog_metadata (
                    catalog_id VARCHAR,
                    name VARCHAR,
                    summary VARCHAR,
                    author VARCHAR,
                    item_count INTEGER
                )
            """)

        # 4. Locations
        if Path(LOCATIONS_PATH).exists():
            self.conn.execute(
                "CREATE OR REPLACE VIEW locations AS "
                f"SELECT * FROM read_parquet('{LOCATIONS_PATH}')"
            )
        else:
            self.conn.execute("""
                CREATE OR REPLACE TABLE locations (
                    name VARCHAR,
                    latitude DOUBLE,
                    longitude DOUBLE,
                    elevation_m DOUBLE,
                    bortle_scale INTEGER,
                    timezone VARCHAR,
                    is_default BOOLEAN,
                    horizon_mask DOUBLE[][]
                )
            """)

    def get_connection(self) -> DuckDBPyConnection:
        return self.conn


def get_duck_db() -> DuckDBPyConnection:
    global _duck_session
    with _duck_lock:
        if _duck_session is None:
            _duck_session = DuckSession()
    return _duck_session.get_connection()
