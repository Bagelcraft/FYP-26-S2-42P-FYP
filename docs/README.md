# Documentation Index

Smart Task Allocation (FYP-26-S2-42P) — reference documents prepared for code review.

## Start here

| Document | What it is | Size |
|---|---|---|
| [MANAGER_ROLE.md](MANAGER_ROLE.md) | **Explanation.** Why the Manager role is built the way it is: architecture, security model, the allocation algorithm, known gaps, and a demo script. The only document written to be read start to finish. | ~36 KB |
| [FILE_INDEX.md](FILE_INDEX.md) | **Map.** Where every documented file lives in the repository, by directory and alphabetically, with a link from each file to the appendix that explains it. Start here when you know the file but not the folder. | ~24 KB |
| [FILE_INDEX.txt](FILE_INDEX.txt) | **Plain-text guide.** The same map without markdown, plus a plain-English description of *what every file and script does* — all five roles, frontend, backend, database and scripts. Copy-and-pasteable into a report or slide. | ~40 KB |
| [ALGORITHMS.md](ALGORITHMS.md) | **The two automated engines.** Line-by-line walkthrough of smart task allocation and automated testimonial selection — the rules, the ranking, worked examples, and the edge cases each one gets right or wrong. | ~30 KB |

## Code appendices

Each reproduces the full source of its area, generated from the working tree so it matches the code
exactly. Use them to read an implementation end to end without switching between the repo and the
explanation.

| Document | Covers | Files | Lines |
|---|---|---|---|
| [MANAGER_ROLE_CODE.md](MANAGER_ROLE_CODE.md) | The `PROJECT_MANAGER` role — routes, middleware, the allocation engine, tasks, projects, and all 10 Manager pages | 36 | 7,422 |
| [DATABASE_LAYER.md](DATABASE_LAYER.md) | Prisma schema, the full migration history, seeds and data scripts | 18 | 2,409 |
| [FRONTEND.md](FRONTEND.md) | The entire React client — every page of all five portals, shared components, routing, build config | 75 | 11,477 |
| [HOSTING_DEPLOYMENT.md](HOSTING_DEPLOYMENT.md) | Server entry, CORS, database connection, environment templates, CI/CD, email delivery | 14 | 513 |
| [TESTING.md](TESTING.md) | Every automated test and test harness, in the order you would run them | 6 | 1,185 |

Counts are as of the last run of the generator below — re-run it and they update with the code.

A few files appear in more than one appendix — the Manager pages are in both the Manager and Frontend
documents, and `config/prisma.js` is in both Database and Hosting — so each document stands alone
rather than sending the reader elsewhere mid-topic.

## Earlier drafts

| Document | Status |
|---|---|
| [SRS_Draft.md](SRS_Draft.md) | Early requirements draft (May 2026) |
| [API_Notes.md](API_Notes.md) | Early API notes (May 2026) — superseded by §5 of [MANAGER_ROLE.md](MANAGER_ROLE.md) for the `/pm` surface |
| `test-evidence/` | Empty — no evidence captured yet |

## Regenerating the appendices

The five code appendices and [FILE_INDEX.md](FILE_INDEX.md) are **generated, not hand-written**:

```bash
node docs/build-appendices.js           # rebuild all six documents
node docs/build-appendices.js --check   # verify they match the code; exits 1 if not
```

Each document is part curated prose, part source listing. The prose lives in
`appendices.manifest.json`; the source, line counts, inventory tables and totals are read from the
working tree on every run. **Do not edit the generated `.md` files directly** — the next run
overwrites them, and in the meantime the document and the code drift apart.

- **To document a new file:** add `{ "path": "...", "blurb": "..." }` to the appropriate section in
  `appendices.manifest.json`, then re-run. The blurb is the one paragraph explaining why the file
  exists; everything else is derived.
- **To stop documenting a file:** remove its entry. A file that disappears from the working tree is
  skipped with a warning rather than breaking the build.

Run `--check` before submitting. It is the only thing standing between the appendices and quiet drift.

## Known gaps

- **`FILE_INDEX.txt` is not generated** and is now out of date. It is a hand-written plain-English
  guide rather than a source listing, so it was left outside the generator. Regenerate it by hand, or
  drop it in favour of [FILE_INDEX.md](FILE_INDEX.md), which covers the same ground and is current.
- **The Worker backend is not reproduced in any appendix** — see the last section of
  [FILE_INDEX.md](FILE_INDEX.md). That includes `attendance.service.js`, the two worker route files
  and `worker.service.js`, which together implement the timesheet. Ask if you want a sixth appendix
  generated for the Worker role; the manifest makes it a short job.
