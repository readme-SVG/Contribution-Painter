import { GitHubClient, GitHubError } from "./github.js";
import { branchPath } from "./validation.js";

export const ARTIFACT_PATH = "contribution-painter.txt";
const ARTIFACT =
  "This contribution pattern was created with Contribution-Painter.\nhttps://github.com/readme-SVG/Contribution-Painter\n";
const SHA_RE = /^[a-f\d]{40}$/;

function sha(value) {
  if (typeof value !== "string" || !SHA_RE.test(value))
    throw new GitHubError("error_response");
  return value;
}

export class PublishJob {
  constructor(
    settings,
    plan,
    {
      clientFactory = (token) => new GitHubClient(token),
      notify = () => {},
    } = {},
  ) {
    if (
      !plan.length ||
      plan.some((day) => !Number.isInteger(day.count) || day.count < 1)
    ) {
      throw new Error("alert_empty");
    }
    this.settings = settings;
    this.plan = plan;
    this.total = plan.reduce((total, day) => total + day.count, 0);
    this.clientFactory = clientFactory;
    this.notify = notify;
    this.completed = 0;
    this.prepared = false;
    this.finished = false;
    this.running = false;
  }

  get requestsRemaining() {
    return this.total - this.completed + (this.prepared ? 3 : 8);
  }

  async #branch(client, path, branch, signal) {
    try {
      const ref = await client.request(
        "GET",
        `${path}/git/ref/heads/${branch}`,
        undefined,
        signal,
      );
      if (ref?.object?.type !== "commit")
        throw new GitHubError("error_response");
      return sha(ref.object.sha);
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  }

  async #prepare(client, path, target, signal) {
    const repository = await client.request("GET", path, undefined, signal);
    if (repository.archived || repository.permissions?.push === false)
      throw new GitHubError("error_permissions");
    this.base = await this.#branch(client, path, target, signal);
    this.creatingBranch = this.base === null;
    let base = this.base;
    if (base === null) {
      this.notify("log_base_branch");
      base = await this.#branch(
        client,
        path,
        branchPath(repository.default_branch),
        signal,
      );
      if (!base) throw new GitHubError("error_empty_repo");
    }
    const commit = await client.request(
      "GET",
      `${path}/git/commits/${base}`,
      undefined,
      signal,
    );
    const baseTree = sha(commit?.tree?.sha);
    this.#checkQuota(client);
    this.notify("log_preparing");
    const blob = await client.request(
      "POST",
      `${path}/git/blobs`,
      { content: ARTIFACT, encoding: "utf-8" },
      signal,
    );
    const tree = await client.request(
      "POST",
      `${path}/git/trees`,
      {
        base_tree: baseTree,
        tree: [
          {
            path: ARTIFACT_PATH,
            mode: "100644",
            type: "blob",
            sha: sha(blob?.sha),
          },
        ],
      },
      signal,
    );
    // Every commit writes the same artifact, so one tree can be reused for the entire chain.
    this.tree = sha(tree?.sha);
    this.head = base;
    this.prepared = true;
  }

  #checkQuota(client) {
    const limit = client.rateLimit;
    if (!limit || limit.remaining >= this.requestsRemaining) return;
    // A stale zero from a previous window must not block a fresh request budget.
    if (limit.reset > 0 && limit.reset * 1000 <= Date.now()) return;
    throw new GitHubError("error_quota");
  }

  async #publishRef(client, path, target, signal) {
    const current = await this.#branch(client, path, target, signal);
    if (current === this.head) {
      this.finished = true;
      return;
    }
    if (current !== this.base) throw new GitHubError("error_branch_changed");
    this.notify("log_updating");
    const ref =
      current === null
        ? await client.request(
            "POST",
            `${path}/git/refs`,
            { ref: `refs/heads/${this.settings.branch}`, sha: this.head },
            signal,
          )
        : await client.request(
            "PATCH",
            `${path}/git/refs/heads/${target}`,
            { sha: this.head, force: false },
            signal,
          );
    if (sha(ref?.object?.sha) !== this.head)
      throw new GitHubError("error_response");
    this.finished = true;
  }

  async run(token, signal = new AbortController().signal) {
    if (this.running || this.finished)
      throw new Error("Invalid publish job state.");
    signal.throwIfAborted();
    this.running = true;
    const client = this.clientFactory(token);
    const controller = { signal };
    const path = `/repos/${encodeURIComponent(this.settings.repository.owner)}/${encodeURIComponent(this.settings.repository.name)}`;
    const target = branchPath(this.settings.branch);
    try {
      if (!this.prepared)
        await this.#prepare(client, path, target, controller.signal);
      else {
        this.notify("log_resuming");
        const current = await this.#branch(
          client,
          path,
          target,
          controller.signal,
        );
        if (current !== this.base && current !== this.head)
          throw new GitHubError("error_branch_changed");
        this.#checkQuota(client);
        if (current === this.head) {
          this.finished = true;
          this.notify("progress", { completed: this.total, total: this.total });
          return;
        }
      }

      let ordinal = 0;
      for (const day of this.plan) {
        for (let index = 0; index < day.count; index += 1) {
          ordinal += 1;
          if (ordinal <= this.completed) continue;
          controller.signal.throwIfAborted();
          const date = `${day.date}T12:00:00Z`;
          const commit = await client.request(
            "POST",
            `${path}/git/commits`,
            {
              message: `Contribution pattern: ${day.date} (${index + 1}/${day.count})`,
              tree: this.tree,
              parents: [this.head],
              author: {
                name: this.settings.name,
                email: this.settings.email,
                date,
              },
              committer: {
                name: this.settings.name,
                email: this.settings.email,
                date,
              },
            },
            controller.signal,
          );
          this.head = sha(commit?.sha);
          this.completed = ordinal;
          this.notify("progress", {
            completed: this.completed,
            total: this.total,
          });
        }
      }
      await this.#publishRef(client, path, target, controller.signal);
    } finally {
      this.running = false;
    }
  }
}
