FROM python:3.13-slim-trixie AS build

# apply OS security updates
RUN apt-get update \
    && apt-get install -y --only-upgrade apt \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --locked --no-dev --no-install-project

COPY src/ ./src/

RUN uv sync --locked --no-dev --no-editable


FROM python:3.13-slim-trixie AS runtime

# apply OS security updates
RUN apt-get update \
    && apt-get install -y --only-upgrade apt \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/.venv /app/.venv

ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

ARG APP_VERSION=unknown
ARG GIT_SHA=unknown

ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}

CMD ["sh", "-c", "uvicorn ci_cd_playground.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
