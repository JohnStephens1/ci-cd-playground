"""FastAPI application for ci_cd_playground."""

import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="CI/CD Playground API",
        description="A minimal FastAPI application.",
        version="0.1.1",
    )

    @application.get("/health")
    def health_check() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "ok"}

    @application.get("/version")
    def version() -> dict[str, str]:
        return {
            "version": os.getenv("APP_VERSION", "unknown"),
            "commit": os.getenv("GIT_SHA", "unknown"),
        }

    @application.get("/hello/{name}")
    def greet(name: str) -> dict[str, str]:
        """Greeting endpoint accepting a path parameter."""
        return {"message": f"Hello, {name}!"}

    application.mount("/", StaticFiles(directory="static", html=True), name="static")

    return application


app = create_app()
