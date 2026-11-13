import test from "node:test";
import assert from "node:assert/strict";
import {
  branchPath,
  parseFillPercent,
  parseRepository,
  validateBranch,
  validateSettings,
} from "../../js/core/validation.js";

test("repository validation rejects URL traversal and malformed segments", () => {
  assert.equal(parseRepository(" owner/repo ").slug, "owner/repo");
  for (const value of [
    "https://github.com/a/b",
    "../repo",
    "owner/..",
    "owner/repo/extra",
    "/owner/repo",
    "owner/",
    "a b/repo",
  ]) {
    assert.throws(
      () => parseRepository(value),
      { message: "alert_repo" },
      value,
    );
  }
});

test("branch validation enforces Git ref components and encodes path segments", () => {
  assert.equal(validateBranch("feature/paint-2026"), "feature/paint-2026");
  assert.equal(branchPath("feature/café"), "feature/caf%C3%A9");
  for (const value of [
    "",
    "@",
    "HEAD",
    "-bad",
    "/main",
    "main/",
    "a//b",
    "a..b",
    "a@{b",
    "a.lock/b",
    "a/.hidden",
    "a.",
    "a\nb",
    "a?b",
  ]) {
    assert.throws(
      () => validateBranch(value),
      { message: "alert_branch" },
      value,
    );
  }
});

test("percentage parsing rejects partial input instead of silently accepting it", () => {
  assert.equal(parseFillPercent(" 42,5% "), 42.5);
  assert.equal(parseFillPercent("0"), 0);
  assert.equal(parseFillPercent("100%"), 100);
  for (const value of [
    "",
    "50abc",
    "-1",
    "101",
    "NaN",
    "Infinity",
    "1e2",
    "1.2.3",
  ]) {
    assert.throws(
      () => parseFillPercent(value),
      { message: "alert_percent" },
      value,
    );
  }
});

test("credentials and author fields reject header injection", () => {
  const valid = {
    token: "github_pat_test",
    repo: "owner/repo",
    email: "user@example.com",
    gitname: "Painter",
    branch: "main",
  };
  assert.equal(validateSettings(valid).name, "Painter");
  assert.throws(() =>
    validateSettings({ ...valid, token: "test\r\nInjected: true" }),
  );
  assert.throws(() => validateSettings({ ...valid, gitname: "A\nB" }));
  assert.throws(() => validateSettings({ ...valid, email: "" }));
});
