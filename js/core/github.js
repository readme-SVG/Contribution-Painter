import { hasControlCharacter } from "./validation.js";

const MAX_TIMER_DELAY = 2_147_483_647;

export class GitHubError extends Error {
  constructor(code, status = 0, detail = "") {
    super(code);
    this.name = "GitHubError";
    this.code = code;
    this.status = status;
    this.detail = detail.slice(0, 300);
  }
}

export function retryDelay(
  headers,
  attempt,
  now = Date.now(),
  fallback = 1000 * 2 ** (attempt - 1),
) {
  const retryAfter = headers.get("retry-after");
  if (retryAfter !== null && retryAfter.trim() !== "") {
    const seconds = Number(retryAfter);
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - now;
    if (Number.isFinite(delay)) return Math.max(1000, delay);
  }
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (headers.get("x-ratelimit-remaining") === "0" && reset > 0) {
    return Math.max(1000, reset * 1000 - now);
  }
  return fallback;
}

export function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    let remaining = milliseconds;
    let timer;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const schedule = () => {
      // Node timers are 32-bit; chunk long rate-limit waits instead of overflowing.
      const delay = Math.min(remaining, MAX_TIMER_DELAY);
      timer = setTimeout(() => {
        remaining -= delay;
        if (remaining > 0) {
          schedule();
          return;
        }
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, delay);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    schedule();
  });
}

export class GitHubClient {
  constructor(
    token,
    {
      fetchImpl = globalThis.fetch,
      timeout = 30_000,
      attempts = 3,
      writeInterval = 1000,
    } = {},
  ) {
    if (!token || hasControlCharacter(token))
      throw new GitHubError("alert_token");
    this.token = token;
    this.fetch = fetchImpl;
    this.timeout = timeout;
    this.attempts = attempts;
    this.writeInterval = writeInterval;
    this.lastWrite = 0;
    this.rateLimit = null;
  }

  async request(method, path, body, signal) {
    if (
      hasControlCharacter(path) ||
      !path.startsWith("/") ||
      path.startsWith("//")
    ) {
      throw new Error("Invalid API path.");
    }
    const url = new URL(path, "https://api.github.com");
    if (url.origin !== "https://api.github.com")
      throw new Error("Unexpected API origin.");

    for (let attempt = 1; attempt <= this.attempts; attempt += 1) {
      signal?.throwIfAborted();
      if (method !== "GET") {
        const wait = this.lastWrite + this.writeInterval - Date.now();
        if (wait > 0) await abortableDelay(wait, signal);
        this.lastWrite = Date.now();
      }

      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeout);
      let response;
      let text;
      try {
        response = await this.fetch(url.href, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          redirect: "error",
        });
        text = await response.text();
      } catch {
        signal?.throwIfAborted();
        if (method === "GET" && attempt < this.attempts) {
          await abortableDelay(1000 * attempt, signal);
          continue;
        }
        throw new GitHubError(timedOut ? "error_timeout" : "error_network");
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }

      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining !== null && Number.isFinite(Number(remaining))) {
        this.rateLimit = {
          remaining: Number(remaining),
          reset: Number(response.headers.get("x-ratelimit-reset")) || 0,
        };
      }
      if (response.status === 204) return null;
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          /* Error responses may contain a proxy's HTML page. */
        }
      }

      if (response.ok) {
        if (data === null)
          throw new GitHubError("error_response", response.status);
        return data;
      }

      const secondaryLimit = /secondary rate|abuse detection/i.test(
        data?.message || "",
      );
      const limited =
        response.status === 429 ||
        (response.status === 403 && (remaining === "0" || secondaryLimit));
      if (limited) {
        // Secondary limits without headers require a conservative one-minute pause.
        const wait = retryDelay(response.headers, attempt, Date.now(), 60_000);
        // Writes are never replayed automatically: a timed-out request may already have succeeded.
        if (method === "GET" && attempt < this.attempts) {
          await abortableDelay(wait, signal);
          continue;
        }
        throw new GitHubError("error_rate_limit", response.status);
      }
      if (
        response.status >= 500 &&
        method === "GET" &&
        attempt < this.attempts
      ) {
        await abortableDelay(1000 * attempt, signal);
        continue;
      }
      if (response.status === 401) throw new GitHubError("error_auth", 401);
      if (response.status === 403 || response.status === 404)
        throw new GitHubError("error_access", response.status);
      if (response.status === 409 && data?.message?.includes("empty"))
        throw new GitHubError("error_empty_repo", 409);
      if (response.status === 422 || response.status === 409) {
        throw new GitHubError(
          "error_conflict",
          response.status,
          typeof data?.message === "string" ? data.message : "",
        );
      }
      throw new GitHubError(
        "error_http",
        response.status,
        typeof data?.message === "string" ? data.message : "",
      );
    }
    throw new GitHubError("error_network");
  }
}
