# stairs-core

The STAIRS planning engine as a plain Python package: visibility windows,
scoring, exposure recommendations, optics, and the single-night / multi-night
schedulers, plus the Pydantic schemas both ends speak.

It has no server dependencies on purpose. `services/api` imports it and
supplies DuckDB, weather and caches through the Protocols in
`stairs_core/providers.py`; the mobile app installs the same wheel into Pyodide
and runs it on-device.

```bash
pip install -e services/core            # local dev
python -m build --wheel services/core   # wheel for Pyodide
pytest services/core                    # engine tests
```
