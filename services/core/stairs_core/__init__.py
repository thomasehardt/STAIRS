"""
STAIRS planning engine.

Pure-Python astronomy and scheduling logic with no server dependencies, so the
same code runs inside the FastAPI service (services/api) and inside Pyodide in
the mobile app. Anything that needs a filesystem, a database, a network client
or config.yaml is injected by the caller via the Protocols in `providers`.
"""
