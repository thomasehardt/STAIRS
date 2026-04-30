from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_get_locations():
    response = client.get("/locations")
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert len(data["locations"]) > 0
    assert data["locations"][0]["name"] == "Greenwich"


def test_get_catalogs():
    response = client.get("/catalogs")
    assert response.status_code == 200
    data = response.json()
    assert "catalogs" in data
    assert len(data["catalogs"]) > 0
    assert data["catalogs"][0]["id"] == "M"


def test_get_profiles():
    response = client.get("/profiles")
    assert response.status_code == 200
    data = response.json()
    assert "profiles" in data
    assert len(data["profiles"]) > 0
    assert data["profiles"][0]["name"] == "Seestar S50"


def test_search_targets():
    response = client.get("/targets/search", params={"q": "Andromeda"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) > 0
    assert data["results"][0]["common_name"] == "Andromeda Galaxy"


def test_get_target_detail():
    # 1. Basic detail
    response = client.get("/targets/M31")
    assert response.status_code == 200
    data = response.json()
    assert data["identifier"] == "M31"

    # 2. With profile fit
    response = client.get("/targets/M31", params={"profile_name": "Seestar S50"})
    assert response.status_code == 200
    data = response.json()
    assert data["fov_fit"] is not None
    assert "fits_sensor" in data["fov_fit"]

    # 3. With observation history
    # First create a log for M31
    client.post("/logs", json={"target_id": "M31", "session_date": "2026-10-15"})
    response = client.get("/targets/M31")
    data = response.json()
    assert data["observation_count"] > 0
    assert data["last_observed"] == "2026-10-15"


def test_generate_plan():
    response = client.post(
        "/plan/generate",
        json={
            "location_name": "Greenwich",
            "telescope_profile_name": "Seestar S50",
            "start_time": "2026-01-15T20:00:00Z",
            "min_alt": 30.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["location_name"] == "Greenwich"
    assert data["astronomical_night_start"] is not None
    assert len(data["timeline"]) > 0


def test_get_multi_night_forecast():
    response = client.get(
        "/plan/forecast", params={"location_name": "Greenwich", "days": 3}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["days"]) == 3


def test_export_plan_skylist():
    payload = {
        "location_name": "Greenwich",
        "telescope_profile_name": "Seestar S50",
        "start_time": "2026-01-15T20:00:00Z",
    }
    response = client.post("/plan/export/skylist", json=payload)
    assert response.status_code == 200
    assert "skylist" in response.headers["content-disposition"]


def test_export_plan_csv():
    payload = {
        "location_name": "Greenwich",
        "telescope_profile_name": "Seestar S50",
        "start_time": "2026-01-15T20:00:00Z",
    }
    response = client.post("/plan/export/csv", json=payload)
    assert response.status_code == 200
    assert "csv" in response.headers["content-disposition"]


def test_generate_plan_custom_coords():
    response = client.post(
        "/plan/generate",
        json={
            "latitude": 34.05,
            "longitude": -118.24,
            "telescope_profile_name": "Seestar S50",
            "start_time": "2026-01-15T20:00:00Z",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "location_name" in data
    assert len(data["timeline"]) > 0


def test_generate_plan_defaults():
    # Use only required fields if any (start_time is recommended but optional in logic)
    # Actually, telescope_profile_name is required in PlanRequest schema
    response = client.post(
        "/plan/generate", json={"telescope_profile_name": "Seestar S50"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "location_name" in data


def test_generate_plan_invalid_location():
    response = client.post(
        "/plan/generate",
        json={
            "location_name": "NonExistentLocation",
            "telescope_profile_name": "Seestar S50",
        },
    )
    assert response.status_code == 400


def test_get_target_not_found():
    response = client.get("/targets/NonExistentTarget")
    assert response.status_code == 404


def test_get_target_opportunity_series():
    response = client.get(
        "/plan/target-series",
        params={
            "target_id": "M31",
            "location_name": "Greenwich",
            "telescope_profile_name": "Seestar S50",
            "start_time": "2026-01-15T20:00:00Z",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_id"] == "M31"
    assert len(data["points"]) > 0


def test_get_logs():
    response = client.get("/logs")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data


def test_get_settings():
    response = client.get("/settings")
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert "planning" in data


def test_get_weather_forecast():
    # Use the correct path /weather/ and include the required timestamp
    response = client.get(
        "/weather/",
        params={
            "latitude": 51.48,
            "longitude": 0.0,
            "timestamp": "2026-03-20T12:00:00Z",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert "cloud_cover_pct" in data


def test_get_weather_range():
    response = client.get(
        "/weather/range",
        params={
            "latitude": 51.48,
            "longitude": 0.0,
            "start": "2026-03-20T12:00:00Z",
            "end": "2026-03-21T12:00:00Z",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_weather_range_invalid():
    # End before start
    response = client.get(
        "/weather/range",
        params={
            "latitude": 51.48,
            "longitude": 0.0,
            "start": "2026-03-21T12:00:00Z",
            "end": "2026-03-20T12:00:00Z",
        },
    )
    assert response.status_code == 400
