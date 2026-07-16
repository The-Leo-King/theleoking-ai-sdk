# The Leo King API Node SDK

Alpha TypeScript client source for The Leo King Business Intelligence API.

## Install

```bash
npm install @theleoking/ai-api
```

For local source testing inside this repo:

```bash
cd sdk/node
npm install
npm run build
```

## Quickstart

```ts
import { TheLeoKingApi } from "@theleoking/ai-api";

const api = new TheLeoKingApi({
  apiKey: process.env.LEOKING_API_KEY,
});

const result = await api.natalChart(
  {
    subject: {
      id: "subject_123",
      dob: "1990-07-23",
      tob: "14:30",
      pob: "New York, US",
    },
  },
  "natal-subject-123-v1",
);

console.log(result.request_id);
console.log(result.usage.credits);
```

## Environments

The client defaults to the production gateway,
`https://api.theleokingai.com`. Production keys must use the `lk_live_`
prefix.

Select the isolated sandbox explicitly for `lk_test_` keys:

```ts
const sandboxApi = new TheLeoKingApi({
  apiKey: process.env.LEOKING_SANDBOX_API_KEY,
  environment: "sandbox",
});
// Requests use https://sandbox.api.theleokingai.com
```

An explicit canonical sandbox `baseUrl` also selects the sandbox environment.
The client rejects a mismatched `lk_live_`/`lk_test_` key and environment before
any request, without including the key in the error.

For local integration tests, use an explicit `localhost`, loopback, or `.test`
base URL and select its intended environment:

```ts
const localSandboxApi = new TheLeoKingApi({
  apiKey: "lk_test_local_example",
  baseUrl: "http://localhost:4010/api",
  environment: "sandbox",
});
```

Arbitrary custom hosts are rejected so a production or sandbox key cannot be
accidentally sent to an unrelated endpoint.

## Public Metadata

These methods do not require an API key:

```ts
const api = new TheLeoKingApi({ baseUrl: "https://api.theleokingai.com" });

await api.apiIndex();
await api.openApi();
await api.status();
await api.sla();
await api.incidents();
await api.accessControl();
await api.onboarding();
await api.versioning();
await api.examples();
await api.support();
await api.sdks();
await api.migrations();
await api.procurement();
await api.conformance();
await api.dataProcessing();
await api.compliance();
await api.aiGovernance();
await api.changelog();
await api.webhooks();
await api.errors();
await api.postmanCollection();
```

## Webhook Verification

Partner webhook delivery is not live yet, but the SDK includes the signed
callback verification helper for enterprise integration prep.

```ts
import { verifyLeoKingWebhookSignature } from "@theleoking/ai-api";

const rawBody = await request.text();
const isValid = await verifyLeoKingWebhookSignature({
  payload: rawBody,
  signatureHeader: request.headers.get("TheLeoKing-Signature"),
  secret: process.env.LEOKING_WEBHOOK_SECRET!,
});

if (!isValid) {
  throw new Error("Invalid The Leo King webhook signature");
}

const event = JSON.parse(rawBody);
```

Verification uses `HMAC-SHA256` over `timestamp.raw_body`, accepts
`TheLeoKing-Signature: t=<unix>,v1=<hex_hmac_sha256>`, and rejects timestamps
outside the 300 second replay window.

## Authenticated Routes

Authenticated methods require `apiKey` and send it as `x-api-key`.

POST methods require an `idempotencyKey`; the client sends it as `Idempotency-Key` and rejects a missing or blank key before making a network request. Reuse the same key only when retrying the same request body.

Implemented helpers cover the currently shipped public catalog routes:

- `audienceInsights`
- `natalChart`
- `currentSky`
- `transitChart`
- `synastryChart`
- `compatibilityScore`
- `lunarPhase`
- `helioPatterns`
- `futurePartnerVision`
- `loveReveal`
- `crystalBall`
- `oracleAsk`
- `tarotDraw`
- `pastLifeReading`
- `dailyHoroscope`
- `timingWindows`
- `worldSignals`
- `createWorldSignalsJob`
- `getWorldSignalsJob`
- `mundaneHotZones`
- `mundaneEventAnalysis`

Planned-only routes are intentionally not exposed until the API route exists.

## Error Handling

Failed API responses throw `TheLeoKingApiError` with:

- `status`
- `requestId`
- `code`
- `details`

Use `/api/v1/errors` or `api.errors()` for the public error catalog.

## License

This alpha SDK is licensed under [Apache-2.0](LICENSE).
