# Contributing to Contribution Painter

First off: huge thanks for wanting to contribute. You’re helping improve a niche but super practical tool for contribution-graph automation and developer tooling workflows.

## Introduction

This project is intentionally lean: vanilla frontend, API-first GitHub integration, and automation scripts around repository maintenance. We value focused PRs, reproducible bug reports, and clean implementation details over noisy changes.

If you’re about to open your first PR: awesome. If you’re a returning contributor: welcome back, let’s ship.

## I Have a Question

Please do **not** use GitHub Issues for usage/support questions.

Issues are reserved for:
- confirmed bugs
- feature proposals
- scoped technical tasks

For questions, use one of these channels:
- GitHub Discussions (preferred, if enabled)
- Project-linked community channels from the README support section
- Stack Overflow (`github-api`, `javascript`, `python`) for generic implementation questions

If your “question” reveals a product bug, then open an Issue with a reproducible case.

## Reporting Bugs

Before opening a bug report:

1. Search existing open/closed Issues for duplicates.
2. Verify the bug on latest `main`.
3. Reproduce with minimal setup (ideally a clean repo and a fresh token).

When opening a bug Issue, include:

- **Environment**
  - OS + version (e.g. Ubuntu 24.04, macOS 14, Windows 11)
  - Browser + version (for UI bugs)
  - Python version (for backend/workflow bugs)
  - App version/commit SHA
- **Steps to Reproduce**
  - exact sequence from clean state
  - input values used (mask sensitive tokens)
- **Expected Behavior**
  - what should happen
- **Actual Behavior**
  - what actually happens
  - full error message/log output
- **Artifacts**
  - screenshots, console logs, network traces, workflow logs

High-signal bug reports get fixed faster. Low-context reports usually bounce for clarification.

## Suggesting Enhancements

Feature requests are welcome when they solve real user pain.

A good enhancement proposal includes:

- problem statement: what’s broken in current UX/dev flow
- proposed change: concise and technically feasible
- use cases: who benefits and how often
- constraints/trade-offs: API limits, security implications, complexity cost

Strong proposals are framed as impact + implementation strategy, not just “add X”.

## Local Development / Setup

```bash
# 1) Fork repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/Contribution-Painter.git
cd Contribution-Painter

# 2) Add upstream remote
git remote add upstream https://github.com/readme-SVG/Contribution-Painter.git

# 3) Create Python env for backend tooling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4) Run frontend locally
python3 -m http.server 8080
# open http://localhost:8080
```

If environment variables are needed for workflow script tests, export them before running `backend/process_event.py`.

## Pull Request Process

### Branch Naming Strategy

Use predictable branch names:

- `feature/<short-description>`
- `bugfix/<issue-id-or-short-description>`
- `docs/<scope>`
- `chore/<scope>`

Examples:
- `feature/multi-repo-presets`
- `bugfix/issue-42-branch-ref-handling`
- `docs/readme-overhaul`

### Commit Message Standard

Use **Conventional Commits**:

- `feat: add locale auto-detection fallback`
- `fix: handle missing branch ref during push`
- `docs: rewrite setup and deployment sections`
- `chore: align workflow dependency versions`

### Sync With Upstream Before PR

```bash
git fetch upstream
git checkout main
git rebase upstream/main
```

Then rebase your feature branch onto updated `main`.

### PR Description Requirements

Every PR should include:

- what changed
- why it changed
- related issue (`Resolves #123` when applicable)
- testing evidence (commands + output summary)
- screenshots/GIFs for UI changes

Use `.github/pull_request_template.md` as baseline and fill it properly.

## Styleguides

### General Standards

- Keep changes scoped; avoid drive-by refactors.
- Preserve project’s existing architecture and naming conventions.
- Prefer explicit, readable logic over clever one-liners.

### JavaScript / Frontend

- Stick to existing vanilla JS style in `frontend/js/app.js`.
- Maintain i18n key consistency across locale files.
- Avoid introducing framework dependencies unless discussed first.

### Python / Backend

- Follow PEP 8 conventions.
- Keep functions small and predictable.
- Handle API failures explicitly and provide actionable logs.

### Tooling

There is currently no enforced formatter/linter pipeline in-repo. If you use local tools (e.g., `black`, `ruff`, `eslint`, `prettier`), do not introduce mass-formatting unrelated files in the same PR.

## Testing

All new behavior should be validated before opening a PR.

Recommended checks:

```bash
# Backend syntax check
python3 -m py_compile backend/process_event.py

# Dependency sanity
python3 -m pip check

# Frontend smoke test
python3 -m http.server 8080
# then manually verify painting, stats, and push flow in browser
```

If you add logic with deterministic behavior, include tests or at least scriptable reproduction steps.

## Code Review Process

- Maintainers review incoming PRs for correctness, scope, security, and maintainability.
- At least one maintainer approval is expected before merge.
- Address review comments with follow-up commits or clear technical reasoning.
- Keep discussion technical and actionable; if you disagree, propose alternatives with trade-offs.

Fast merges happen when PRs are small, tested, and clearly documented.
