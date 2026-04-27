import duckdb
from fastapi import APIRouter, Depends
from src.api.schemas import CatalogItem, CatalogListResponse
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db

router = APIRouter()


@router.get("/", response_model=CatalogListResponse)
async def list_catalogs(
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> CatalogListResponse:
    """Returns all available catalogs and their metadata."""
    service = DuckCatalogService(db)
    df = service.list_catalogs()

    return {
        "catalogs": [
            CatalogItem(
                id=row["catalog_id"],
                name=row["name"],
                description=row["summary"],
                author=row["author"],
                item_count=row["item_count"],
            )
            for _, row in df.iterrows()
        ]
    }
