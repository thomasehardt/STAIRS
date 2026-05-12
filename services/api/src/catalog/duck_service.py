import pandas as pd
from duckdb import DuckDBPyConnection
from src.catalog.catalog_models import TelescopeProfile


class DuckCatalogService:
    def __init__(self, conn: DuckDBPyConnection):
        self.conn = conn

    def list_catalogs(self) -> pd.DataFrame:
        sql = """
            SELECT catalog_id, name, summary, author, item_count
            FROM catalog_metadata
        """
        return self.conn.execute(sql).df()

    def search_targets(
        self,
        query: str,
        target_type: str | None = None,
        constellation: str | None = None,
        max_magnitude: float | None = None,
        limit: int = 50,
    ) -> pd.DataFrame:
        sql = """
            SELECT
                identifier, common_name, target_type, constellation,
                magnitude, angular_size, season
            FROM targets
            WHERE (identifier ILIKE ? OR common_name ILIKE ? OR identifiers_str ILIKE ?)
        """
        params = [f"%{query}%", f"%{query}%", f"%{query}%"]

        if target_type:
            sql += " AND target_type = ?"
            params.append(target_type)

        if constellation:
            sql += " AND constellation = ?"
            params.append(constellation)

        if max_magnitude is not None:
            sql += " AND (magnitude IS NULL OR magnitude <= ?)"
            params.append(max_magnitude)

        sql += " LIMIT ?"
        params.append(limit)

        return self.conn.execute(sql, params).df()

    def get_target_by_id(self, identifier: str) -> dict | None:
        res = self.conn.execute(
            "SELECT * FROM targets WHERE identifier ILIKE ?", [identifier]
        ).df()
        return res.to_dict(orient="records")[0] if not res.empty else None

    def list_profiles(self) -> list[TelescopeProfile]:
        df = self.conn.execute("SELECT * FROM profiles").df()
        return [TelescopeProfile(**row.to_dict()) for _, row in df.iterrows()]

    def get_profile_by_name(self, name: str) -> TelescopeProfile | None:
        res = self.conn.execute("SELECT * FROM profiles WHERE name = ?", [name]).df()
        if res.empty:
            return None
        return TelescopeProfile(**res.iloc[0].to_dict())
