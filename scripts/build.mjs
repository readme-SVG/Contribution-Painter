import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");

// Publish only the static application, never repository metadata or automation sources.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "index.html"), resolve(output, "index.html"));
for (const directory of ["css", "js"]) {
  await cp(resolve(root, directory), resolve(output, directory), {
    recursive: true,
  });
}
console.log(`Static site written to ${output}`);
