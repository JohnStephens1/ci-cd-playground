"""Tests for the FastAPI application."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ci_cd_playground import app, create_app


@pytest.fixture
def client() -> TestClient:
    """Fixture providing a test client for the default app instance."""
    return TestClient(app)


def test_read_root(client: TestClient) -> None:
    """Test the root endpoint returns the default greeting."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, world!"}


def test_health_check(client: TestClient) -> None:
    """Test the health check endpoint returns status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_greet(client: TestClient) -> None:
    """Test the greeting endpoint with a custom path parameter."""
    response = client.get("/hello/Antigravity")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, Antigravity!"}


def test_create_app_factory() -> None:
    """Test that create_app produces a valid FastAPI instance."""
    custom_app = create_app()
    assert isinstance(custom_app, FastAPI)
    with TestClient(custom_app) as custom_client:
        response = custom_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
