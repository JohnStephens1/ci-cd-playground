"""Tests for the ci_cd_playground package."""

from ci_cd_playground import add, hello


def test_hello_default() -> None:
    assert hello() == "Hello, world!"


def test_hello_custom() -> None:
    assert hello("Antigravity") == "Hello, Antigravity!"


def test_add_integers() -> None:
    assert add(2, 3) == 5


def test_add_floats() -> None:
    assert add(1.5, 2.5) == 4.0
