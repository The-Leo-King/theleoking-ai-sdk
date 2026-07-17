#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_PUBLIC_REPOSITORY = "https://github.com/The-Leo-King/theleoking-ai-sdk";
const EXPECTED_REGISTRY_AUTHORIZATION = "authorized-for-protected-oidc-publication";

export async function validateStableHandoff(workspaceRoot = process.cwd()) {
  const nodePackage = JSON.parse(await readFile(path.join(workspaceRoot, "node/package.json"), "utf8"));
  const pythonProject = await readFile(path.join(workspaceRoot, "python/pyproject.toml"), "utf8");
  const nodeVersion = requireString(nodePackage.version, "Node package version");
  const pythonVersion = readPythonProjectVersion(pythonProject);
  const evidenceDirectory = path.join(workspaceRoot, "evidence", nodeVersion);
  const manifestPath = path.join(evidenceDirectory, "release-manifest.json");
  const conformancePath = path.join(evidenceDirectory, "consumer-conformance.json");
  const [manifestText, conformanceText] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(conformancePath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const conformance = JSON.parse(conformanceText);

  validateStableManifestShape({ manifest, conformance, nodeVersion, pythonVersion });
  const trackedSdkFiles = listTrackedSdkFiles(workspaceRoot);
  await validateStableSourceInventory({
    workspaceRoot,
    manifestFiles: manifest.files,
    trackedSdkFiles,
  });

  const conformanceEntry = manifest.files.find((entry) => entry?.path === "consumer-conformance.json");
  assertFileEvidence(conformanceEntry, "consumer-conformance.json");
  const conformanceBytes = Buffer.from(conformanceText, "utf8");
  if (conformanceEntry.bytes !== conformanceBytes.byteLength
    || conformanceEntry.sha256 !== sha256(conformanceBytes)) {
    throw new Error("Committed consumer conformance does not match the stable candidate manifest");
  }
  if (JSON.stringify(manifest.consumerConformance) !== JSON.stringify(conformance)) {
    throw new Error("Manifest and committed consumer conformance documents must match exactly");
  }

  return {
    status: "pass",
    releaseChannel: "stable",
    version: nodeVersion,
    sourceGitCommit: manifest.sourceGitCommit,
    openApiSha256: manifest.openApiSha256,
    sourceFileCount: trackedSdkFiles.length,
    proEvidenceSha256: manifest.proSdkPrepublicationEvidence.sha256,
  };
}

export function validateStableManifestShape({ manifest, conformance, nodeVersion, pythonVersion }) {
  if (!isRecord(manifest) || manifest.schemaVersion !== 2) {
    throw new Error("Stable candidate manifest must use schemaVersion 2");
  }
  if (!/^[1-9]\d*\.\d+\.\d+$/.test(nodeVersion) || pythonVersion !== nodeVersion) {
    throw new Error("Stable Node and Python versions must be matching non-prerelease semantic versions");
  }
  if (manifest.releaseChannel !== "stable"
    || manifest.publicationAuthorized !== true
    || manifest.registryPublication !== EXPECTED_REGISTRY_AUTHORIZATION) {
    throw new Error("Manifest does not authorize protected stable OIDC publication");
  }
  if (manifest.publicRepository !== EXPECTED_PUBLIC_REPOSITORY) {
    throw new Error("Manifest public repository identity is invalid");
  }
  requireCommit(manifest.sourceGitCommit, "Manifest source Git commit");
  requireSha(manifest.openApiSha256, "Manifest OpenAPI digest");
  if (!isRecord(manifest.packages)
    || !isRecord(manifest.packages.node)
    || !isRecord(manifest.packages.python)
    || manifest.packages.node.name !== "@theleoking/ai-api"
    || manifest.packages.node.version !== nodeVersion
    || manifest.packages.python.name !== "theleoking-ai-api"
    || manifest.packages.python.version !== pythonVersion) {
    throw new Error("Manifest package identities do not match the public SDK source");
  }
  if (!isRecord(manifest.proSdkPrepublicationEvidence)) {
    throw new Error("Manifest is missing Pro SDK prepublication evidence binding");
  }
  requireString(manifest.proSdkPrepublicationEvidence.path, "Pro evidence path");
  requireSha(manifest.proSdkPrepublicationEvidence.sha256, "Pro evidence digest");
  if (manifest.proSdkPrepublicationEvidence.expectedRelease !== manifest.sourceGitCommit) {
    throw new Error("Pro evidence release does not match the stable candidate source commit");
  }
  requireIsoTimestamp(manifest.proSdkPrepublicationEvidence.createdAt, "Pro evidence createdAt");
  requireIsoTimestamp(manifest.createdAt, "Manifest createdAt");
  if (Date.parse(manifest.proSdkPrepublicationEvidence.createdAt) > Date.parse(manifest.createdAt)) {
    throw new Error("Pro evidence cannot be newer than the stable candidate manifest");
  }

  if (!isRecord(conformance)
    || conformance.schemaVersion !== 1
    || conformance.status !== "pass"
    || conformance.sourceGitCommit !== manifest.sourceGitCommit
    || conformance.openApiSha256 !== manifest.openApiSha256
    || !isRecord(conformance.node)
    || !isRecord(conformance.python)
    || conformance.node.packageName !== "@theleoking/ai-api"
    || conformance.node.version !== nodeVersion
    || conformance.node.webhookVerification !== "pass"
    || conformance.python.packageName !== "theleoking-ai-api"
    || conformance.python.version !== pythonVersion
    || conformance.python.webhookVerification !== "pass") {
    throw new Error("Stable candidate consumer conformance is incomplete or mismatched");
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error("Stable candidate manifest files must be an array");
  }
}

export async function validateStableSourceInventory({ workspaceRoot, manifestFiles, trackedSdkFiles }) {
  if (!Array.isArray(manifestFiles)) {
    throw new Error("Stable candidate manifest files must be an array");
  }
  const sourceEntries = new Map();
  for (const entry of manifestFiles) {
    if (!isRecord(entry) || typeof entry.path !== "string" || !entry.path.startsWith("source/")) continue;
    assertFileEvidence(entry, entry.path);
    const publicPath = entry.path.slice("source/".length);
    if (!/^(node|python)\//.test(publicPath) || publicPath.includes("..") || path.isAbsolute(publicPath)) {
      throw new Error(`Unsafe stable candidate source path: ${entry.path}`);
    }
    if (sourceEntries.has(publicPath)) {
      throw new Error(`Duplicate stable candidate source path: ${publicPath}`);
    }
    sourceEntries.set(publicPath, entry);
  }

  const expected = [...new Set(trackedSdkFiles)].sort();
  const actual = [...sourceEntries.keys()].sort();
  if (trackedSdkFiles.length !== expected.length || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Tracked public SDK files must exactly match the stable candidate source inventory");
  }

  for (const publicPath of expected) {
    const entry = sourceEntries.get(publicPath);
    const contents = await readFile(path.join(workspaceRoot, ...publicPath.split("/")));
    if (entry.bytes !== contents.byteLength || entry.sha256 !== sha256(contents)) {
      throw new Error(`Public SDK source does not match stable candidate evidence: ${publicPath}`);
    }
  }
}

function listTrackedSdkFiles(workspaceRoot) {
  return execFileSync("git", ["ls-files", "-z", "--", "node", "python"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  }).split("\0").filter(Boolean).map((value) => value.replace(/\\/g, "/"));
}

function readPythonProjectVersion(pyproject) {
  const project = pyproject.match(/\[project\]([\s\S]*?)(?:\n\[|$)/)?.[1] ?? "";
  return requireString(project.match(/^version\s*=\s*"([^"]+)"/m)?.[1], "Python package version");
}

function assertFileEvidence(entry, label) {
  if (!isRecord(entry)
    || typeof entry.path !== "string"
    || !Number.isSafeInteger(entry.bytes)
    || entry.bytes < 0) {
    throw new Error(`Invalid file evidence for ${label}`);
  }
  requireSha(entry.sha256, `${label} digest`);
}

function requireSha(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
}

function requireCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${label} must be a full lowercase Git commit SHA`);
  }
}

function requireIsoTimestamp(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isDirectExecution() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  validateStableHandoff().then(
    (result) => console.log(JSON.stringify(result, null, 2)),
    (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
