# ExportDou CLI command reference

## Authentication

~~~bash
npx exportdou login [--no-open] [--json]
npx exportdou logout [--json]
npx exportdou whoami [--json]
~~~

Use login --api-key only when the user deliberately supplies a Key through a secure mechanism. Never put a literal Key in an agent response or shell history.

## Inspect

~~~bash
npx exportdou inspect "<Douyin link or share text>" --json
~~~

Returns canonicalUrl, video metadata, reportedCommentCount, and a small comment sample. Inspect may call the upstream data provider on the first request; repeated requests can use ExportDou cache.

## Create

~~~bash
npx exportdou export "<input>" --limit 1000 --json
npx exportdou export "<input>" --all --json
npx exportdou export "<input>" --limit 10000 --replies --format xlsx --json
~~~

Options:

- --limit N: total root plus reply row ceiling, 1 to 200,000.
- --all: resolve the reported public count and use it only when within the row ceiling and available balance.
- --replies: include second-level replies in the same total row limit.
- --all and --replies cannot be combined because the reported count covers root comments, not every reply. Use an explicit --limit when replies are requested.
- --format csv|xlsx: default CSV.
- --wait: attach a human terminal until terminal status or timeout. Agents should omit it.
- --timeout SECONDS: --wait timeout, default 600.
- --poll-interval SECONDS: minimum --wait interval, default 3.
- --output PATH: with --wait, download a completed result.
- --json: stable JSON stdout; progress remains on stderr.

Immediate creation output contains taskId, status, reservedCredits, dispatchDelayed, and next. Save taskId.

## Status and cancellation

~~~bash
npx exportdou status "<task-id>" --json
npx exportdou cancel "<task-id>" --json
npx exportdou resume "<task-id>" --json
~~~

Status includes public progress only: target and delivered rows, root and reply totals, percentage, result metadata, public error, billing totals, and retryAfterSeconds. It never exposes provider cursors, internal errors, or Queue position.

Resume is valid only for an eligible partial task. It preserves the existing task and file, reuses saved checkpoints, and reserves only the remaining row allowance. After resuming, continue with status using the same task ID.

## Preview and download

~~~bash
npx exportdou preview "<task-id>" --limit 20 --json
npx exportdou download "<task-id>" --output comments.csv --json
~~~

Preview supports 1 to 50 rows and returns normalized root/reply relationships. Download follows a short-lived private redirect and verifies result SHA-256 and size before atomically publishing the local file.

Use --force only after the user explicitly agrees to overwrite the exact output path.

## Account

~~~bash
npx exportdou credits --json
npx exportdou history --limit 20 --json
~~~

history returns newest exports first. Use the returned task ID for all subsequent actions.
