"""ci_cd_playground package."""

from ci_cd_playground.app import app, create_app

__all__ = ["add", "app", "create_app", "hello"]


def hello(name: str = "world") -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"


def add(a: int | float, b: int | float) -> int | float:
    """Add two numbers."""
    return a + b
