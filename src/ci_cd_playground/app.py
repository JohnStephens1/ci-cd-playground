"""FastAPI application for ci_cd_playground."""

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="CI/CD Playground API",
        description="A minimal FastAPI application.",
        version="0.1.1",
    )

    @application.get("/")
    def read_root() -> dict[str, str]:
        """Root endpoint returning a greeting."""
        return {"message": "Hello, world!"}

    @application.get("/health")
    def health_check() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "ok"}

    @application.get("/hello/{name}")
    def greet(name: str) -> dict[str, str]:
        """Greeting endpoint accepting a path parameter."""
        return {"message": f"Hello, {name}!"}

    return application


app = create_app()
