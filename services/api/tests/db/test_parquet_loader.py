from src.db.parquet_loader import load_data_to_parquet


def test_load_data_to_parquet(tmp_path):
    # Set up mock data
    mock_catalog_dir = tmp_path / "catalogs"
    mock_telescope_dir = tmp_path / "telescopes"
    mock_catalog_dir.mkdir()
    mock_telescope_dir.mkdir()

    cat_file = mock_catalog_dir / "m.json"
    cat_file.write_text(
        """
        {
            "catalog_id": "M",
            "name": "Messier",
            "records": [
                {
                    "identifier": "M31",
                    "right_ascension": 0.71,
                    "declination": 41.2,
                    "type": "Galaxy",
                    "constellation": "Andromeda",
                    "identifiers": ["NGC224"]
                }
            ]
        }
        """
    )

    tel_file = mock_telescope_dir / "s50.json"
    tel_file.write_text(
        """
        {
            "name": "Seestar S50",
            "aperture_mm": 50,
            "focal_length_mm": 250,
            "sensor_x": 1920,
            "sensor_y": 1080,
            "pixel_pitch_um": 2.9
        }
        """
    )

    # Override global paths for testing
    import src.db.parquet_loader

    original_catalog_dir = src.db.parquet_loader.CATALOG_DIR
    original_telescope_dir = src.db.parquet_loader.TELESCOPE_PROFILES_DIR
    original_targets_out = src.db.parquet_loader.TARGETS_OUT
    original_metadata_out = src.db.parquet_loader.METADATA_OUT
    original_telescopes_out = src.db.parquet_loader.TELESCOPES_OUT

    src.db.parquet_loader.CATALOG_DIR = mock_catalog_dir
    src.db.parquet_loader.TELESCOPE_PROFILES_DIR = mock_telescope_dir
    src.db.parquet_loader.TARGETS_OUT = tmp_path / "targets"
    src.db.parquet_loader.METADATA_OUT = tmp_path / "catalog_metadata.parquet"
    src.db.parquet_loader.TELESCOPES_OUT = tmp_path / "telescope_profiles.parquet"

    try:
        load_data_to_parquet()

        assert (tmp_path / "catalog_metadata.parquet").exists()
        assert (tmp_path / "telescope_profiles.parquet").exists()
        assert (tmp_path / "targets").exists()
    finally:
        # Restore
        src.db.parquet_loader.CATALOG_DIR = original_catalog_dir
        src.db.parquet_loader.TELESCOPE_PROFILES_DIR = original_telescope_dir
        src.db.parquet_loader.TARGETS_OUT = original_targets_out
        src.db.parquet_loader.METADATA_OUT = original_metadata_out
        src.db.parquet_loader.TELESCOPES_OUT = original_telescopes_out
