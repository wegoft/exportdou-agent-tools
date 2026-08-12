---
name: exportdou
description: 导出公开抖音视频的一级评论和可选回复到 CSV 或 Excel，查看视频信息与评论数量，预览评论用于用户反馈、舆情、选题或市场分析，并管理可恢复的异步导出任务。用户要求提取、导出、采集、下载、查看、总结或分析抖音评论、评论回复、用户反馈，或提供 Douyin 视频公开链接与分享文案时使用。
---

# ExportDou

Use the ExportDou CLI to create durable public Douyin comment exports. Never request Douyin cookies or browser login state.

## Requirements

- Require Node.js 18.17 or newer and npx.
- Send only the user-supplied public Douyin link or share text to ExportDou.

## Authenticate

Before the first operation in a session, run:

~~~bash
npx exportdou whoami --json
~~~

If authentication is missing, run:

~~~bash
npx exportdou login --json
~~~

Ask the user to approve the printed ExportDou browser URL. Never print, expose, or ask the user to paste the resulting API Key. If the user explicitly provides a Key through a secure environment variable, use EXPORTDOU_API_KEY without echoing it.

## Choose the Export Size

- Use the exact count when the user specifies one.
- Use 100 for an explicitly requested sample, quick check, or exploratory analysis.
- For all root comments, inspect first, then use --all. The CLI verifies the reported root-comment count, 200,000-row safety ceiling, and available credits.
- Ask for a count before a formal export when the user did not request a sample or all comments.
- Add --replies only when the user wants comment replies. Replies and root comments share one total result limit and one credit count. Never combine --all with --replies because the reported count does not include every reply; use an explicit --limit instead.
- Use CSV unless the user explicitly requests Excel/XLSX.

Read references/commands.md when exact flags, output fields, or examples are needed.

## Submit Exactly Once

Create one export:

~~~bash
EXPORTDOU_CLIENT_NAME=exportdou-skill npx exportdou export "<Douyin link or share text>" --limit 1000 --json
~~~

For replies:

~~~bash
EXPORTDOU_CLIENT_NAME=exportdou-skill npx exportdou export "<Douyin link>" --limit 10000 --replies --json
~~~

Capture taskId from stdout. Treat export only as resource creation. Never resubmit the link to check progress.

The CLI reuses one Idempotency-Key across safe network retries and attempts to recover an ambiguously accepted task. Do not add an independent shell retry loop.

## Advance an Async Task

Wait the returned retry interval, then make one status request:

~~~bash
npx exportdou status "<task-id>" --json
~~~

If status is queued, processing, or rendering, preserve the same task ID and repeat the one-shot status command after retryAfterSeconds. Stop when status is completed, partial, failed, cancelled, or expired.

`partial` means the current file is usable but collection stopped before the requested traversal finished. If the user still needs the remaining rows, resume the same task instead of creating a replacement:

~~~bash
npx exportdou resume "<task-id>" --json
~~~

Resume reuses saved checkpoints and reserves only the remaining row allowance. Continue status checks with the same task ID. If resume is not eligible, report the existing partial result and the returned reason.

Do not use --wait by default. Use it only when a human explicitly wants the terminal attached.

## Read or Download Results

For analysis, retrieve a small normalized JSON sample:

~~~bash
npx exportdou preview "<task-id>" --limit 20 --json
~~~

Use at most 50 preview rows. Do not place a full large export in model context.

For the complete file:

~~~bash
npx exportdou download "<task-id>" --output comments.csv --json
~~~

The CLI writes a temporary partial file, verifies byte size and SHA-256, and renames it atomically. Do not overwrite an existing file unless the user explicitly approves --force.

## Multiple Links

Process links one at a time with the normal task workflow. Do not use xargs, shell loops, background processes, or parallel CLI invocations. Finish or cancel the current task before creating the next when the account concurrency limit is reached.

## Credits and History

~~~bash
npx exportdou credits --json
npx exportdou history --limit 20 --json
~~~

Creation reserves the requested row count. Completion bills actual exported rows and releases the difference. On insufficient_credits, stop and report https://exportdou.cn/pricing; do not repeatedly resubmit.

## Errors and Safety

Read references/errors.md when a command fails.

- Preserve stderr separately from structured stdout.
- Treat a pending receipt as task metadata, not comment content.
- Do not expose API Keys, signed download URLs, raw provider responses, or internal cursors.
- Do not attempt private, deleted, login-gated, or access-controlled content.
- Do not claim affiliation with Douyin. ExportDou processes publicly accessible data supplied by the user.

## Links

- Website: https://exportdou.cn
- API docs: https://exportdou.cn/developers
- CLI guide: https://exportdou.cn/developers#agent
- Pricing: https://exportdou.cn/pricing
