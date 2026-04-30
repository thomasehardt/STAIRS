from astropy.time import Time
from src.catalog.duck_service import DuckCatalogService
from src.planner.planner_models import ObservationLocation


def test_duck_catalog_service_search(test_db):
    service = DuckCatalogService(test_db)

    # Search for Andromeda
    results = service.search_targets("Andromeda")
    assert len(results) == 1
    assert results.iloc[0]["identifier"] == "M31"

    # Search for non-existent
    results = service.search_targets("NonExistentObject")
    assert len(results) == 0


def test_duck_catalog_service_get_target(test_db):
    service = DuckCatalogService(test_db)

    target = service.get_target_by_id("M42")
    assert target is not None
    assert target["common_name"] == "Orion Nebula"


def test_duck_catalog_service_list_profiles(test_db):
    service = DuckCatalogService(test_db)
    profiles = service.list_profiles()
    assert len(profiles) > 0
    assert profiles[0].name == "Seestar S50"


def test_duck_catalog_service_get_profile(test_db):
    service = DuckCatalogService(test_db)
    profile = service.get_profile_by_name("Seestar S50")
    assert profile is not None
    assert profile.aperture_mm == 50


def test_duck_catalog_service_recommendations(test_db):
    service = DuckCatalogService(test_db)
    loc = ObservationLocation(
        name="Test", latitude=30.0, longitude=-90.0, bortle_scale=None, elevation_m=0.0
    )
    profile = service.get_profile_by_name("Seestar S50")

    # Winter night
    start_time = Time("2026-01-15T02:00:00Z")
    assert profile is not None
    recs = service.get_recommendations(loc, profile, start_time)

    assert not recs.empty
    # Orion Nebula should be high in Jan
    assert any(recs["identifier"] == "M42")
