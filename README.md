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

### 6. Package Build & Provenance (SLSA Level 3) — [`.github/workflows/package-build.yml`](.github/workflows/package-build.yml)

A **trusted reusable builder workflow** (`workflow_call`) that enforces isolation and build platform integrity to meet **SLSA v1.0 Build Level 3**:
1. **Isolated Build**: Checks out the target commit and builds both distributions (`uv build --no-sources`) strictly once.
2. **Artifact Identification**: Computes cryptographic SHA-256 digests for both the wheel (`.whl`) and sdist (`.tar.gz`), generating `checksums/SHA256SUMS`.
3. **Individual SBOM Generation (Syft)**: Scans the actual built distributions independently with Syft to generate:
   - Machine-readable SPDX 2.3 JSON: `package-wheel.spdx.json` and `package-sdist.spdx.json`
   - Human-readable summary tables: `package-wheel.txt` and `package-sdist.txt`
4. **SLSA Build Provenance Attestation**: Generates cryptographically signed SLSA provenance via `actions/attest` backed by Sigstore, bound to both distribution digests and exported to `attestations/package-provenance.intoto.jsonl`.
5. **Individual SBOM Attestations**: Cryptographically signs each distribution's SBOM with `actions/attest`, binding the wheel SBOM to the wheel digest and the sdist SBOM to the sdist digest (`package-wheel-sbom.attestation.json` and `package-sdist-sbom.attestation.json`).
6. **Immutable Artifact Preservation**: Uploads distributions, SBOMs, attestations, and checksums as GitHub Actions artifacts for downstream pipeline consumption.

### 7. Release & PyPI/TestPyPI Publishing — [`.github/workflows/release.yml`](.github/workflows/release.yml)

Triggers whenever a version tag matching `v*` (e.g. `v0.1.0`) is pushed to the repository (or via manual `workflow_dispatch`):

1. **Validate Release Reference**: Validates git tag syntax, verifies that the tag cryptographically resolves to the target commit SHA, and ensures the git tag matches `project.version` in `pyproject.toml`.
2. **Build via Trusted Builder**: Invokes the isolated reusable workflow `package-build.yml` to produce immutable distributions, Syft SBOMs, SLSA Level 3 provenance, and SBOM attestations.
3. **Test Built Distributions**: Installs the built wheel in an isolated `.venv-wheel` and the built sdist in an isolated `.venv-sdist`, verifying installations and import smoke-tests before promotion.
4. **Comprehensive Automated Verification**:
   - Verifies distribution checksums against `SHA256SUMS`.
   - Verifies SLSA Build Provenance authenticity and subject digests online via GitHub API and offline using the bundled `.intoto.jsonl` file.
   - Verifies individual SBOM attestations online and offline using `--predicate-type https://spdx.dev/Document/v2.3`.
   - Validates that the builder signer workflow strictly matches `package-build.yml` (`--signer-workflow`).
5. **Publish to TestPyPI**:
   - Publishes verified distributions using Trusted Publishing (OIDC) via `uv publish --index testpypi`.
   - Performs a smoke-test installation in a clean environment from TestPyPI.
6. **Publish to PyPI**:
   - Gated by the `pypi` environment (with optional environment protection / manual approval rules).
   - Generates PEP 740 digital provenance attestations via `astral-sh/attest-action`.
   - Publishes verified distributions to PyPI via `uv publish`.
7. **Create GitHub Release**:
   - Creates a GitHub Release with release notes and attaches:
     - `dist/`: Wheel (`.whl`) and source distribution (`.tar.gz`)
     - `sbom/`: SPDX JSON and readable text SBOMs (`package-wheel.spdx.json`, `package-sdist.spdx.json`, `package-wheel.txt`, `package-sdist.txt`)
     - `attestations/`: `package-provenance.intoto.jsonl`, `package-wheel-sbom.attestation.json`, `package-sdist-sbom.attestation.json`
     - `checksums/`: `SHA256SUMS`

#### Configuring PyPI & TestPyPI Trusted Publishing

1. **TestPyPI**:
   - Add a Pending Publisher on [TestPyPI](https://test.pypi.org/manage/account/publishing/) targeting your GitHub repository and workflow (`release.yml`), with environment name `testpypi`.
   - Create a GitHub Environment named `testpypi` in repository settings (**Settings > Environments**).
2. **Production PyPI**:
   - Add a Publisher on [PyPI](https://pypi.org/manage/account/publishing/) targeting your GitHub repository and workflow (`release.yml`), with environment name `pypi`.
   - Create a GitHub Environment named `pypi` in repository settings (**Settings > Environments**), optionally configuring required reviewers for manual release sign-off.

#### Creating a Release

```bash
# 1. Bump version in pyproject.toml (e.g. 0.1.15)
uv version 0.1.15

# 2. Commit and tag
git commit -am "chore: release v0.1.15"
git tag v0.1.15

# 3. Push tag to GitHub to trigger the release workflow
git push origin v0.1.15
```

## Consumer Verification Guide

Consumers can independently verify the authenticity, integrity, SLSA Build Level 3 provenance, and SBOM attestations of released artifacts without trusting the build workflow's claims.

### 1. Verify SHA-256 Checksums

Download the release assets into a local directory and verify the distribution digests:

```bash
sha256sum -c SHA256SUMS
```

### 2. Verify SLSA Build Level 3 Provenance

Using the official [GitHub CLI](https://cli.github.com/) (`gh` v2.97.0+):

**Online Verification (via Sigstore transparency log):**

```bash
# Verify wheel provenance
gh attestation verify ci_cd_playground-0.1.15-py3-none-any.whl \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml

# Verify sdist provenance
gh attestation verify ci_cd_playground-0.1.15.tar.gz \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml
```

**Offline Verification (using the release attestation bundle):**

```bash
gh attestation verify ci_cd_playground-0.1.15-py3-none-any.whl \
  --bundle package-provenance.intoto.jsonl \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml

gh attestation verify ci_cd_playground-0.1.15.tar.gz \
  --bundle package-provenance.intoto.jsonl \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml
```

### 3. Verify Individual SBOM Attestations

Verify that the SBOMs were cryptographically signed and bound to the exact distribution files:

**Wheel SBOM Attestation:**

```bash
# Online
gh attestation verify ci_cd_playground-0.1.15-py3-none-any.whl \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3

# Offline
gh attestation verify ci_cd_playground-0.1.15-py3-none-any.whl \
  --bundle package-wheel-sbom.attestation.json \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3
```

**Sdist SBOM Attestation:**

```bash
# Online
gh attestation verify ci_cd_playground-0.1.15.tar.gz \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3

# Offline
gh attestation verify ci_cd_playground-0.1.15.tar.gz \
  --bundle package-sdist-sbom.attestation.json \
  --repo <OWNER>/ci-cd-playground \
  --signer-workflow <OWNER>/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3
```

### 4. Inspect Software Bill of Materials (SBOM)

Inspect the Syft-generated human-readable summary or machine-readable SPDX JSON:

```bash
# Human-readable table summary
cat package-wheel.txt
cat package-sdist.txt

# Query packages in SPDX JSON with jq
jq '.packages[] | {name: .name, versionInfo: .versionInfo}' package-wheel.spdx.json
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
│       ├── package-build.yml       # Reusable SLSA Level 3 builder (uv build, Syft SBOMs, attestations)
│       └── release.yml             # Release pipeline (validation, build, test, verify, TestPyPI, PyPI, GitHub)
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
