# ci-test

A Python project configured with [`uv`](https://docs.astral.sh/uv/), [`ruff`](https://docs.astral.sh/ruff/), [`pyright`](https://microsoft.github.io/pyright/), and [`pytest`](https://docs.pytest.org/), complete with GitHub Actions Continuous Integration (CI).

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

## Continuous Integration (CI)

The GitHub Actions workflow is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs on pushes and pull requests to `main`:

1. **Lint & Format (Ruff)**: Verifies formatting and runs linting rules.
2. **Type Check (Pyright)**: Validates static typing rules across `src/` and `tests/`.
3. **Matrix Tests (Pytest)**: Runs the test suite across supported Python versions (`3.10`, `3.11`, `3.12`, `3.13`) using `astral-sh/setup-uv`.
4. **Build (uv build)**: Builds source distributions and wheels, performs a smoke test by installing and importing the wheel in an isolated environment, and uploads build artifacts (`dist-packages`).

## Project Structure

```text
ci-test/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI workflow
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
