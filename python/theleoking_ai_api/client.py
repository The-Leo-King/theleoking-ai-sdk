from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any, Literal, Optional
from urllib.parse import quote, urlparse, urlunparse

import httpx

LEO_KING_WEBHOOK_SIGNATURE_HEADER = "TheLeoKing-Signature"
LEO_KING_WEBHOOK_SIGNATURE_VERSION = "v1"
LEO_KING_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300
PRODUCTION_API_BASE_URL = "https://api.theleokingai.com"
SANDBOX_API_BASE_URL = "https://sandbox.api.theleokingai.com"
ApiEnvironment = Literal["production", "sandbox"]


class TheLeoKingApiError(Exception):
    def __init__(self, status_code: int, payload: Any) -> None:
        self.status_code = status_code
        self.payload = payload
        message = payload.get("error", {}).get("message") if isinstance(payload, dict) else str(payload)
        super().__init__(message)


def create_leo_king_webhook_signature(payload: str, secret: str, timestamp: Optional[int] = None) -> str:
    normalized_secret = secret.strip()
    if not normalized_secret:
        raise ValueError("Webhook secret is required")
    signature_timestamp = timestamp if timestamp is not None else int(time.time())
    signature = _compute_webhook_hmac(payload, normalized_secret, signature_timestamp)
    return f"t={signature_timestamp},{LEO_KING_WEBHOOK_SIGNATURE_VERSION}={signature}"


def verify_leo_king_webhook_signature(
    payload: str,
    signature_header: Optional[str],
    secret: str,
    now: Optional[float] = None,
    tolerance_seconds: int = LEO_KING_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
) -> bool:
    if not signature_header or not secret.strip():
        return False
    parts = _parse_webhook_signature_header(signature_header)
    if not parts or not parts["signatures"]:
        return False
    timestamp = parts["timestamp"]
    current_time = now if now is not None else time.time()
    if abs(int(current_time) - timestamp) > tolerance_seconds:
        return False
    expected = _compute_webhook_hmac(payload, secret.strip(), timestamp)
    return any(hmac.compare_digest(signature, expected) for signature in parts["signatures"])


class TheLeoKingApi:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 60.0,
        environment: Optional[ApiEnvironment] = None,
    ) -> None:
        resolved_environment, resolved_base_url = _resolve_api_configuration(
            api_key=api_key,
            base_url=base_url,
            environment=environment,
        )
        self.api_key = api_key
        self.base_url = resolved_base_url
        self.timeout = timeout
        self.environment = resolved_environment

    def api_index(self) -> dict[str, Any]:
        return self._public_get("/v1")

    def open_api(self) -> dict[str, Any]:
        return self._public_get("/v1/openapi")

    def status(self) -> dict[str, Any]:
        return self._public_get("/v1/status")

    def sla(self) -> dict[str, Any]:
        return self._public_get("/v1/sla")

    def incidents(self) -> dict[str, Any]:
        return self._public_get("/v1/incidents")

    def access_control(self) -> dict[str, Any]:
        return self._public_get("/v1/access-control")

    def onboarding(self) -> dict[str, Any]:
        return self._public_get("/v1/onboarding")

    def versioning(self) -> dict[str, Any]:
        return self._public_get("/v1/versioning")

    def examples(self) -> dict[str, Any]:
        return self._public_get("/v1/examples")

    def support(self) -> dict[str, Any]:
        return self._public_get("/v1/support")

    def sdks(self) -> dict[str, Any]:
        return self._public_get("/v1/sdks")

    def migrations(self) -> dict[str, Any]:
        return self._public_get("/v1/migrations")

    def procurement(self) -> dict[str, Any]:
        return self._public_get("/v1/procurement")

    def conformance(self) -> dict[str, Any]:
        return self._public_get("/v1/conformance")

    def data_processing(self) -> dict[str, Any]:
        return self._public_get("/v1/data-processing")

    def compliance(self) -> dict[str, Any]:
        return self._public_get("/v1/compliance")

    def ai_governance(self) -> dict[str, Any]:
        return self._public_get("/v1/ai-governance")

    def changelog(self) -> dict[str, Any]:
        return self._public_get("/v1/changelog")

    def webhooks(self) -> dict[str, Any]:
        return self._public_get("/v1/webhooks")

    def errors(self) -> dict[str, Any]:
        return self._public_get("/v1/errors")

    def postman_collection(self) -> dict[str, Any]:
        return self._public_get("/v1/postman")

    def audience_insights(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/audience/insights", payload, idempotency_key)

    def natal_chart(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/charts/natal", payload, idempotency_key)

    def current_sky(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/charts/current-sky", payload, idempotency_key)

    def transit_chart(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/charts/transits", payload, idempotency_key)

    def synastry_chart(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/charts/synastry", payload, idempotency_key)

    def compatibility_score(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/compatibility/score", payload, idempotency_key)

    def lunar_phase(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/lunar/phase", payload, idempotency_key)

    def helio_patterns(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/helio/patterns", payload, idempotency_key)

    def future_partner_vision(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/experiences/future-partner-vision", payload, idempotency_key)

    def love_reveal(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/experiences/love-reveal", payload, idempotency_key)

    def crystal_ball(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/experiences/crystal-ball", payload, idempotency_key)

    def oracle_ask(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/oracle/ask", payload, idempotency_key)

    def tarot_draw(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/tarot/draw", payload, idempotency_key)

    def past_life_reading(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/past-life/reading", payload, idempotency_key)

    def daily_horoscope(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/horoscope/daily", payload, idempotency_key)

    def timing_windows(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/timing/windows", payload, idempotency_key)

    def world_signals(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/world/signals", payload, idempotency_key)

    def create_world_signals_job(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/world/signals/jobs", payload, idempotency_key)

    def get_world_signals_job(self, job_id: str) -> dict[str, Any]:
        return self._get(f"/v1/world/signals/jobs/{quote(job_id, safe='')}")

    def mundane_hot_zones(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/mundane/hot-zones", payload, idempotency_key)

    def mundane_event_analysis(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        return self._post("/v1/mundane/analyze-event", payload, idempotency_key)

    def _post(self, path: str, payload: dict[str, Any], idempotency_key: Optional[str]) -> dict[str, Any]:
        normalized_idempotency_key = _require_idempotency_key(idempotency_key)
        headers = self._auth_headers()
        headers["Content-Type"] = "application/json"
        headers["Idempotency-Key"] = normalized_idempotency_key

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(f"{self.base_url}{path}", headers=headers, json=payload)

        try:
            body: Any = response.json()
        except ValueError:
            body = response.text

        if response.status_code >= 400:
            raise TheLeoKingApiError(response.status_code, body)

        return body

    def _get(self, path: str) -> dict[str, Any]:
        headers = self._auth_headers()

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(f"{self.base_url}{path}", headers=headers)

        try:
            body: Any = response.json()
        except ValueError:
            body = response.text

        if response.status_code >= 400:
            raise TheLeoKingApiError(response.status_code, body)

        return body

    def _public_get(self, path: str) -> dict[str, Any]:
        headers = {
            "Accept": "application/json",
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(f"{self.base_url}{path}", headers=headers)

        try:
            body: Any = response.json()
        except ValueError:
            body = response.text

        if response.status_code >= 400:
            raise TheLeoKingApiError(response.status_code, body)

        return body

    def _auth_headers(self) -> dict[str, str]:
        if not self.api_key:
            raise TheLeoKingApiError(
                401,
                {
                    "request_id": "client",
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "api_key is required for authenticated API routes",
                    },
                },
            )

        return {
            "x-api-key": self.api_key,
        }


def _resolve_api_configuration(
    api_key: Optional[str],
    base_url: Optional[str],
    environment: Optional[ApiEnvironment],
) -> tuple[ApiEnvironment, str]:
    parsed_base_url = _parse_base_url(base_url) if base_url is not None else None
    canonical_environment = _environment_for_canonical_host(parsed_base_url.hostname) if parsed_base_url else None
    resolved_environment = environment or canonical_environment or "production"

    if resolved_environment not in ("production", "sandbox"):
        raise ValueError("environment must be either production or sandbox")

    if canonical_environment and canonical_environment != resolved_environment:
        raise ValueError("The selected base URL is incompatible with the selected environment")

    if parsed_base_url and canonical_environment and parsed_base_url.scheme != "https":
        raise ValueError("Canonical API base URLs must use HTTPS")

    if parsed_base_url and not canonical_environment and not _is_allowed_custom_host(parsed_base_url.hostname):
        raise ValueError("Custom base URLs must use localhost, loopback, or a .test host")

    resolved_base_url = (
        _normalize_base_url(parsed_base_url)
        if parsed_base_url
        else SANDBOX_API_BASE_URL if resolved_environment == "sandbox" else PRODUCTION_API_BASE_URL
    )
    _assert_api_key_environment(api_key, resolved_environment)

    return resolved_environment, resolved_base_url


def _require_idempotency_key(value: Optional[str]) -> str:
    normalized = value.strip() if value else ""

    if not normalized:
        raise ValueError(
            "idempotency_key is required for paid POST methods; reuse it for a retry of the same request"
        )

    if len(normalized) > 255:
        raise ValueError("idempotency_key cannot exceed 255 characters")

    return normalized


def _parse_base_url(value: str):
    parsed = urlparse(value)

    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("base_url must be an absolute HTTP(S) URL")

    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("base_url must not include credentials, a query string, or a fragment")

    if not parsed.hostname:
        raise ValueError("base_url must be an absolute HTTP(S) URL")

    return parsed


def _environment_for_canonical_host(hostname: str) -> Optional[ApiEnvironment]:
    normalized_hostname = hostname.lower()

    if normalized_hostname == "api.theleokingai.com":
        return "production"
    if normalized_hostname == "sandbox.api.theleokingai.com":
        return "sandbox"

    return None


def _is_allowed_custom_host(hostname: str) -> bool:
    normalized_hostname = hostname.lower().strip("[]")

    return (
        normalized_hostname == "localhost"
        or normalized_hostname.endswith(".localhost")
        or normalized_hostname == "::1"
        or normalized_hostname == "0:0:0:0:0:0:0:1"
        or _is_ipv4_loopback(normalized_hostname)
        or normalized_hostname == "test"
        or normalized_hostname.endswith(".test")
    )


def _is_ipv4_loopback(hostname: str) -> bool:
    parts = hostname.split(".")

    return (
        len(parts) == 4
        and parts[0] == "127"
        and all(part.isdigit() and 0 <= int(part) <= 255 for part in parts)
    )


def _normalize_base_url(parsed_base_url) -> str:
    path = parsed_base_url.path.rstrip("/")

    return urlunparse((parsed_base_url.scheme, parsed_base_url.netloc, path, "", "", ""))


def _assert_api_key_environment(api_key: Optional[str], environment: ApiEnvironment) -> None:
    if api_key is None:
        return

    if not isinstance(api_key, str):
        raise ValueError("API keys must use the lk_live_ or lk_test_ prefix")

    key_environment: Optional[ApiEnvironment]
    if api_key.startswith("lk_live_"):
        key_environment = "production"
    elif api_key.startswith("lk_test_"):
        key_environment = "sandbox"
    else:
        key_environment = None

    if not key_environment:
        raise ValueError("API keys must use the lk_live_ or lk_test_ prefix")

    if key_environment != environment:
        raise ValueError("API key prefix is incompatible with the selected environment")


def _parse_webhook_signature_header(signature_header: str) -> Optional[dict[str, Any]]:
    timestamp: Optional[int] = None
    signatures: list[str] = []
    pairs = [part.strip() for part in signature_header.split(",") if part.strip()]
    for pair in pairs:
        if "=" not in pair:
            return None
        key, value = pair.split("=", 1)
        if key == "t":
            timestamp = _parse_webhook_timestamp(value)
            continue
        if key == LEO_KING_WEBHOOK_SIGNATURE_VERSION and _is_hex_sha256(value):
            signatures.append(value.lower())
    if timestamp is None:
        return None
    return {"timestamp": timestamp, "signatures": signatures}


def _parse_webhook_timestamp(value: str) -> Optional[int]:
    if not value.isdigit():
        return None
    timestamp = int(value)
    if timestamp <= 0:
        return None
    return timestamp


def _compute_webhook_hmac(payload: str, secret: str, timestamp: int) -> str:
    signed_payload = f"{timestamp}.{payload}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()


def _is_hex_sha256(value: str) -> bool:
    if len(value) != 64:
        return False
    return all(character in "0123456789abcdefABCDEF" for character in value)
