import csv
import io
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class SkySafariExporter:
    """
    exporter for data in SkySafari .skylist format
    see: https://skysafariastronomy.com/support/manual/observing_lists.html
    """

    @staticmethod
    def format_catalog_number(identifier: str) -> str:
        """
        formats identifiers for SkySafari .skylist format
        e.g.: NGC4922 -> NGC 4922, M51 => M 51
        :param identifier:
        :return:
        """
        match = re.match(r"([A-Za-z]+)(\d+)", identifier)
        if match:
            return f"{match.group(1)} {match.group(2)}"
        return identifier

    def generate_skylist(self, targets: list[dict[str, Any]]) -> str:
        """
        generates a SkySafari .skylist formatted string from a list of targets
        :param targets:
        :return:
        """
        lines = ["SkySafariObservingListVersion=3.0"]

        for target in targets:
            identifier = target.get("identifier", "Unknown")
            common_name = target.get("common_name")
            catalog_number = self.format_catalog_number(identifier)

            lines.append("SkyObject=BeginObject")
            lines.append(f"\tCatalogNumber={catalog_number}")
            if common_name:
                lines.append(f"\tCommonName={common_name}")

            if "oss" in target:
                lines.append(
                    f"\tComment=Recommended by STAIRS (OSS: {target['oss']:.1f})"
                )

            lines.append("EndObject")

        return "\n".join(lines)


class CsvExporter:
    """
    exporter for data in CSV format
    """

    def generate_csv(self, timeline: list[dict]) -> str:
        """
        generates a CSV formatted string from a list of timeline events
        :param timeline:
        :return:
        """
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "target_id",
                "common_name",
                "start_time",
                "end_time",
                "oss_score",
            ],
        )
        writer.writeheader()
        for block in timeline:
            row = {
                "target_id": block["target_id"],
                "common_name": block.get("common_name", ""),
                "start_time": block["start_time"].isoformat()
                if hasattr(block["start_time"], "isoformat")
                else block["start_time"],
                "end_time": block["end_time"].isoformat()
                if hasattr(block["end_time"], "isoformat")
                else block["end_time"],
                "oss_score": round(block.get("oss_score", 0.0), 1),
            }
            writer.writerow(row)
        return output.getvalue()
