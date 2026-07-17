import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateStableHandoff,
  validateStableManifestShape,
  validateStableSourceInventory,
} from "./validate-stable-handoff.mjs";

const SHA = "a".repeat(64);
const COMMIT = "b".repeat(40);

function validDocuments() {
  const conformance = {
    schemaVersion: 1,
    status: "pass",
    sourceGitCommit: COMMIT,
    openApiSha256: SHA,
    node: {
      packageName: "@theleoking/ai-api",
      version: "1.0.0",
      webhookVerification: "pass",
    },
    python: {
      packageName: "theleoking-ai-api",
      version: "1.0.0",
      webhookVerification: "pass",
    },
  };
  return {
    conformance,
    manifest: {
      schemaVersion: 2,
      createdAt: "2026-07-17T12:00:00.000Z",
      sourceGitCommit: COMMIT,
      openApiSha256: SHA,
      releaseChannel: "stable",
      publicRepository: "https://github.com/The-Leo-King/theleoking-ai-sdk",
      publicationAuthorized: true,
      registryPublication: "authorized-for-protected-oidc-publication",
      proSdkPrepublicationEvidence: {
        path: "inference-smoke/pro-launch-proof.json",
        sha256: SHA,
        createdAt: "2026-07-17T11:00:00.000Z",
        expectedRelease: COMMIT,
      },
      packages: {
        node: { name: "@theleoking/ai-api", version: "1.0.0" },
        python: { name: "theleoking-ai-api", version: "1.0.0" },
      },
      consumerConformance: conformance,
      files: [],
    },
  };
}

describe("stable SDK handoff", () => {
  it("accepts matching stable package and Pro evidence metadata", () => {
    const { manifest, conformance } = validDocuments();
    assert.doesNotThrow(() => validateStableManifestShape({
      manifest,
      conformance,
      nodeVersion: "1.0.0",
      pythonVersion: "1.0.0",
    }));
  });

  it("rejects alpha versions and source/proof mismatches", () => {
    const { manifest, conformance } = validDocuments();
    assert.throws(() => validateStableManifestShape({
      manifest,
      conformance,
      nodeVersion: "0.1.0-alpha.0",
      pythonVersion: "0.1.0a0",
    }), /matching non-prerelease/);

    manifest.proSdkPrepublicationEvidence.expectedRelease = "c".repeat(40);
    assert.throws(() => validateStableManifestShape({
      manifest,
      conformance,
      nodeVersion: "1.0.0",
      pythonVersion: "1.0.0",
    }), /does not match/);
  });

  it("requires an exact, duplicate-free tracked source inventory", async () => {
    const trackedSdkFiles = ["node/package.json"];
    const contents = Buffer.from("{}\n");
    const digest = (await import("node:crypto")).createHash("sha256").update(contents).digest("hex");
    const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
    const manifestFiles = [{
      path: "source/node/package.json",
      bytes: contents.byteLength,
      sha256: digest,
    }];

    await assert.rejects(validateStableSourceInventory({
      workspaceRoot,
      manifestFiles,
      trackedSdkFiles,
    }), /does not match stable candidate evidence/);
    await assert.rejects(validateStableSourceInventory({
      workspaceRoot,
      manifestFiles: [...manifestFiles, ...manifestFiles],
      trackedSdkFiles,
    }), /Duplicate stable candidate source path/);
    await assert.rejects(validateStableSourceInventory({
      workspaceRoot,
      manifestFiles,
      trackedSdkFiles: [...trackedSdkFiles, "python/pyproject.toml"],
    }), /exactly match/);
  });

  it("validates a complete committed stable handoff and detects later source drift", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "stable-sdk-handoff-"));
    const nodePackage = `${JSON.stringify({ name: "@theleoking/ai-api", version: "1.0.0" }, null, 2)}\n`;
    const nodeLock = `${JSON.stringify({ name: "@theleoking/ai-api", version: "1.0.0", lockfileVersion: 3 }, null, 2)}\n`;
    const pythonProject = '[project]\nname = "theleoking-ai-api"\nversion = "1.0.0"\n';
    const { manifest, conformance } = validDocuments();

    try {
      await Promise.all([
        mkdir(path.join(root, "node"), { recursive: true }),
        mkdir(path.join(root, "python"), { recursive: true }),
        mkdir(path.join(root, "evidence/1.0.0"), { recursive: true }),
      ]);
      await Promise.all([
        writeFile(path.join(root, "node/package.json"), nodePackage),
        writeFile(path.join(root, "node/package-lock.json"), nodeLock),
        writeFile(path.join(root, "python/pyproject.toml"), pythonProject),
      ]);
      execFileSync("git", ["init"], { cwd: root });
      execFileSync("git", ["add", "node", "python"], { cwd: root });

      const sourceFiles = [
        "node/package.json",
        "node/package-lock.json",
        "python/pyproject.toml",
      ];
      manifest.files = await Promise.all(sourceFiles.map(async (file) => {
        const contents = await readFile(path.join(root, file));
        return {
          path: `source/${file}`,
          bytes: contents.byteLength,
          sha256: createHash("sha256").update(contents).digest("hex"),
        };
      }));
      const conformanceText = `${JSON.stringify(conformance, null, 2)}\n`;
      manifest.files.push({
        path: "consumer-conformance.json",
        bytes: Buffer.byteLength(conformanceText),
        sha256: createHash("sha256").update(conformanceText).digest("hex"),
      });
      await Promise.all([
        writeFile(path.join(root, "evidence/1.0.0/consumer-conformance.json"), conformanceText),
        writeFile(path.join(root, "evidence/1.0.0/release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
      ]);

      await assert.doesNotReject(validateStableHandoff(root));
      await writeFile(path.join(root, "node/package.json"), `${nodePackage} `);
      await assert.rejects(validateStableHandoff(root), /does not match stable candidate evidence/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
