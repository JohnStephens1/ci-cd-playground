"""ci_cd_playground package."""

__all__ = ["add", "hello"]


def hello(name: str = "world") -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"


def add(a: int | float, b: int | float) -> int | float:
    """Add two numbers."""
    return a + b
