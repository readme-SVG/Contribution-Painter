![Contribution Painter](https://raw.githubusercontent.com/readme-SVG/Contribution-Painter/main/images/contribution_painter_loop.svg)

> Draw GitHub contribution patterns locally, preview them, and publish backdated commits with explicit review and recoverable progress.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](package.json)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](requirements.txt)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](vercel.json)

https://github.com/user-attachments/assets/67bab512-b74e-492c-903a-81ea353b1811

> [!IMPORTANT]
> Publishing creates real commits in the target repository. Use a disposable repository first, and only publish where backdated contribution history is acceptable. GitHub counts contributions only when its [contribution criteria](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile) are met; commits on a non-default branch may not appear on your profile.

## Features

- Framework-free yearly heatmap editor with mouse, touch, and keyboard painting.
- Intensities `0–4`, a random brush, partial random fill, invert, clear, undo, and redo.
- Independent drafts per year, persisted locally without credentials or connection settings.
- Commit multipliers `×1/×3/×5/×10` and optional `+0–2` daily spread with live estimates.
- JSON import/export and accessible SVG preview/download.
- Review dialog before any GitHub write, cancellable publishing, and checkpoint-based resume.
- Safe branch updates: existing commits are preserved, concurrent branch changes abort, and force-push is never used.
- Serial GitHub requests with mutation spacing, timeouts, read-only retries, and rate-limit handling.
- Twelve locales with validated key and interpolation parity.
- Optional trusted-change analysis workflow backed by an operator-configured model endpoint.

## Quick start

The editor is a static site. Node.js is used only for local tooling and the development server.

```bash
npm ci
npm run dev
```

Open <http://localhost:8080>. Python is not required to use the editor.

## Publishing

1. Create a fine-grained GitHub token with **Contents: read and write** for the target repository only.
2. Enter the repository as `owner/name`, a verified account email, an optional author name, and the target branch.
3. Paint a pattern, choose the multiplier/spread, and select **Apply to GitHub**.
4. Review the target, branch, dates, and commit count before confirming.
5. Keep the tab open while publishing. Use **Stop publishing** to cancel; if a run is interrupted, **Resume publishing** continues from the last confirmed checkpoint.

The publisher creates one blob and one tree, generates the commit chain, and updates the branch only at the end. A missing branch is created from the repository default branch. Each run writes a small `contribution-painter.txt` artifact so the generated commits have a stable tree. Tokens are kept in memory for the active tab and are cleared from the input after a successful run; they are never written to local storage.

## Local data and exports

- Draft key: `contribution-painter:draft:v1`. Only drawings and the selected year are stored.
- JSON exports use `{ format, version, year, cells }` and contain no credentials.
- Imports are size-limited and validated against editable dates and intensity levels.
- SVG export is generated locally and does not create commits.

If local storage is unavailable, editing still works and the UI reports that drafts cannot be saved.

## Development

```bash
npm run check       # ESLint, Prettier, and unit tests
npm run build       # static output in dist/

npx playwright install --with-deps chromium
npm run test:e2e
```

Browser tests use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when a custom Chromium binary is required.

Python automation checks:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
ruff check automation tests/python
ruff format --check automation tests/python
bandit -q -r automation -c pyproject.toml
pytest -q
```

### Project structure

```text
index.html              Application shell
css/styles.css          Responsive UI and graph styles
js/app.js               UI orchestration and publishing lifecycle
js/editor.js            Pointer/keyboard grid editor
js/core/                Calendar, pattern, validation, GitHub client, publisher, portability, SVG
js/i18n/                Locale dictionaries and loader
automation/             Optional GitHub change-analysis workflow
scripts/                Development server and static build
tests/unit/             Node.js unit tests
tests/browser/          Playwright browser tests
tests/python/           Pytest automation tests
.github/workflows/      Checks, CodeQL, Scorecard, labels, Dependabot, optional analysis
```

## Optional change analysis

GitHub Models has been retired, so the workflow no longer assumes a hosted inference endpoint. To enable analysis, configure:

| Setting           | Kind                | Purpose                                           |
| ----------------- | ------------------- | ------------------------------------------------- |
| `MODEL_ENDPOINT`  | Repository variable | HTTPS OpenAI-compatible chat-completions endpoint |
| `MODEL_NAME`      | Repository variable | Model identifier expected by that endpoint        |
| `GH_MODELS_TOKEN` | Secret              | Bearer token for the configured endpoint          |
| `ALLOWED_USER`    | Secret              | Comma-separated list of trusted authors           |

The workflow checks out trusted base-branch automation code, rejects fork PRs and unlisted authors before fetching diffs, redacts known secret formats, skips sensitive/generated files, and deduplicates reviews by revision. Missing configuration skips the optional job without failing the repository.

## Deployment

`vercel.json` builds the static site into `dist/` and applies restrictive security headers. The CSP allows inline styles because the grid layout and progress bar are sized dynamically; scripts, frames, objects, and forms remain locked down. Any static host can serve the same `dist/` output.

## License

GPL-3.0-only. See [LICENSE](LICENSE).

## Support

[![Patreon](https://img.shields.io/badge/Patreon-OstinFCT-f96854?style=flat-square&logo=patreon)](https://www.patreon.com/OstinFCT)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-fctostin-29abe0?style=flat-square&logo=ko-fi)](https://ko-fi.com/fctostin)
[![Boosty](https://img.shields.io/badge/Boosty-Support-f15f2c?style=flat-square)](https://boosty.to/ostinfct)
[![YouTube](https://img.shields.io/badge/YouTube-FCT--Ostin-red?style=flat-square&logo=youtube)](https://www.youtube.com/@FCT-Ostin)
[![Telegram](https://img.shields.io/badge/Telegram-FCTostin-2ca5e0?style=flat-square&logo=telegram)](https://t.me/FCTostin)

If this tool saved you time, a star on GitHub means a lot.
