## Local Development & Quality Engineering

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (v0.5+ recommended)
- Python 3.10+ (automatically managed by `uv`)
- Docker (optional, for local container validation)

### 1. Environment Setup

Clone the repository and synchronize virtual environment dependencies:

```bash
git clone https://github.com/JohnStephens1/ci-cd-playground.git
cd ci-cd-playground
uv sync
```

### 2. Local Quality & Security Commands

All checks and tools run through `uv`:

| Category | Tool | Command | Description |
| :--- | :--- | :--- | :--- |
| **Linting** | Ruff | `uv run ruff check .` | Executes linting rules and imports ordering |
| **Linting (Fix)** | Ruff | `uv run ruff check --fix .` | Automatically fixes auto-fixable lint issues |
| **Formatting** | Ruff | `uv run ruff format --check .` | Verifies code conforms to formatting standards |
| **Formatting (Fix)** | Ruff | `uv run ruff format .` | Formats all source files |
| **Type Checking** | Pyright | `uv run pyright` | Runs static type analysis in standard mode |
| **Testing** | Pytest | `uv run pytest` | Runs unit tests with test summaries |
| **Coverage** | Pytest-Cov | `uv run pytest --cov=ci_cd_playground --cov-branch --cov-report=term-missing` | Runs tests with branch coverage metrics |
| **SAST Scan** | Bandit | `uv run bandit -c pyproject.toml -r src` | Scans Python code for security vulnerabilities |
| **Workflow Audit**| Zizmor | `uv run zizmor --format=github .` | Audits GitHub Actions workflows for security hazards |
| **Pre-commit** | pre-commit | `uv run pre-commit run --all-files` | Runs local git hooks (ruff, yamllint, actionlint) |
| **Packaging** | uv build | `uv build` | Builds sdist and wheel packages into `dist/` |

### 3. Running the Application Locally

Start the development server with live reload:

```bash
uv run uvicorn ci_cd_playground.app:app --reload --port 8000
```

Access the application:
- Interactive frontend: `http://127.0.0.1:8000/`
- Health check endpoint: `http://127.0.0.1:8000/health`
- Version endpoint: `http://127.0.0.1:8000/version`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 4. Running the Container Locally

Build and run the multi-stage, non-root Docker container:

```bash
# Build the container image
docker build -t ci-cd-playground:local .

# Run container with restricted privileges
docker run -d \
  --name ci-cd-playground \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  -p 8000:8000 \
  ci-cd-playground:local

# Verify container health
curl http://localhost:8000/health
```
