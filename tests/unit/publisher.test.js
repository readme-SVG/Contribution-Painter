import test from "node:test";
import assert from "node:assert/strict";
import { PublishJob } from "../../js/core/publisher.js";
import { GitHubError } from "../../js/core/github.js";
import { parseRepository } from "../../js/core/validation.js";

const sha = (character) => character.repeat(40);
const settings = {
  repository: parseRepository("owner/repo"),
  branch: "paint",
  name: "Painter",
  email: "painter@example.com",
};
const plan = Object.freeze([
  { date: "2024-01-01", count: 2 },
  { date: "2024-01-02", count: 1 },
]);

function fixture({
  branch = sha("a"),
  failAtCommit = 0,
  changeBeforeUpdate = false,
} = {}) {
  const calls = [];
  let commits = 0;
  let attempts = 0;
  let current = branch;
  const client = {
    rateLimit: { remaining: 5000 },
    async request(method, path, body, signal) {
      signal?.throwIfAborted();
      calls.push({ method, path, body });
      if (method === "GET" && path === "/repos/owner/repo")
        return {
          archived: false,
          default_branch: "main",
          permissions: { push: true },
        };
      if (method === "GET" && path.includes("/git/ref/")) {
        if (changeBeforeUpdate && commits > 0) current = sha("f");
        const value = path.endsWith("/main") ? sha("f") : current;
        if (!value) throw new GitHubError("error_access", 404);
        return { object: { type: "commit", sha: value } };
      }
      if (method === "GET" && path.includes("/git/commits/"))
        return { tree: { sha: sha("b") } };
      if (path.endsWith("/git/blobs")) return { sha: sha("c") };
      if (path.endsWith("/git/trees")) return { sha: sha("d") };
      if (path.endsWith("/git/commits")) {
        attempts += 1;
        if (attempts === failAtCommit) throw new GitHubError("error_timeout");
        commits += 1;
        return { sha: sha("e") };
      }
      if (method === "PATCH" || method === "POST") {
        if (method === "PATCH") assert.equal(body.force, false);
        current = body.sha;
        return { object: { sha: body.sha } };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  };
  return { client, calls, state: () => ({ current, commits }) };
}

test("one blob and tree are reused and the branch is published only at the end", async () => {
  const f = fixture();
  const job = new PublishJob(settings, plan, { clientFactory: () => f.client });
  await job.run("token");
  assert.equal(job.finished, true);
  assert.equal(job.completed, 3);
  assert.equal(
    f.calls.filter((call) => call.path.endsWith("/git/trees")).length,
    1,
  );
  assert.equal(
    f.calls.filter((call) => call.path.endsWith("/git/blobs")).length,
    1,
  );
  assert.equal(f.calls.filter((call) => call.method === "PATCH").length, 1);
  assert.equal(f.calls.at(-1).body.force, false);
  assert.equal(f.state().current, sha("e"));
});

test("interrupted runs resume from checkpoints without recreating commits or artifacts", async () => {
  const f = fixture({ failAtCommit: 2 });
  const job = new PublishJob(settings, plan, { clientFactory: () => f.client });
  await assert.rejects(job.run("token"), { code: "error_timeout" });
  assert.equal(job.completed, 1);
  assert.equal(f.state().current, sha("a"));
  await job.run("token");
  assert.equal(f.state().commits, 3);
  assert.equal(
    f.calls.filter((call) => call.path.endsWith("/git/blobs")).length,
    1,
  );
  assert.equal(job.finished, true);
});

test("concurrent branch changes abort without force-pushing", async () => {
  const f = fixture({ changeBeforeUpdate: true });
  const job = new PublishJob(settings, plan, { clientFactory: () => f.client });
  await assert.rejects(job.run("token"), { code: "error_branch_changed" });
  assert.equal(f.state().current, sha("f"));
  assert.equal(f.calls.filter((call) => call.method === "PATCH").length, 0);
});

test("new branches inherit the default branch and empty repositories are rejected", async () => {
  const f = fixture({ branch: null });
  const job = new PublishJob(settings, plan, { clientFactory: () => f.client });
  await job.run("token");
  const create = f.calls.find(
    (call) => call.path.endsWith("/git/commits") && call.method === "POST",
  );
  assert.equal(create.body.parents[0], sha("f"));
  assert.equal(
    f.calls.find(
      (call) => call.method === "POST" && call.path.endsWith("/git/refs"),
    ).body.ref,
    "refs/heads/paint",
  );
  const empty = fixture({ branch: null });
  const original = empty.client.request;
  empty.client.request = async (method, path, body) => {
    if (method === "GET" && path.endsWith("/main"))
      throw new GitHubError("error_access", 404);
    return original(method, path, body);
  };
  await assert.rejects(
    new PublishJob(settings, plan, { clientFactory: () => empty.client }).run(
      "token",
    ),
    { code: "error_empty_repo" },
  );
});

test("cancellation leaves the branch untouched and insufficient quota prevents writes", async () => {
  const f = fixture();
  const controller = new AbortController();
  controller.abort();
  const job = new PublishJob(settings, plan, { clientFactory: () => f.client });
  await assert.rejects(job.run("token", controller.signal), {
    name: "AbortError",
  });
  assert.equal(f.calls.length, 0);
  f.client.rateLimit.remaining = 1;
  await assert.rejects(
    new PublishJob(settings, plan, { clientFactory: () => f.client }).run(
      "token",
    ),
    { code: "error_quota" },
  );
  assert.equal(
    f.calls.some((call) => call.method === "POST"),
    false,
  );
});
