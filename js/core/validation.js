const BRANCH_FORBIDDEN = " ~^:?*[\\";

export function hasControlCharacter(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function hasBranchForbiddenCharacter(value) {
  for (const character of value) {
    if (BRANCH_FORBIDDEN.includes(character)) return true;
  }
  return false;
}

export function parseRepository(value) {
  const parts = value.trim().split("/");
  if (parts.length !== 2) throw new Error("alert_repo");
  const [owner, name] = parts;
  if (!/^[A-Za-z\d](?:[A-Za-z\d-]{0,37}[A-Za-z\d])?$/.test(owner))
    throw new Error("alert_repo");
  if (!/^[A-Za-z\d_.-]{1,100}$/.test(name) || name === "." || name === "..") {
    throw new Error("alert_repo");
  }
  return { owner, name, slug: `${owner}/${name}` };
}

export function validateBranch(value) {
  const branch = value.trim();
  if (
    !branch ||
    branch.length > 255 ||
    branch === "@" ||
    branch.toUpperCase() === "HEAD"
  ) {
    throw new Error("alert_branch");
  }
  if (hasControlCharacter(branch) || hasBranchForbiddenCharacter(branch)) {
    throw new Error("alert_branch");
  }
  if (
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.startsWith("-")
  ) {
    throw new Error("alert_branch");
  }
  const components = branch.split("/");
  if (
    components.some(
      (part) =>
        !part ||
        part === "@" ||
        part.startsWith(".") ||
        part.endsWith(".") ||
        part.endsWith(".lock"),
    )
  ) {
    throw new Error("alert_branch");
  }
  if (branch.includes("..") || branch.includes("@{"))
    throw new Error("alert_branch");
  return branch;
}

export function parseFillPercent(value) {
  const normalized = value.trim().replace(/%$/, "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error("alert_percent");
  const percent = Number(normalized);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw new Error("alert_percent");
  return percent;
}

export function validateSettings(values) {
  const repository = parseRepository(values.repo);
  const branch = validateBranch(values.branch || "main");
  const token = values.token.trim();
  const email = values.email.trim();
  const name = values.gitname.trim() || "GitHub Painter";
  if (!token || token.length > 1024 || hasControlCharacter(token))
    throw new Error("alert_token");
  if (
    email.length > 254 ||
    hasControlCharacter(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("alert_email");
  }
  if (name.length > 255 || hasControlCharacter(name))
    throw new Error("alert_name");
  return Object.freeze({ repository, branch, token, email, name });
}

export function branchPath(branch) {
  return validateBranch(branch).split("/").map(encodeURIComponent).join("/");
}
