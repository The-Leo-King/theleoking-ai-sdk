import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import {
  PRODUCTION_API_BASE_URL,
  SANDBOX_API_BASE_URL,
  TheLeoKingApi,
} from "../dist/index.js";

const sdkDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function successResponse() {
  return new Response(JSON.stringify({ name: "The Leo King API" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

async function requestedApiIndexUrl(options = {}) {
  let requestedUrl;
  const api = new TheLeoKingApi({
    ...options,
    fetchImpl: async (input) => {
      requestedUrl = String(input);
      return successResponse();
    },
  });

  await api.apiIndex();
  return requestedUrl;
}

describe("TheLeoKingApi sandbox configuration", () => {
  test("defaults to the production API gateway", async () => {
    assert.equal(await requestedApiIndexUrl(), `${PRODUCTION_API_BASE_URL}/v1`);
  });

  test("selects the sandbox gateway for a sandbox environment", async () => {
    assert.equal(
      await requestedApiIndexUrl({
        apiKey: "lk_test_example_key",
        environment: "sandbox",
      }),
      `${SANDBOX_API_BASE_URL}/v1`,
    );
  });

  test("allows explicit localhost and .test base URLs when an environment is selected", async () => {
    assert.equal(
      await requestedApiIndexUrl({
        apiKey: "lk_test_example_key",
        baseUrl: "http://localhost:4010/api",
        environment: "sandbox",
      }),
      "http://localhost:4010/api/v1",
    );

    assert.equal(
      await requestedApiIndexUrl({
        apiKey: "lk_live_example_key",
        baseUrl: "https://api.test/v2",
        environment: "production",
      }),
      "https://api.test/v2/v1",
    );
  });

  test("rejects incompatible key prefixes without echoing the key", () => {
    const productionKey = "lk_live_do_not_disclose";
    const sandboxKey = "lk_test_do_not_disclose";

    for (const [apiKey, environment] of [
      [productionKey, "sandbox"],
      [sandboxKey, "production"],
    ]) {
      assert.throws(
        () => new TheLeoKingApi({ apiKey, environment }),
        (error) => {
          assert.match(String(error), /API key prefix is incompatible with the selected environment/);
          assert.doesNotMatch(String(error), /lk_(live|test)_do_not_disclose/);
          return true;
        },
      );
    }
  });

  test("rejects canonical environment mismatches and arbitrary custom hosts", () => {
    assert.throws(
      () => new TheLeoKingApi({ baseUrl: SANDBOX_API_BASE_URL, environment: "production" }),
      /base URL is incompatible with the selected environment/,
    );
    assert.throws(
      () => new TheLeoKingApi({ baseUrl: "https://untrusted.example" }),
      /Custom base URLs must use localhost, loopback, or a .test host/,
    );
  });

  test("requires an idempotency key before sending a paid POST request", async () => {
    let fetchCalled = false;
    const api = new TheLeoKingApi({
      apiKey: "lk_live_example_key",
      fetchImpl: async () => {
        fetchCalled = true;
        return successResponse();
      },
    });

    await assert.rejects(
      api.natalChart({ subject: { id: "subject_123", dob: "1990-07-23" } }),
      /idempotencyKey is required/,
    );
    await assert.rejects(
      api.natalChart({ subject: { id: "subject_123", dob: "1990-07-23" } }, "   "),
      /idempotencyKey is required/,
    );
    assert.equal(fetchCalled, false);
  });
});

test("distributes the Apache-2.0 license with the Node package", () => {
  const packageJson = JSON.parse(readFileSync(path.join(sdkDirectory, "package.json"), "utf8"));
  const licensePath = path.join(sdkDirectory, "LICENSE");

  assert.equal(packageJson.license, "Apache-2.0");
  assert.ok(packageJson.files.includes("LICENSE"));
  assert.ok(existsSync(licensePath));
  assert.match(readFileSync(licensePath, "utf8"), /Apache License[\s\S]+Version 2\.0/);
});
