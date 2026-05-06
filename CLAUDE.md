# VostokCars — Claude Instructions

For architecture, data models, and gotchas: read [AGENTS.md](AGENTS.md).

## Rules

- Inspect nearby files before editing. Match existing patterns.
- **Changes touching >1 file or >30 lines: write a short plan first.**
- No unrelated refactors. No speculative abstractions. Work only on the requested task.
- **Before changing any function signature: grep all callers, update every call site.**
- After every edit: verify imports resolve. Never leave broken imports.
- Read a file before editing it. Never guess file contents.

## Backward Compatibility

- Changing a schema field: check every endpoint that returns it and every client page that reads it.
- Renaming a model column: write a migration — never edit the model without it.
- Adding a required field to an existing endpoint: make it optional with a default, or version the endpoint.

## Security

- **Never expose PII (phones, emails, tokens, passwords) in API responses or logs.**
- No raw user input in queries — ORM or parameterized statements only.
- **Secrets only from environment variables. Never in source code or logs.**
- Auth check on every protected endpoint — never rely on frontend-only guards.

## Done When

**Bug fix**: root cause identified, fix minimal, imports verified.  
**New feature**: plan written if >1 file or >30 lines, all call sites updated, no broken imports.  
**Before reporting complete**: `tsc --noEmit` (TS) or `python -m py_compile` (Python) passes.

## Off-Limits

- Не менять существующую структуру проекта без явной необходимости.
- Не переименовывать файлы, сервисы, маршруты без запроса.
- Не добавлять новые зависимости без запроса.
