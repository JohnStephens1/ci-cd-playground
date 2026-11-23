## GitHub Actions Workflows & Pipeline Architecture

The repository's automation is organized into modular, reusable, and decoupled workflows with minimal permissions (`permissions: {}` by default):

### 1. Continuous Integration — [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

Runs on pull requests to `main` and functions as a reusable workflow (`workflow_call`):

- **Concurrency Control**: Automatically cancels obsolete in-progress CI runs on active pull requests.
- **Lint & Format Verification (`ruff`)**: Enforces formatting standards and linting rules across all Python modules.
- **Static Type Checking (`pyright`)**: Validates type safety across `src/` and `tests/` targeting Python 3.10+ in standard mode.
- **Multi-Version Test Matrix (`pytest`)**: Executes unit and integration test suites against Python `3.10`, `3.11`, `3.12`, and `3.13` with branch coverage enforcement (fail threshold: 80%), generating JUnit XML and HTML coverage reports, and uploading coverage data to Codecov on Python 3.13.
- **Workflow Security Audit (`zizmor`)**: Scans GitHub Actions workflow definitions for privilege escalation, runner vulnerabilities, and workflow syntax hazards.
- **Static Application Security Testing (`bandit`)**: Scans Python source code against common vulnerability classes.
- **Package Build & Smoke-Test**: Builds distribution packages (`uv build --no-sources`) and installs them in isolated clean-room virtual environments (`.venv-wheel` and `.venv-sdist`) to verify installation integrity and module importability.
- **Docker Security Scan**: On pull requests, triggers container build and vulnerability scanning via the composite image validator.

### 2. Container Security & Image Validation — [`.github/actions/validate-image`](.github/actions/validate-image/action.yaml)

A hardened composite GitHub Action that audits and verifies pre-built container images before publication or deployment:

- **Input Validation**: Sanitizes and validates image tags via POSIX regex rules.
- **Vulnerability Scanning (`trivy`)**: Scans the container filesystem and libraries for `CRITICAL` and `HIGH` vulnerabilities against repository policies (`trivy.yml` and `.trivyignore`).
- **Hardened Runtime Execution**: Launches the container under strict sandboxing flags (`--read-only`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`).
- **Health Verification**: Polls the container's `/health` endpoint until the application is ready, with automatic log dumping on timeout.
- **Automated Teardown**: Guarantees cleanup of ephemeral test containers.

### 3. Docker Build, Publish & Attestation — [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)

A reusable workflow (`workflow_call`) encapsulating secure container delivery:

- **Isolated Build**: Builds the production image with `APP_VERSION` and `GIT_SHA` arguments using Docker Buildx.
- **Pre-Publish Validation**: Calls `validate-image` to run Trivy vulnerability scanning and runtime smoke testing before any registry authentication occurs.
- **Immutable Digest Publishing**: Pushes the image to GitHub Container Registry (GHCR) with tags for `${GITHUB_SHA}`, `latest`, and optional semantic tags, recording the immutable `sha256` image digest.
- **SLSA Provenance Attestation**: Attests build provenance via `actions/attest` and publishes the signed attestation directly to GHCR.
- **SBOM Attestation**: Generates an SPDX 2.3 JSON SBOM with Anchore Syft, attests it with `actions/attest`, and pushes the attestation to GHCR.

### 4. Deploy Service — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

A unified, reusable deployment engine (`workflow_call` and manual `workflow_dispatch`) for Render environments:

- **Environment Isolation**: Targets GitHub Environments (`staging` or `production`), enabling environment secrets and optional manual review protection rules.
- **Pre-Deployment Cryptographic Verification**: Verifies SLSA provenance and SBOM attestations of the OCI image directly from GHCR using `gh attestation verify` before initiating deployment.
- **Deployment State Capture**: Queries the Render REST API to record the current live deployment ID for failure recovery.
- **Zero-Trust Deploy Trigger**: Triggers deployment via Render REST API referencing the exact immutable image digest (`imageUrl: ghcr.io/...@sha256:...`).
- **Status Polling**: Monitors Render deployment lifecycle until reaching `live` status or failing.
- **Post-Deployment Health & Version Verification**:
  - Polls `/health` to confirm HTTP 200 and `{"status": "ok"}`.
  - Polls `/version` to ensure the deployed service reports the exact expected Git commit SHA.
- **Automated Rollback Trigger**: If a deployment successfully reaches `live` on Render but fails subsequent health/version smoke tests, it automatically invokes `rollback.yml`.

### 5. Operational Recovery & Automated Rollback — [`.github/workflows/rollback.yml`](.github/workflows/rollback.yml)

A dedicated operational recovery workflow (`workflow_call`):

- **Targeted Rollback**: Communicates with the Render REST API (`/services/{service_id}/rollback`) to roll back the service to the previously recorded live deployment ID.
- **Recovery Monitoring**: Polls deployment status until the rollback build transitions to `live`.
- **Post-Rollback Health Check**: Executes automated health checks against the restored service to guarantee that operational availability has been recovered.

### 6. Continuous Delivery — [`.github/workflows/cd.yml`](.github/workflows/cd.yml)

Triggers automatically on pushes to `main` and via manual `workflow_dispatch` with target selection (`both`, `staging`, `production`):

- **Concurrency Protection**: Enforces non-overlapping deployment runs (`cancel-in-progress: false`) to prevent race conditions across environments.
- **Sequential Quality Gating**:
  1. `ci`: Validates linting, typing, matrix tests, and security audits.
  2. `docker-publish`: Builds, scans, publishes, and attests the container image.
  3. `deploy-staging`: Deploys to the staging environment and verifies health/commit.
  4. `deploy-production`: Requires staging success before promoting the identical image digest to production.

### 7. Trusted Package Builder (SLSA Level 3) — [`.github/workflows/package-build.yml`](.github/workflows/package-build.yml)

A reusable builder workflow (`workflow_call`) that enforces isolation and build platform integrity:

- **Single-Run Build**: Builds source distribution (`.tar.gz`) and wheel (`.whl`) strictly once using `uv build --no-sources`.
- **Cryptographic Digest Computation**: Generates `checksums/SHA256SUMS` for distribution artifacts.
- **Individual SBOM Generation**: Generates independent SPDX 2.3 JSON and human-readable text SBOMs for wheel and sdist using Anchore Syft.
- **SLSA Build Provenance Attestation**: Generates signed SLSA Level 3 provenance via `actions/attest`, bound to both distribution digests and exported to `attestations/package-provenance.intoto.jsonl`.
- **Individual SBOM Attestations**: Cryptographically signs each package's SBOM independently, binding them to their respective distribution digests.
- **Artifact Bundling**: Preserves all binaries, SBOMs, attestations, and checksums as pipeline artifacts.

### 8. Release & Multi-Channel Distribution — [`.github/workflows/release.yml`](.github/workflows/release.yml)

Triggers on semantic version tags (`v*`) or manual `workflow_dispatch`:

- **Reference & Version Validation**: Cryptographically verifies tag resolution to commit SHA and validates that the Git tag strictly matches `project.version` in `pyproject.toml`.
- **Trusted Builder Invocation**: Calls `package-build.yml` to produce immutable artifacts and attestations.
- **Clean-Room Testing**: Installs built wheel and sdist packages into isolated virtual environments to verify runtime execution.
- **Comprehensive Pre-Distribution Verification**:
  - Verifies SHA-256 digests against `SHA256SUMS`.
  - Verifies SLSA provenance and SBOM attestations online via GitHub API / Sigstore and offline using bundled attestation files.
  - Enforces `--signer-workflow` restrictions.
  - Validates SPDX JSON schemas and human-readable SBOM contents.
- **TestPyPI Publishing**:
  - Publishes distributions using OIDC Trusted Publishing.
  - Performs clean-room installation smoke testing from TestPyPI.
- **Production PyPI Publishing**:
  - Gated by the `pypi` GitHub Environment.
  - Generates PEP 740 digital provenance attestations via `astral-sh/attest-action`.
  - Publishes distributions to PyPI via `uv publish`.
- **GitHub Release Creation**: Publishes release notes and attaches distributions (`dist/`), SBOMs (`sbom/`), cryptographic attestations (`attestations/`), and checksums (`checksums/SHA256SUMS`).

### 9. Dependency Maintenance — [`.github/dependabot.yml`](.github/dependabot.yml)

Automates weekly vulnerability mitigation and dependency updates with cooldowns:

- **Python Ecosystem (`uv`)**: Monitors and groups minor and patch updates for application dependencies.
- **GitHub Actions**: Tracks action updates pinned to commit SHAs.
- **Docker**: Scans base container image versions for security patches.
