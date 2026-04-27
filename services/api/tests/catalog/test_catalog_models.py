import os
from unittest import TestCase

from pydantic import ValidationError
from src.catalog import ObjectCatalog, TargetRecord

# Get the directory where this test file is located
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
# Calculate the path to messier.json relative to this file
MESSIER_JSON_PATH = os.path.normpath(
    os.path.join(TEST_DIR, "..", "..", "data", "catalogs", "messier.json")
)


class TestObjectCatalog(TestCase):
    def test_add_record(self) -> None:
        """Test adding records manually to an ObjectCatalog."""
        my_catalog = ObjectCatalog(
            catalog_id="MC",
            name="My Catalog",
        )

        mc1 = TargetRecord(
            identifier="M1",
            right_ascension=5.575,
            declination=22.014,
            identifiers=["NGC1952"],
            type="Supernova remnant",
            magnitude=8.4,
            size=(6.0, 4.0),
            distance=6500.0,
            constellation="Taurus",
            season="winter",
            common_name="Crab Nebula",
        )

        my_catalog.add_record(mc1)

        self.assertEqual(len(my_catalog), 1)
        self.assertEqual(my_catalog.records[0].identifier, "M1")
        self.assertEqual(my_catalog.records[0].common_name, "Crab Nebula")
        self.assertIn("NGC1952", my_catalog.records[0].identifiers)

    def test_validation_errors(self) -> None:
        """Test that invalid data triggers Pydantic validation errors."""
        # Invalid RA (> 24)
        with self.assertRaises(ValidationError):
            TargetRecord(
                identifier="InvalidRA",
                right_ascension=25.0,
                declination=0.0,
                identifiers=[],
                type="Galaxy",
                size=(1.0,),
                constellation="Orion",
                season="winter",
                distance=100.0,
            )

        # Invalid Dec (< -90)
        with self.assertRaises(ValidationError):
            TargetRecord(
                identifier="InvalidDec",
                right_ascension=12.0,
                declination=-95.0,
                identifiers=[],
                type="Galaxy",
                size=(1.0,),
                constellation="Orion",
                season="winter",
                distance=100.0,
            )

    def test_alias_usage(self) -> None:
        """Test that the constructor still accepts 'type' and 'size' via aliases."""
        record = TargetRecord(
            identifier="AliasTest",
            right_ascension=1.0,
            declination=1.0,
            identifiers=[],
            type="Galaxy",  # Alias for target_type
            size=(10.0, 5.0),  # Alias for angular_size
            constellation="Andromeda",
            season="autumn",
            distance=100.0,
        )
        self.assertEqual(record.target_type, "Galaxy")
        self.assertEqual(record.angular_size, (10.0, 5.0))
