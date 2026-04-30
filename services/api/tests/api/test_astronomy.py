import duckdb
import pytest
from fastapi.testclient import TestClient
from src.api.deps import get_weather_service
from src.api.main import app
from src.db.duck_session import get_duck_db

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Provides a temporary in-memory database with test data."""
    db = duckdb.connect(":memory:")
    # Replicate schema (simplified)
    db.execute(
        "CREATE TABLE targets ("
        "identifier VARCHAR, common_name VARCHAR, "
        "ra_deg DOUBLE, dec_deg DOUBLE, "
        "target_type VARCHAR, magnitude DOUBLE, "
        "angular_size DOUBLE[], "
        "constellation VARCHAR"
        ")"
    )
    db.execute(
        "CREATE TABLE profiles ("
        "name VARCHAR, aperture_mm DOUBLE, focal_length_mm DOUBLE, "
        "sensor_x INTEGER, sensor_y INTEGER, pixel_pitch_um DOUBLE, fov_min DOUBLE"
        ")"
    )

    # Add some targets
    targets = [
        ("M31", "Andromeda Galaxy", 10.6847, 41.2692, "Galaxy", 3.4, [190.0, 60.0]),
        ("M42", "Orion Nebula", 83.8221, -5.3911, "Emission Nebula", 4.0, [65.0, 60.0]),
        ("M45", "Pleiades", 56.75, 24.1167, "Open Cluster", 1.6, [110.0, 110.0]),
        (
            "M13",
            "Hercules Cluster",
            250.421,
            36.4608,
            "Globular Cluster",
            5.8,
            [20.0, 20.0],
        ),
    ]
    for t in targets:
        db.execute("INSERT INTO targets VALUES (?, ?, ?, ?, ?, ?, ?)", t)

    db.execute(
        "INSERT INTO profiles VALUES ('Seestar S50', 50, 250, 1920, 1080, 2.9, 0.5)"
    )

    yield db
    db.close()


@pytest.fixture
def override_get_duck_db():
    """Override the get_duck_db dependency and guarantee cleanup after the test."""
    try:
        yield lambda db_conn: app.dependency_overrides.update(
            {get_duck_db: lambda: db_conn}
        )
    finally:
        app.dependency_overrides.clear()


def test_target_position_validation():
    """
    Validate that the target position endpoint returns correct Alt/Az
    for a known target.
    Target: M31 (Andromeda Galaxy)
    Location: Greenwich, London (51.48N, 0.0W)
    Time: 2026-10-15 20:00:00 UTC
    """
    # Mock DB for this test
    db_conn = duckdb.connect(":memory:")
    db_conn.execute(
        "CREATE TABLE targets ("
        "identifier VARCHAR, common_name VARCHAR, "
        "ra_deg DOUBLE, dec_deg DOUBLE, "
        "target_type VARCHAR, magnitude DOUBLE, "
        "angular_size DOUBLE[], "
        "constellation VARCHAR"
        ")"
    )
    db_conn.execute(
        "INSERT INTO targets VALUES ("
        "'M31', 'Andromeda Galaxy', 10.6847, 41.2692, "
        "'Galaxy', 3.4, [190.0, 60.0], "
        "'Andromeda'"
        ")"
    )

    try:
        app.dependency_overrides[get_duck_db] = lambda: db_conn

        target_id = "M31"
        lat = 51.48
        lon = 0.0
        start_time = "2026-10-15T20:00:00Z"

        response = client.get(
            f"/targets/{target_id}/position",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_time": start_time,
                "hours": 1.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["identifier"] == target_id
        assert len(data["positions"]) > 0

        # M31 at 20:00 UTC in London should be high
        first_point = data["positions"][0]
        assert first_point["alt_deg"] > 40.0

        # Verify local timezone for London (Greenwich)
        # 2026-10-15 is during BST (British Summer Time, UTC+1)
        assert (
            "+01:00" in first_point["time"]
            or "BST" in first_point["time"]
            or first_point["time"].endswith("+01:00")
        )
    finally:
        app.dependency_overrides.clear()


def test_planner_astronomical_night():
    """Validate identifying astronomical night window in Tromso."""
    # Mock DB for this test too
    db_conn = duckdb.connect(":memory:")
    db_conn.execute(
        "CREATE TABLE profiles ("
        "name VARCHAR, aperture_mm DOUBLE, focal_length_mm DOUBLE, "
        "sensor_x INTEGER, sensor_y INTEGER, pixel_pitch_um DOUBLE, fov_min DOUBLE"
        ")"
    )
    db_conn.execute(
        "INSERT INTO profiles VALUES ('Seestar S50', 50, 250, 1920, 1080, 2.9, 0.5)"
    )
    db_conn.execute(
        "CREATE TABLE targets ("
        "identifier VARCHAR, common_name VARCHAR, "
        "ra_deg DOUBLE, dec_deg DOUBLE, "
        "target_type VARCHAR, magnitude DOUBLE, "
        "angular_size DOUBLE[], "
        "constellation VARCHAR"
        ")"
    )
    db_conn.execute(
        "CREATE TABLE locations ("
        "name VARCHAR, latitude DOUBLE, longitude DOUBLE, elevation_m DOUBLE, "
        "bortle_scale INTEGER, timezone VARCHAR, is_default BOOLEAN"
        ")"
    )

    try:
        app.dependency_overrides[get_duck_db] = lambda: db_conn

        # Winter Solstice in Tromso
        response_winter = client.post(
            "/plan/generate",  # Fix prefix! It was /planner/generate
            json={
                "location_name": "Tromso Winter",
                "latitude": 69.65,
                "longitude": 18.95,
                "start_time": "2026-12-21T12:00:00Z",
                "telescope_profile_name": "Seestar S50",
                "min_alt": 30.0,
            },
        )

        assert response_winter.status_code == 200
        data_winter = response_winter.json()
        assert data_winter["astronomical_night_start"] is not None
        assert data_winter["astronomical_night_end"] is not None
    finally:
        app.dependency_overrides.clear()


def test_brightest_targets_integration():
    """
    Verify that for a given time/location, the planner
    recommends the brightest visible targets.
    This test uses a mock database to ensure consistent results.
    """
    # Use a fixed DB for this test
    db_conn = duckdb.connect(":memory:")
    db_conn.execute(
        "CREATE TABLE targets ("
        "identifier VARCHAR, common_name VARCHAR, "
        "ra_deg DOUBLE, dec_deg DOUBLE, "
        "target_type VARCHAR, magnitude DOUBLE, "
        "angular_size DOUBLE[], "
        "constellation VARCHAR"
        ")"
    )
    db_conn.execute(
        "CREATE TABLE profiles ("
        "name VARCHAR, aperture_mm DOUBLE, focal_length_mm DOUBLE, "
        "sensor_x INTEGER, sensor_y INTEGER, pixel_pitch_um DOUBLE, fov_min DOUBLE"
        ")"
    )
    db_conn.execute("CREATE TABLE catalog_metadata (catalog_id VARCHAR, name VARCHAR)")
    db_conn.execute(
        "CREATE TABLE locations ("
        "name VARCHAR, latitude DOUBLE, longitude DOUBLE, elevation_m DOUBLE, "
        "bortle_scale INTEGER, timezone VARCHAR, is_default BOOLEAN"
        ")"
    )

    targets = [
        (
            "M31",
            "Andromeda Galaxy",
            10.6847,
            41.2692,
            "Galaxy",
            3.4,
            [190.0, 60.0],
            "Andromeda",
        ),
        (
            "M42",
            "Orion Nebula",
            83.8221,
            -5.3911,
            "Emission Nebula",
            4.0,
            [65.0, 60.0],
            "Orion",
        ),
    ]
    for t in targets:
        db_conn.execute("INSERT INTO targets VALUES (?, ?, ?, ?, ?, ?, ?, ?)", t)
    db_conn.execute(
        "INSERT INTO profiles VALUES ('Seestar S50', 50, 250, 1920, 1080, 2.9, 0.5)"
    )

    try:
        app.dependency_overrides[get_duck_db] = lambda: db_conn
        app.dependency_overrides[get_weather_service] = lambda: None

        # Query for Orion Nebula at a time when it's high in Orion (Winter)
        response = client.post(
            "/plan/generate",
            json={
                "location_name": "Test Loc",
                "latitude": 30.0,
                "longitude": -90.0,
                "start_time": "2026-01-15T02:00:00Z",
                "telescope_profile_name": "Seestar S50",
                "min_alt": 20.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["timeline"]) == 6
        assert all(item["target_id"] == "M42" for item in data["timeline"])
        assert len(data["recommendations"]) == 2
        assert all(item["target_id"] in {"M31", "M42"} for item in data["timeline"])
    finally:
        app.dependency_overrides.clear()


def test_planner_local_timezone_output():
    """
    Validate that the planner returns times in the local timezone of the location.
    Location: Los Angeles (34.05, -118.24)
    Time: 2026-01-01 (Winter)
    """
    db_conn = duckdb.connect(":memory:")
    db_conn.execute(
        "CREATE TABLE profiles ("
        "name VARCHAR, aperture_mm DOUBLE, focal_length_mm DOUBLE, "
        "sensor_x INTEGER, sensor_y INTEGER, pixel_pitch_um DOUBLE, fov_min DOUBLE"
        ")"
    )
    db_conn.execute(
        "INSERT INTO profiles VALUES ('Seestar S50', 50, 250, 1920, 1080, 2.9, 0.5)"
    )
    db_conn.execute(
        "CREATE TABLE targets ("
        "identifier VARCHAR, common_name VARCHAR, "
        "ra_deg DOUBLE, dec_deg DOUBLE, "
        "target_type VARCHAR, magnitude DOUBLE, "
        "angular_size DOUBLE[], "
        "constellation VARCHAR"
        ")"
    )
    db_conn.execute(
        "CREATE TABLE locations ("
        "name VARCHAR, latitude DOUBLE, longitude DOUBLE, elevation_m DOUBLE, "
        "bortle_scale INTEGER, timezone VARCHAR, is_default BOOLEAN"
        ")"
    )

    try:
        app.dependency_overrides[get_duck_db] = lambda: db_conn

        # 2026-01-01 in LA
        response = client.post(
            "/plan/generate",
            json={
                "location_name": "Los Angeles",
                "latitude": 34.05,
                "longitude": -118.24,
                "start_time": "2026-01-01T12:00:00Z",
                "telescope_profile_name": "Seestar S50",
                "min_alt": 30.0,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Astronomical night start should be around 18:30 local time
        # on Jan 1st (which is Jan 2nd UTC)
        # The JSON response will be an ISO string.
        # If the API returns UTC, it will end in Z or +00:00.
        # If it returns local time, it should have the correct offset (-08:00).
        night_start = data["astronomical_night_start"]

        # Verify it has a timezone offset and it's -08:00
        assert (
            "-08:00" in night_start
            or "PST" in night_start
            or night_start.endswith("-08:00")
        )
    finally:
        app.dependency_overrides.clear()
