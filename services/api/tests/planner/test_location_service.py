from src.planner.location_service import resolve_location


def test_resolve_location_custom(test_db):
    loc = resolve_location(test_db, latitude=34.05, longitude=-118.24, name="LA")
    assert loc.name == "LA"
    assert loc.latitude == 34.05
    assert loc.longitude == -118.24
    assert loc.timezone == "America/Los_Angeles"


def test_resolve_location_by_name(test_db):
    loc = resolve_location(test_db, name="Greenwich")
    assert loc.name == "Greenwich"
    assert loc.latitude == 51.48
    assert loc.timezone == "Europe/London"


def test_resolve_location_default(test_db):
    loc = resolve_location(test_db)
    assert loc.name == "Greenwich"
    assert loc.latitude == 51.48
    assert loc.timezone == "Europe/London"
