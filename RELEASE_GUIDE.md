# Release Guide

STAIRS uses **Conventional Commits** and **release-please** to automate versioning and releases.

## 1. Commit Convention

To trigger the automated release process, use the following commit message formats:

- `feat: ...` -> Bumps the **Minor** version (e.g., 0.1.3 -> 0.2.0)
- `fix: ...` -> Bumps the **Patch** version (e.g., 0.1.3 -> 0.1.4)
- `feat!: ...` or `fix!: ...` -> Bumps the **Major** version (e.g., 0.1.3 -> 1.0.0)

## 2. Automated Release Workflow

1.  **Work on main**: Push your changes directly to the `main` branch (or merge PRs).
2.  **Release PR**: `release-please` will automatically detect your commits and maintain a "Release PR".
3.  **Review & Merge**: When you are ready to release:
    - Review the generated `CHANGELOG.md` in the Release PR.
    - Merge the PR.
4.  **Tagging & CI**:
    - Merging the PR automatically creates a GitHub Release and a git tag (e.g., `v0.2.0`).
    - This tag triggers the **Build and Release Images** workflow.
    - Docker images are built and pushed to GHCR with the new version tag.

## 3. Files Managed Automatically

The following files are updated by `release-please` during each release:

- `services/api/pyproject.toml`
- `services/web/package.json`
- `README.md` (Header version)
- `docker-compose.prod.yaml` (Image tags)

## 4. Manual Verification

You can verify the production-like stack locally before merging a release by running:

```bash
./scripts/test-prod-local.sh
```
