# ci-cd-playground

A Python project configured with [`uv`](https://docs.astral.sh/uv/), [`ruff`](https://docs.astral.sh/ruff/), [`pyright`](https://microsoft.github.io/pyright/), and [`pytest`](https://docs.pytest.org/), complete with GitHub Actions Continuous Integration (CI), Release automation, and automated publishing to TestPyPI.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (v0.5+ recommended)

## Quick Start

### 1. Install Dependencies

Install all dependencies (including development tools) into a local virtual environment:

```bash
uv sync
```

### 2. Run Quality Checks & Tests Locally

| Tool | Purpose | Command |
| :--- | :--- | :--- |
| **Ruff Check** | Linting and code style rules | `uv run ruff check .` |
| **Ruff Format** | Code formatting verification | `uv run ruff format --check .` |
| **Pyright** | Static type checking | `uv run pyright` |
| **Pytest** | Unit test suite | `uv run pytest` |
| **Build** | Build sdist and wheel | `uv build` |

To automatically fix lint violations or format code:

```bash
# Format code
uv run ruff format .

# Auto-fix linting issues
uv run ruff check --fix .
```

### 3. Run the FastAPI Application

Start the local development server with auto-reload:

```bash
uv run uvicorn ci_cd_playground:app --reload
```

The API endpoints will be accessible at `http://127.0.0.1:8000/` and interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### 4. Build Distribution Packages

Build both the source distribution (`.tar.gz`) and wheel (`.whl`):

```bash
uv build
```

The output packages will be located in the `dist/` directory.

## GitHub Actions Workflows

The repository organizes continuous integration and deployment into modular, decoupled workflows:

### 1. Continuous Integration (CI) — [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

Runs automatically on pushes and pull requests to `main`, and functions as a **reusable workflow** (`workflow_call`):

1. **Lint & Format (Ruff)**: Verifies formatting and runs linting rules.
2. **Type Check (Pyright)**: Validates static typing rules across `src/` and `tests/`.
3. **Matrix Tests (Pytest)**: Runs the test suite across supported Python versions (`3.10`, `3.11`, `3.12`, `3.13`) using `astral-sh/setup-uv`.
4. **Security Check (zizmor)**: Audits GitHub Actions workflows for security vulnerabilities and permissions issues.
5. **Build (uv build)**: Builds source distributions and wheels, performs a smoke test by installing and importing the wheel in an isolated environment, and uploads build artifacts (`dist-packages`).

### 2. Container Security — [`.github/workflows/container-security.yml`](.github/workflows/container-security.yml)

Runs on pull requests to `main` and via `workflow_call`:
- Builds the runtime Docker image.
- Scans for vulnerabilities with Trivy using repository ignore configurations.

### 3. Docker Build & Publish — [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)

A **reusable workflow** (`workflow_call`) that encapsulates container lifecycle tasks:
1. Builds the production image with `APP_VERSION` and `GIT_SHA` build arguments.
2. Scans the container with Trivy for CRITICAL and HIGH severity issues.
3. Starts the container locally and verifies `/health` response.
4. Logs into GitHub Container Registry (GHCR) and publishes the tagged images (`${GITHUB_SHA}` and optional custom/release tag).

### 4. Deploy Service — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

A **reusable deployment workflow** (`workflow_call`) that unifies Render deployment logic for all environments:
1. Configures the target GitHub `environment` (e.g. `staging` or `production`), enabling environment protection rules, approvals, and secret isolation.
2. Triggers Render deploy via REST API for the given service ID and image tag.
3. Polls Render deployment status every 30s until `live` or failed.
4. Verifies service availability via `/health` and validates that `/version` is running the expected commit SHA.

### 5. Continuous Delivery (CD) — [`.github/workflows/cd.yml`](.github/workflows/cd.yml)

Triggers automatically on pushes to `main` and via manual `workflow_dispatch`:
1. **CI Validation & Build**: Calls `ci.yml` to verify quality gates.
2. **Docker Publish**: Calls `docker-publish.yml` to build, scan, test, and push the image to GHCR.
3. **Deploy to Staging**: Automatically calls `deploy.yml` with `staging` settings and validates staging health.
4. **Deploy to Production**: Calls `deploy.yml` with `production` settings. Can be gated with GitHub Environment manual approval rules or targeted selectively via manual dispatch.

### 6. Release & TestPyPI Publishing — [`.github/workflows/release.yml`](.github/workflows/release.yml)

Triggers whenever a version tag matching `v*` (e.g. `v0.1.0`) is pushed to the repository (or via manual `workflow_dispatch`):

1. **CI Validation & Build**: Directly reuses `ci.yml`.
2. **Tag Release Container**: Calls `docker-publish.yml` with the release tag (e.g. `v0.1.0`).
3. **Publish to TestPyPI**:
   - Downloads the pre-built `dist-packages` artifact from CI.
   - Publishes to TestPyPI using `uv publish --index testpypi`.
   - Supports both **Trusted Publishing** (OIDC via `id-token: write` and GitHub environment `testpypi`) and **API Token** (via `TESTPYPI_API_TOKEN` secret).
4. **Create GitHub Release**:
   - Compares the git tag with the package version declared in `pyproject.toml`.
   - Downloads the pre-built, verified `dist-packages` artifact from the CI run.
   - Creates a GitHub Release using `gh release create` with automatically generated release notes and attaches the built packages from `dist/*`.

#### Configuring TestPyPI Publishing

You can authenticate using either method:

- **Method A: Trusted Publishing (Recommended)**:
  1. Add a Pending Publisher on [TestPyPI](https://test.pypi.org/manage/account/publishing/) targeting your GitHub repo and workflow (`release.yml`), with environment name `testpypi`.
  2. Create a GitHub Environment named `testpypi` in repository settings (**Settings > Environments**).
  3. No secrets needed; authentication happens securely via OIDC.

- **Method B: API Token**:
  1. Generate an API token on [TestPyPI](https://test.pypi.org/manage/account/token/).
  2. Add it to your GitHub repository secrets (**Settings > Secrets and variables > Actions**) named `TESTPYPI_API_TOKEN`.

#### Creating a Release

```bash
# 1. Bump version in pyproject.toml (e.g. 0.1.0)
uv version 0.1.0

# 2. Commit and tag
git commit -am "chore: release v0.1.0"
git tag v0.1.0

# 3. Push tag to GitHub to trigger the release workflow
git push origin v0.1.0
```

## Project Structure

```text
ci-cd-playground/
├── .github/
│   └── workflows/
│       ├── cd.yml                  # Continuous delivery pipeline (main -> staging -> production)
│       ├── ci.yml                  # Reusable CI workflow (lint, typecheck, test, build)
│       ├── container-security.yml  # Container build & Trivy scan on PRs
│       ├── deploy.yml              # Reusable Render deployment workflow
│       ├── docker-publish.yml      # Reusable Docker build, test & GHCR publish
│       └── release.yml             # Release workflow (CI, release container, TestPyPI & GitHub)
├── src/
│   └── ci_cd_playground/
│       ├── __init__.py             # Package entrypoint and sample code
│       ├── app.py                  # Minimal FastAPI application
│       └── py.typed                # PEP 561 typing marker
├── tests/
│   ├── __init__.py
│   ├── test_app.py                 # FastAPI endpoint and factory tests
│   └── test_ci_test.py             # Base unit tests
├── .gitignore
├── .python-version                 # Default local Python version
├── pyproject.toml                  # Project configuration, dependencies, and tool settings
├── uv.lock                         # Deterministic dependency lockfile
└── README.md
```
