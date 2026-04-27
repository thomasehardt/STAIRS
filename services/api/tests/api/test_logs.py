from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_observation_log_lifecycle():
    # create a log
    response = client.post(
        "/logs",
        json={
            "target_id": "M31",
            "session_date": "2026-10-15",
            "notes": "Great view",
            "rating": 5,
        },
    )
    assert response.status_code == 200
    data = response.json()
    log_id = data["id"]

    # it exists
    response = client.get("/logs")
    assert response.status_code == 200
    logs = response.json()["logs"]
    assert any(log["id"] == log_id for log in logs)

    # delete it
    response = client.delete(f"/logs/{log_id}")
    assert response.status_code == 204

    # ... and it's gone
    response = client.get("/logs")
    logs = response.json()["logs"]
    assert not any(log["id"] == log_id for log in logs)


def test_get_logs_for_target():
    client.post("/logs", json={"target_id": "M31", "session_date": "2026-10-15"})
    client.post("/logs", json={"target_id": "M42", "session_date": "2026-12-15"})

    response = client.get("/logs/target/M31")
    assert response.status_code == 200
    logs = response.json()["logs"]
    assert all(log["target_id"] == "M31" for log in logs)
    assert len(logs) > 0
