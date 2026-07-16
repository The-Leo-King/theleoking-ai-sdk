from pathlib import Path
import unittest

from theleoking_ai_api import (
    PRODUCTION_API_BASE_URL,
    SANDBOX_API_BASE_URL,
    TheLeoKingApi,
)


class SandboxConfigurationTests(unittest.TestCase):
    def test_defaults_to_the_production_api_gateway(self) -> None:
        api = TheLeoKingApi()

        self.assertEqual(api.base_url, PRODUCTION_API_BASE_URL)
        self.assertEqual(api.environment, "production")

    def test_selects_the_sandbox_gateway_for_a_sandbox_environment(self) -> None:
        api = TheLeoKingApi(api_key="lk_test_example_key", environment="sandbox")

        self.assertEqual(api.base_url, SANDBOX_API_BASE_URL)
        self.assertEqual(api.environment, "sandbox")

    def test_allows_explicit_localhost_and_test_base_urls(self) -> None:
        sandbox_api = TheLeoKingApi(
            api_key="lk_test_example_key",
            base_url="http://localhost:4010/api",
            environment="sandbox",
        )
        production_api = TheLeoKingApi(
            api_key="lk_live_example_key",
            base_url="https://api.test/v2",
            environment="production",
        )

        self.assertEqual(sandbox_api.base_url, "http://localhost:4010/api")
        self.assertEqual(production_api.base_url, "https://api.test/v2")

    def test_rejects_incompatible_key_prefixes_without_echoing_the_key(self) -> None:
        production_key = "lk_live_do_not_disclose"
        sandbox_key = "lk_test_do_not_disclose"

        for api_key, environment in ((production_key, "sandbox"), (sandbox_key, "production")):
            with self.assertRaisesRegex(ValueError, "API key prefix is incompatible with the selected environment") as error:
                TheLeoKingApi(api_key=api_key, environment=environment)

            self.assertNotIn(api_key, str(error.exception))

    def test_rejects_incompatible_canonical_and_untrusted_custom_hosts(self) -> None:
        with self.assertRaisesRegex(ValueError, "base URL is incompatible with the selected environment"):
            TheLeoKingApi(base_url=SANDBOX_API_BASE_URL, environment="production")

        with self.assertRaisesRegex(ValueError, "Custom base URLs must use localhost, loopback, or a .test host"):
            TheLeoKingApi(base_url="https://untrusted.example")

    def test_requires_an_idempotency_key_before_sending_a_paid_post(self) -> None:
        api = TheLeoKingApi(api_key="lk_live_example_key")

        with self.assertRaisesRegex(ValueError, "idempotency_key is required"):
            api._post("/v1/charts/natal", {"subject": {"id": "subject_123"}}, None)

        with self.assertRaisesRegex(ValueError, "idempotency_key is required"):
            api._post("/v1/charts/natal", {"subject": {"id": "subject_123"}}, "   ")

    def test_declares_apache_license_metadata_and_distribution_file(self) -> None:
        package_root = Path(__file__).resolve().parents[1]
        project_metadata = (package_root / "pyproject.toml").read_text(encoding="utf-8")
        license_text = (package_root / "LICENSE").read_text(encoding="utf-8")

        self.assertIn('license = { text = "Apache-2.0" }', project_metadata)
        self.assertIn("Apache License", license_text)
        self.assertIn("Version 2.0", license_text)
