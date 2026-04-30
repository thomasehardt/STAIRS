import duckdb
import pytest
from src.api.main import app
from src.db.duck_session import get_duck_db


@pytest.fixture(scope="session")
def test_db():
    """Provides a shared in-memory database for testing."""
    db = duckdb.connect(":memory:")

    # Initialize schema
    db.execute("""
        CREATE TABLE targets (
            identifier VARCHAR,
            common_name VARCHAR,
            ra_deg DOUBLE,
            dec_deg DOUBLE,
            right_ascension DOUBLE,
            declination DOUBLE,
            target_type VARCHAR,
            magnitude DOUBLE,
            angular_size DOUBLE[],
            constellation VARCHAR,
            catalog_id VARCHAR,
            identifiers VARCHAR[]
        )
    """)
    db.execute(
        """
        CREATE TABLE profiles
          (
             NAME            VARCHAR,
             aperture_mm     DOUBLE,
             focal_length_mm DOUBLE,
             sensor_x        INTEGER,
             sensor_y        INTEGER,
             pixel_pitch_um  DOUBLE,
             fov_min         DOUBLE
          )
        """
    )
    db.execute(
        """
        CREATE TABLE catalog_metadata (
          catalog_id VARCHAR,
          name VARCHAR,
          summary VARCHAR,
          author VARCHAR,
          item_count INTEGER
        )
        """
    )
    db.execute(
        """
        CREATE TABLE locations ( name VARCHAR, latitude DOUBLE, longitude DOUBLE,
            elevation_m DOUBLE, bortle_scale INTEGER, timezone VARCHAR, is_default
            BOOLEAN, horizon_mask DOUBLE[][] )
        """
    )
    db.execute("CREATE SEQUENCE obs_log_id_seq")
    db.execute("""
        CREATE TABLE observation_log (
            id INTEGER PRIMARY KEY DEFAULT nextval('obs_log_id_seq'),
            target_id VARCHAR,
            session_date DATE,
            notes VARCHAR,
            rating INTEGER,
            status VARCHAR,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)

    # Seed data
    # ra_deg 10.6847 -> right_ascension (hours) = 10.6847 / 15 = 0.7123
    db.execute(
        """
        INSERT INTO targets VALUES ('M31', 'Andromeda Galaxy', 10.6847, 41.2692,
            0.7123, 41.2692, 'Galaxy', 3.4, [190.0, 60.0], 'Andromeda', 'M',
            ['ngc224'])
        """
    )
    db.execute(
        """
        INSERT INTO targets VALUES ('M42', 'Orion Nebula', 83.8221, -5.3911, 5.5881,
            -5.3911, 'Emission Nebula', 4.0, [65.0, 60.0], 'Orion', 'M', ['ngc1976']
        )
        """
    )
    db.execute(
        "INSERT INTO profiles VALUES ('Seestar S50', 50, 250, 1920, 1080, 2.9, 0.5)"
    )
    db.execute(
        """
        INSERT INTO
            locations
        VALUES (
            'Greenwich',
            51.48,
            0.0,
            0.0,
            4,
            'Europe/London',
            true,
           []
       )
        """
    )
    db.execute(
        """
        INSERT INTO
            catalog_metadata
        VALUES (
            'M',
            'Messier',
            'Messier Catalog',
            'Charles Messier',
            110
        )
        INSERT INTO
            catalog_metadata
        VALUES (
            'M',
            'Messier',
            'Messier Catalog',
            'Charles Messier',
            110
        )
        """
    )

    yield db
    db.close()


@pytest.fixture(autouse=True)
def override_db(test_db):
    """Automatically overrides the database dependency for all tests in the session."""
    app.dependency_overrides[get_duck_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()
