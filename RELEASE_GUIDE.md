# STAIRS Release Guide

This guide outlines the steps required to perform a new release of the STAIRS project.

## 1. Quality Assurance (QA)

Before releasing, ensure that the application is stable and all tests pass.

### Backend (API)

Navigate to the API service and run tests and linting:

```bash
cd services/api
pytest
ruff check .
```

### CLI

Navigate to the CLI service and run linting:

```bash
cd services/cli
ruff check .
```

### Web UI

Navigate to the web service and ensure it passes linting and builds successfully:

```bash
cd services/web
npm run lint
npm run build
```

---

## 2. Version Bumping

The version must be updated in four locations to keep the monorepo synchronized. Replace `0.1.0` with your new version number.

1.  **Root:** `pyproject.toml` (under `[project] version`)
2.  **API:** `services/api/pyproject.toml` (under `[project] version`)
3.  **CLI:** `services/cli/pyproject.toml` (under `[project] version`)
4.  **Web:** `services/web/package.json` (the `version` field)

---

## 3. Commit and Tag

Once the versions are updated, commit the changes and create a Git tag. The tag **must** follow the `v*` pattern (e.g., `v0.1.0`) to trigger the automated release workflow.

```bash
# Add all changes
git add .

# Commit the release
git commit -m "chore: release v0.1.0"

# Create the version tag
git tag v0.1.0
```

---

## 4. Push to GitHub

Push both the commit and the new tag to the remote repository.

```bash
git push origin main
git push origin v0.1.0
```

---

## 5. Automated Release Workflow

Upon pushing the tag, the GitHub Actions workflow (`.github/workflows/release.yml`) will automatically:

1.  **Create a GitHub Release:** Generates a release on the GitHub project page with automatically generated release notes.
2.  **Build Docker Images:** Builds production-ready Docker images for the **API**, **CLI**, and **Web** services.
3.  **Publish to GHCR.io:** Pushes the images to the GitHub Container Registry under the following paths:
    - `ghcr.io/thomasehardt/stairs-api`
    - `ghcr.io/thomasehardt/stairs-cli`
    - `ghcr.io/thomasehardt/stairs-web`

You can monitor the progress of these builds in the **Actions** tab of the GitHub repository.
