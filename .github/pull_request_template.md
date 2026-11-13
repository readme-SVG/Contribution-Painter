## Summary

Describe the behavior change and the reason for it.

## Related issues

Closes #

## Verification

- [ ] `npm run check`
- [ ] `npm run test:e2e` for UI changes
- [ ] `ruff check automation tests/python` and `pytest -q` for automation changes
- [ ] GitHub writes were tested only against a disposable repository, or mocked

## Checklist

- [ ] Existing commits and unrelated behavior are preserved.
- [ ] Credentials, personal settings, and generated test artifacts are not committed.
- [ ] User-facing text is translated and code comments are in English.
- [ ] README and configuration examples match the implementation.
