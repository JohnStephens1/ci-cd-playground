FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --frozen --no-dev --no-install-project

COPY src/ ./src/

RUN uv sync --frozen --no-dev

# Create and use a non-root user
RUN useradd --create-home appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

ARG APP_VERSION=unknown
ARG GIT_SHA=unknown

ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}

CMD ["sh", "-c", "uv run --no-sync uvicorn ci_cd_playground.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
