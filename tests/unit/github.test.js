import test from "node:test";
import assert from "node:assert/strict";
import { GitHubClient, GitHubError, retryDelay } from "../../js/core/github.js";

const response = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

test("requests use fixed origin, bearer auth, no cookies and no referrer", async () => {
  let request;
  const client = new GitHubClient("secret", {
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(200, { ok: true }, { "x-ratelimit-remaining": "4999" });
    },
  });
  assert.deepEqual(await client.request("GET", "/repos/owner/repo"), {
    ok: true,
  });
  assert.equal(request.url, "https://api.github.com/repos/owner/repo");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.referrerPolicy, "no-referrer");
  assert.equal(request.options.redirect, "error");
  assert.deepEqual(client.rateLimit, { remaining: 4999, reset: 0 });
  await assert.rejects(client.request("GET", "//evil.example/path"));
});

test("reads retry transient failures but writes are never replayed", async () => {
  let reads = 0;
  let writes = 0;
  const client = new GitHubClient("secret", {
    writeInterval: 0,
    fetchImpl: async (_url, options) => {
      if (options.method === "GET") {
        reads += 1;
        return reads < 3 ? response(503, {}) : response(200, { ok: true });
      }
      writes += 1;
      return response(503, {});
    },
  });
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (callback, _delay, ...args) =>
    original(callback, 0, ...args);
  try {
    assert.deepEqual(await client.request("GET", "/test"), { ok: true });
    await assert.rejects(client.request("POST", "/test", {}), {
      code: "error_http",
    });
  } finally {
    globalThis.setTimeout = original;
  }
  assert.equal(reads, 3);
  assert.equal(writes, 1);
});

test("rate limits are honored for reads, never replay writes, and cancellation is immediate", async () => {
  const original = globalThis.setTimeout;
  const delays = [];
  globalThis.setTimeout = (callback, delay, ...args) => {
    delays.push(delay);
    return original(callback, 0, ...args);
  };
  let reads = 0;
  try {
    const reader = new GitHubClient("secret", {
      fetchImpl: async () => {
        reads += 1;
        return reads === 1
          ? response(429, { message: "limited" }, { "retry-after": "120" })
          : response(200, { ok: true });
      },
    });
    assert.deepEqual(await reader.request("GET", "/test"), { ok: true });
    assert.equal(reads, 2);
    assert.ok(delays.includes(120_000));

    let writes = 0;
    const writer = new GitHubClient("secret", {
      writeInterval: 0,
      fetchImpl: async () => {
        writes += 1;
        return response(429, { message: "limited" }, { "retry-after": "120" });
      },
    });
    await assert.rejects(writer.request("POST", "/test", {}), {
      code: "error_rate_limit",
    });
    assert.equal(writes, 1);
  } finally {
    globalThis.setTimeout = original;
  }

  const controller = new AbortController();
  controller.abort();
  const client = new GitHubClient("secret", {
    fetchImpl: async () => response(200, {}),
  });
  await assert.rejects(
    client.request("GET", "/test", undefined, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(
    retryDelay(new Headers({ "retry-after": "10" }), 1, 1000),
    10_000,
  );
  assert.equal(
    retryDelay(
      new Headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "20" }),
      1,
      1000,
    ),
    19_000,
  );
  assert.equal(
    retryDelay(new Headers({ "x-ratelimit-reset": "20" }), 1, 1000),
    1000,
  );
  assert.equal(retryDelay(new Headers(), 1, 1000, 60_000), 60_000);
});

test("empty repositories and invalid successful payloads have explicit errors", async () => {
  const client = new GitHubClient("secret", {
    fetchImpl: async () =>
      response(409, { message: "Git Repository is empty." }),
  });
  await assert.rejects(client.request("GET", "/test"), {
    code: "error_empty_repo",
  });
  const invalid = new GitHubClient("secret", {
    fetchImpl: async () => response(200, null),
  });
  await assert.rejects(
    invalid.request("GET", "/test"),
    (error) => error instanceof GitHubError && error.code === "error_response",
  );
});
