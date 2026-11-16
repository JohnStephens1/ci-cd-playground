FROM python:3.15.0-slim-trixie AS build

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --locked --no-dev --no-install-project

COPY src/ ./src/

RUN uv sync --locked --no-dev --no-editable


FROM python:3.15.0-slim-trixie AS runtime

# apply OS security updates
RUN apt-get update \
    && apt-get install -y --only-upgrade apt zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd --gid 10001 app \
    && useradd --uid 10001 \
       --gid 10001 \
       --no-create-home \
       --home-dir /nonexistent \
       --shell /usr/sbin/nologin \
       app

COPY --from=build --chown=10001:10001 /app/.venv /app/.venv

COPY static/ ./static/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

ARG APP_VERSION=unknown
ARG GIT_SHA=unknown

ENV APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA}

# Run as non-root.
USER 10001:10001

CMD ["sh", "-c", "exec uvicorn ci_cd_playground.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
