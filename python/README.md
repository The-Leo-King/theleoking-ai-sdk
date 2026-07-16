# The Leo King API Python SDK

Alpha Python client source for The Leo King Business Intelligence API.

## Install

```bash
pip install theleoking-ai-api
```

For local source testing inside this repo:

```bash
cd sdk/python
pip install -e .
```

## Quickstart

```python
import os
from theleoking_ai_api import TheLeoKingApi

api = TheLeoKingApi(
    api_key=os.environ["LEOKING_API_KEY"],
)

result = api.natal_chart(
    {
        "subject": {
            "id": "subject_123",
            "dob": "1990-07-23",
            "tob": "14:30",
            "pob": "New York, US",
        }
    },
    idempotency_key="natal-subject-123-v1",
)

print(result["request_id"])
print(result["usage"]["credits"])
```

## Environments

The client defaults to the production gateway,
`https://api.theleokingai.com`. Production keys must use the `lk_live_`
prefix.

Select the isolated sandbox explicitly for `lk_test_` keys:

```python
sandbox_api = TheLeoKingApi(
    api_key=os.environ["LEOKING_SANDBOX_API_KEY"],
    environment="sandbox",
)
# Requests use https://sandbox.api.theleokingai.com
```

An explicit canonical sandbox `base_url` also selects the sandbox environment.
The client rejects a mismatched `lk_live_`/`lk_test_` key and environment before
any request, without including the key in the error.

For local integration tests, use an explicit `localhost`, loopback, or `.test`
base URL and select its intended environment:

```python
local_sandbox_api = TheLeoKingApi(
    api_key="lk_test_local_example",
    base_url="http://localhost:4010/api",
    environment="sandbox",
)
```

Arbitrary custom hosts are rejected so a production or sandbox key cannot be
accidentally sent to an unrelated endpoint.

## Public Metadata

These methods do not require an API key:

```python
api = TheLeoKingApi(base_url="https://api.theleokingai.com")

api.api_index()
api.open_api()
api.status()
api.sla()
api.incidents()
api.access_control()
api.onboarding()
api.versioning()
api.examples()
api.support()
api.sdks()
api.migrations()
api.procurement()
api.conformance()
api.data_processing()
api.compliance()
api.ai_governance()
api.changelog()
api.webhooks()
api.errors()
api.postman_collection()
```

## Webhook Verification

Partner webhook delivery is not live yet, but the SDK includes the signed
callback verification helper for enterprise integration prep.

```python
import os
from theleoking_ai_api import verify_leo_king_webhook_signature

raw_body = request.get_data(as_text=True)
is_valid = verify_leo_king_webhook_signature(
    payload=raw_body,
    signature_header=request.headers.get("TheLeoKing-Signature"),
    secret=os.environ["LEOKING_WEBHOOK_SECRET"],
)

if not is_valid:
    raise ValueError("Invalid The Leo King webhook signature")

event = request.get_json()
```

Verification uses `HMAC-SHA256` over `timestamp.raw_body`, accepts
`TheLeoKing-Signature: t=<unix>,v1=<hex_hmac_sha256>`, and rejects timestamps
outside the 300 second replay window.

## Authenticated Routes

Authenticated methods require `api_key` and send it as `x-api-key`.

POST methods require an `idempotency_key`; the client sends it as `Idempotency-Key` and rejects a missing or blank key before making a network request. Reuse the same key only when retrying the same request body.

Implemented helpers cover the currently shipped public catalog routes:

- `audience_insights`
- `natal_chart`
- `current_sky`
- `transit_chart`
- `synastry_chart`
- `compatibility_score`
- `lunar_phase`
- `helio_patterns`
- `future_partner_vision`
- `love_reveal`
- `crystal_ball`
- `oracle_ask`
- `tarot_draw`
- `past_life_reading`
- `daily_horoscope`
- `timing_windows`
- `world_signals`
- `create_world_signals_job`
- `get_world_signals_job`
- `mundane_hot_zones`
- `mundane_event_analysis`

Planned-only routes are intentionally not exposed until the API route exists.

## Error Handling

Failed API responses raise `TheLeoKingApiError` with:

- `status_code`
- `payload`

Use `/api/v1/errors` or `api.errors()` for the public error catalog.

## License

This alpha SDK is licensed under [Apache-2.0](LICENSE).
