"""Prompt templates for the optional, explicitly configured change reviewer."""

SEVERITY_GUIDE = """
Use the following severity scale. You have 7 levels — pick the one that best matches the ACTUAL impact:

CRITICAL — Production-breaking changes, security vulnerabilities (exposed secrets, SQL injection, XSS, CSRF, broken auth), data loss risks, or changes that could cause service outages.

HIGH — Significant logic changes affecting core functionality, new or modified API endpoints, permission and access control modifications, database schema changes, removal of important functionality, breaking changes to public interfaces.

ELEVATED — New substantial features or modules, large-scale refactors that change behavior across multiple files, integration with external services or APIs, changes to error handling or retry logic, modifications to data processing pipelines.

MEDIUM — New utility functions or helpers, workflow and CI/CD pipeline changes, configuration changes that affect runtime behavior, dependency version updates, adding new files with meaningful functionality, structural reorganization of existing code.

MODERATE — Minor feature additions, small behavioral changes, adding validation or input checks, improving logging or error messages, updating environment variables or build settings, adding new labels or issue templates.

LOW — Documentation updates (README, CONTRIBUTING, comments), cosmetic UI changes without behavior impact, code formatting or style fixes, renaming without behavior change, adding badges or metadata, updating .gitignore or editor configs.

INFORMATIONAL — Trivial changes: fixing typos, whitespace adjustments, comment rewording, version bumps in non-critical files, adding blank lines.

IMPORTANT: Do NOT default to LOW or INFORMATIONAL. Carefully evaluate the actual scope and impact. Most code changes that add or modify functionality should be MEDIUM or higher. Use the full range of the scale.
"""


PROMPT_ROLES = {
    "security": (
        "Act as a Strict Security Auditor. Perform a deep security audit "
        "(OWASP Top 10, CWE patterns). Find real vulnerabilities with exact "
        "file/line references. Check for exposed secrets, injection vectors, "
        "broken auth, insecure deserialization, and misconfigurations."
    ),
    "review": (
        "Act as a Strict Code Reviewer. Analyze code quality using SOLID, DRY, "
        "and KISS principles. Point to exact lines that violate these principles. "
        "Evaluate naming, error handling, and separation of concerns."
    ),
    "qa": (
        "Act as a QA Engineer. Identify edge cases, missing test coverage, "
        "untested error paths, and potential regressions. Reference exact "
        "functions and lines that need tests."
    ),
    "perf": (
        "Act as a Performance Expert. Analyze algorithmic complexity, identify "
        "O(n²) patterns, unnecessary allocations, N+1 queries, blocking I/O, "
        "and missed caching opportunities. Reference exact lines."
    ),
    "pm": (
        "Act as a Product Manager. Generate user-facing Release Notes with "
        "clear impact descriptions. Focus on what changed for the end user, "
        "not implementation details."
    ),
    "deps": (
        "Act as a Security & Dependency Auditor. Analyze all new or changed "
        "dependencies: check for known vulnerabilities (CVEs), license "
        "compatibility (MIT/Apache/GPL), package size impact, maintenance "
        "status, and whether each dep is actively maintained. Reference exact "
        "file and line where each dependency is added or changed."
    ),
    "arch": (
        "Act as a Software Architect. Review changes for architectural issues: "
        "violation of separation of concerns, tight coupling, wrong layer "
        "dependencies, anti-patterns (God object, spaghetti logic, magic "
        "numbers, circular dependencies). Reference exact files and lines."
    ),
    "ci": (
        "Act as a DevOps/CI Engineer. Review the CI/CD pipeline changes for "
        "correctness, security (token permissions, secret exposure), efficiency "
        "(caching, parallelism, job dependencies), and best practices. Check "
        "for overly broad permissions, missing timeout limits, and potential "
        "race conditions in workflows."
    ),
    "docs": (
        "Act as a Technical Writer. Review the documentation changes for "
        "completeness, accuracy, clarity, and consistency. Check that code "
        "examples are correct, links are valid, and the structure is logical. "
        "Note any missing sections or outdated information."
    ),
    "frontend": (
        "Act as a Frontend Engineer. Review the UI/UX changes for accessibility "
        "(a11y), responsive design, performance (bundle size, render blocking), "
        "XSS risks in DOM manipulation, proper event handling, and browser "
        "compatibility. Reference exact files and lines."
    ),
    "backend": (
        "Act as a Senior Backend Engineer. Review the changes for correctness, "
        "error handling, input validation, resource management (file handles, "
        "connections), concurrency safety, and API contract compliance. "
        "Reference exact files and lines."
    ),
    "config": (
        "Act as a Configuration & Infrastructure Reviewer. Analyze the config "
        "changes for correctness, security implications (exposed ports, "
        "permissive CORS, debug mode in production), consistency across "
        "environments, and potential breaking changes for existing deployments."
    ),
    "general": (
        "Act as a Senior Software Engineer reviewing a colleague's changes. "
        "Provide a thorough assessment covering: what was changed and why, "
        "whether the changes introduce any risks or bugs, code quality, "
        "and the overall scope and impact on the project."
    ),
}


LABEL_TO_ROLE = {
    "sec": "security",
    "security": "security",
    "audit": "security",
    "review": "review",
    "refactor": "review",
    "code-review": "review",
    "qa": "qa",
    "test": "qa",
    "testing": "qa",
    "perf": "perf",
    "performance": "perf",
    "optimize": "perf",
    "pm": "pm",
    "release": "pm",
    "product": "pm",
    "deps": "deps",
    "dependencies": "deps",
    "dep": "deps",
    "arch": "arch",
    "architecture": "arch",
    "ci": "ci",
    "devops": "ci",
    "pipeline": "ci",
    "workflow": "ci",
    "docs": "docs",
    "doc": "docs",
    "documentation": "docs",
    "frontend": "frontend",
    "ui": "frontend",
    "ux": "frontend",
    "css": "frontend",
    "backend": "backend",
    "api": "backend",
    "server": "backend",
    "config": "config",
    "infra": "config",
    "infrastructure": "config",
}


OUTPUT_CONTRACT = """
Return a JSON object with exactly these fields:
issue_title: English title prefixed with the severity in square brackets.
severity: critical, high, elevated, medium, moderate, low, or informational.
issue_body: English Markdown with Problem, Code Reference, Suggested Fix, and Permalink sections.
Use PUT_PERMALINK_HERE as the permalink placeholder.
labels: array of standard repository label names.
affected_file: a file present in the supplied diff, or an empty string.
affected_line: positive integer line number, or 1 if unknown.
summary: a concise, two- or three-sentence English summary for a PR comment.
Do not include markdown fences or text outside the JSON object.
"""
