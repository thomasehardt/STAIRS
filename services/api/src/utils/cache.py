import json
import logging
import os
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)
CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))


class FileCache:
    """
    A simple file-based cache implementation.
    """

    def __init__(self, cache_dir: Path = CACHE_ROOT) -> None:
        self.cache_dir = cache_dir
        if not self.cache_dir.exists():
            logger.info(f"creating cache directory: {self.cache_dir}")
            self.cache_dir.mkdir(parents=True)

    def get(
        self,
        key: str,
        ttl_seconds: int = 3600,
    ) -> Any | None:
        """
        Retrieves cached data for the given key if it's not expired.
        :param key:
        :param ttl_seconds:
        :return:
        """
        cache_path = self.cache_dir / f"{key}.json"
        if not cache_path.exists():
            logger.debug(f"cache miss for key: {key}")
            return None

        # check our ttl
        mtime = cache_path.stat().st_mtime
        if (time.time() - mtime) > ttl_seconds:
            logger.debug(f"cache miss (expired) for key: {key}")
            return None

        try:
            with open(cache_path) as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"error reading cache file for key: {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
    ) -> None:
        """
        saves the value to the cache
        :param key:
        :param value:
        :return:
        """
        cache_path = self.cache_dir / f"{key}.json"
        try:
            with open(cache_path, "w") as f:
                logger.debug(f"writing cache file for key: {key}")
                json.dump(value, f)
        except Exception as e:
            logger.error(f"error writing cache file for key: {key}: {e}")

    def delete(
        self,
        key: str,
    ) -> None:
        """
        removes an item from the cache
        :param key:
        :return:
        """
        cache_path = self.cache_dir / f"{key}.json"
        if cache_path.exists():
            logger.debug(f"deleting cache file for key: {key}")
            cache_path.unlink()
