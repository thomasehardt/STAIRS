from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_system_status():
    response = client.get("/system/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"


def test_update_settings():
    # Test updating planning settings
    response = client.patch(
        "/settings",
        json={"planning": {"default_telescope": "Dwarf II", "min_altitude": 35.0}},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["planning"]["default_telescope"] == "Dwarf II"
    assert data["planning"]["min_altitude"] == 35.0


def test_warm_cache():
    response = client.post("/system/warm-cache", params={"days": 1})
    assert response.status_code == 200
    assert "started" in response.json()["message"]
