"""Tests for _ContainerAppsProxyMiddleware."""

import pytest
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from app.main import _ContainerAppsProxyMiddleware


def _make_app() -> Starlette:
    """Minimal Starlette app that echoes the resolved client IP and scheme."""

    async def echo(request: Request) -> PlainTextResponse:
        host = request.client.host if request.client else "none"
        return PlainTextResponse(f"{host} {request.url.scheme}")

    app = Starlette(routes=[Route("/", echo)])
    app.add_middleware(_ContainerAppsProxyMiddleware)
    return app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(_make_app(), raise_server_exceptions=True)


class TestXForwardedFor:
    def test_single_entry_uses_it_as_client_ip(self, client: TestClient) -> None:
        resp = client.get("/", headers={"X-Forwarded-For": "1.2.3.4"})
        assert resp.text.startswith("1.2.3.4")

    def test_rightmost_entry_is_used(self, client: TestClient) -> None:
        """Spoofed IPs in earlier positions must be ignored."""
        resp = client.get("/", headers={"X-Forwarded-For": "9.9.9.9, 1.2.3.4"})
        assert resp.text.startswith("1.2.3.4")

    def test_rightmost_entry_with_whitespace(self, client: TestClient) -> None:
        resp = client.get("/", headers={"X-Forwarded-For": "9.9.9.9,  1.2.3.4  "})
        assert resp.text.startswith("1.2.3.4")

    def test_empty_xff_does_not_overwrite_client(self, client: TestClient) -> None:
        """An empty XFF value must not corrupt scope['client']."""
        # TestClient sets client to 127.0.0.1 by default.
        resp = client.get("/", headers={"X-Forwarded-For": ""})
        assert resp.text.startswith("testclient")

    def test_no_xff_header_leaves_client_unchanged(self, client: TestClient) -> None:
        resp = client.get("/")
        assert resp.text.startswith("testclient")

    def test_duplicate_xff_headers_uses_rightmost(self, client: TestClient) -> None:
        """Two separate XFF header lines must be joined; rightmost value wins."""
        resp = client.get(
            "/",
            headers=[
                ("x-forwarded-for", "9.9.9.9"),
                ("x-forwarded-for", "1.2.3.4"),
            ],
        )
        assert resp.text.startswith("1.2.3.4")


class TestXForwardedProto:
    def test_https_proto_is_applied(self, client: TestClient) -> None:
        resp = client.get("/", headers={"X-Forwarded-Proto": "https"})
        assert resp.text.endswith("https")

    def test_leftmost_proto_is_used(self, client: TestClient) -> None:
        resp = client.get("/", headers={"X-Forwarded-Proto": "https, http"})
        assert resp.text.endswith("https")

    def test_invalid_proto_is_ignored(self, client: TestClient) -> None:
        resp = client.get("/", headers={"X-Forwarded-Proto": "ftp"})
        assert resp.text.endswith("http")

    def test_no_proto_header_leaves_scheme_unchanged(self, client: TestClient) -> None:
        resp = client.get("/")
        assert resp.text.endswith("http")
