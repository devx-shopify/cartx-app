import path from "path";
import fs from "fs";
import { describe, beforeAll, test, expect } from "vitest";
import { buildFunction, getFunctionInfo, loadSchema, loadInputQuery, loadFixture, validateTestAssets, runFunction } from "@shopify/shopify-function-test-helpers";

describe("Default Integration Test", () => {
  let schema;
  let functionDir;
  let functionInfo;
  let schemaPath;
  let targeting;
  let functionRunnerPath;
  let wasmPath;

  beforeAll(async () => {
    functionDir = path.dirname(__dirname);
    await buildFunction(functionDir);
    // Shopify CLI 5 changed `app function info --json`: the info is wrapped in
    // { function: { ... } } and targets are a list, not a map keyed by target.
    // The test helper (1.1.0, the latest) still expects the old shape, so
    // accept both.
    const info = await getFunctionInfo(functionDir);
    const fn = info.function || info;
    const byTarget = Object.fromEntries((fn.targets || []).map((t) => [t.target, t]));
    functionInfo = { ...fn, targeting: fn.targeting || byTarget };
    ({ schemaPath, functionRunnerPath, wasmPath, targeting } = functionInfo);
    schema = await loadSchema(schemaPath);
  }, 45000);

  const fixturesDir = path.join(__dirname, "fixtures");
  const fixtureFiles = fs.readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(fixturesDir, file));

  fixtureFiles.forEach((fixtureFile) => {
    test(`runs ${path.relative(fixturesDir, fixtureFile)}`, async () => {
      const fixture = await loadFixture(fixtureFile);
      const targetInputQueryPath = targeting[fixture.target].inputQueryPath;
      const inputQueryAST = await loadInputQuery(targetInputQueryPath);

      const validationResult = await validateTestAssets({ schema, fixture, inputQueryAST });
      expect(validationResult.inputQuery.errors).toEqual([]);
      expect(validationResult.inputFixture.errors).toEqual([]);
      expect(validationResult.outputFixture.errors).toEqual([]);

      const runResult = await runFunction(fixture, functionRunnerPath, wasmPath, targetInputQueryPath, schemaPath);
      expect(runResult.error).toBeNull();
      expect(runResult.result.output).toEqual(fixture.expectedOutput);
    }, 10000);
  });
});
