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

### 3. Build Distribution Packages

Build both the source distribution (`.tar.gz`) and wheel (`.whl`):

```bash
uv build
```

The output packages will be located in the `dist/` directory.

## GitHub Actions Workflows

### 1. Continuous Integration (CI) — [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

Runs automatically on pushes and pull requests to `main`, and functions as a **reusable workflow** (`workflow_call`):

1. **Lint & Format (Ruff)**: Verifies formatting and runs linting rules.
2. **Type Check (Pyright)**: Validates static typing rules across `src/` and `tests/`.
3. **Matrix Tests (Pytest)**: Runs the test suite across supported Python versions (`3.10`, `3.11`, `3.12`, `3.13`) using `astral-sh/setup-uv`.
4. **Build (uv build)**: Builds source distributions and wheels, performs a smoke test by installing and importing the wheel in an isolated environment, and uploads build artifacts (`dist-packages`).

### 2. Release & TestPyPI Publishing — [`.github/workflows/release.yml`](.github/workflows/release.yml)

Triggers whenever a version tag matching `v*` (e.g. `v0.1.0`) is pushed to the repository (or via manual `workflow_dispatch`):

1. **CI Validation & Build**: Directly reuses [`.github/workflows/ci.yml`](.github/workflows/ci.yml) as a reusable workflow (`uses: ./.github/workflows/ci.yml`). This ensures all linting, typechecking, multi-version tests, and package builds run identically without code duplication.
2. **Publish to TestPyPI**:
   - Downloads the pre-built `dist-packages` artifact from CI.
   - Publishes to TestPyPI using `uv publish --index testpypi`.
   - Supports both **Trusted Publishing** (OIDC via `id-token: write` and GitHub environment `testpypi`) and **API Token** (via `TESTPYPI_API_TOKEN` secret).
3. **Create GitHub Release**:
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
ci-test/
├── .github/
│   └── workflows/
│       ├── ci.yml          # Reusable CI workflow (lint, typecheck, test, build)
│       └── release.yml     # Release workflow (calls ci.yml, publishes to TestPyPI & GitHub)
├── src/
│   └── ci_test/
│       ├── __init__.py     # Package entrypoint and sample code
│       └── py.typed        # PEP 561 typing marker
├── tests/
│   ├── __init__.py
│   └── test_ci_test.py     # Pytest test cases
├── .gitignore
├── .python-version         # Default local Python version
├── pyproject.toml          # Project configuration, dependencies, and tool settings
├── uv.lock                 # Deterministic dependency lockfile
└── README.md
```
