# Integrated learning compatibility (2026-09-28)

No SQL migration or table reset is required by this release. The existing
`wordtop_save_study` RPC stores schemaVersion 1 JSONB snapshots and accepts
additional properties. Existing profile bindings, verified_answers and
 earned_badges are unchanged. Never rerun the foundation or profile-code SQL.

## Preserved contracts

- Word identity remains id + original word + original meaning. Display corrections
  and examples do not replace IDs or the server scoring catalog.
- Status remains new / scrap / mastered. UI names are 첫 확인 / 다시 익히기 / 기억 다지기.
- Optional word metadata: saved, judgment, judgmentAt, statusSource, lastAnsweredAt,
  lastVerifiedAt, nextReviewAt, reviewLevel, feedMigrated.
- Optional snapshot metadata: quizSession (frozen IDs, index, correct, practice),
  feedProgress (daily steps, cursor, legacy entries).
- Existing accuracy, activeMs, responseCounts and settings are preserved.
- Self judgments never call the scoring RPC. Single-word practice does not award
  badges. Normal quizzes retain the existing server-validated awards mechanism.
- Old local feed judgments migrate only after sync succeeds. A classified server
  word wins over an old local feed judgment. Old storage is retained.
- Conflicting devices still require choosing a backed-up version. No automatic
  merge of family learning records is introduced.

## Review policy

Incorrect answers are due after 10 minutes; correct answers after 1 day initially.
Further successful recalls separated by at least 24 hours expand to 3/7/14/30 days.
These intervals are product defaults, not a claim of individually optimal spacing.

## Verification

Read-only aggregate supplied by the operator: 4 saved profiles, all schemaVersion
1, maximum deck length 2141. Individual production records were not downloaded.
Node regression tests cover existing sync/conflict/backup behavior and optional
metadata roundtrips. Isolated browser tests use mocked sync and awards (no family
records are changed), including classification, recall settings, answer feedback,
queue completion and reload. Mobile/tablet/desktop layout smoke tests also pass.
